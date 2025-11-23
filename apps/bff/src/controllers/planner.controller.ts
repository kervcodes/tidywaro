import { Request, Response } from "express";
import { AIService } from "../services/ai.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { supabase } from "../config/supabase";
import logger from "../utils/logger";

export class PlannerController {
    static async generatePlan(req: Request, res: Response) {
        try {
            const userId = (req as AuthRequest).user.id;
            const { startDate } = req.body;

            if (!startDate) {
                return res.status(400).json({ error: "startDate is required (YYYY-MM-DD)" });
            }

            logger.info("Generating weekly plan", { userId, startDate });

            // 1. Generate Plan via AI
            // We pass the global supabase client to fetch wardrobe items (RLS will be handled by query if needed, 
            // but here we trust the backend to fetch only user's items as we filter by user_id)
            // Ideally we should use the scoped client from AuthRequest if we want to enforce RLS at DB level strictly
            const client = (req as AuthRequest).supabase || supabase;

            const generatedPlan = await AIService.generateWeeklyPlan(client, userId, startDate);

            // 2. Save to Database
            // Start a transaction-like sequence (Supabase doesn't support multi-table transactions via JS client easily without RPC, 
            // so we'll do it sequentially. If it fails, we might have a partial state, but for MVP this is acceptable)

            // 2a. Create Weekly Plan Record
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6); // 7 days total

            const { data: planData, error: planError } = await client
                .from("weekly_plans")
                .insert({
                    user_id: userId,
                    start_date: startDate,
                    end_date: endDate.toISOString().split('T')[0],
                })
                .select()
                .single();

            if (planError) throw planError;

            // 2b. Create Daily Outfits
            const dailyOutfits = generatedPlan.map((day: any) => ({
                plan_id: planData.id,
                date: day.date,
                day_of_week: day.day_of_week,
                occasion: day.occasion,
                weather_summary: day.weather_summary,
                items: day.items, // JSONB array of item IDs
            }));

            const { error: outfitsError } = await client
                .from("daily_outfits")
                .insert(dailyOutfits);

            if (outfitsError) {
                // Rollback plan creation if outfits fail (manual cleanup)
                await client.from("weekly_plans").delete().eq("id", planData.id);
                throw outfitsError;
            }

            logger.info("Weekly plan created successfully", { planId: planData.id });
            res.status(201).json({ plan: planData, outfits: dailyOutfits });

        } catch (error: any) {
            logger.error("Generate plan error", { error: error.message });
            res.status(500).json({ error: error.message });
        }
    }

    static async getCurrentPlan(req: Request, res: Response) {
        try {
            const userId = (req as AuthRequest).user.id;
            const client = (req as AuthRequest).supabase || supabase;
            const today = new Date().toISOString().split('T')[0];

            // Find a plan that includes today
            const { data: plan, error } = await client
                .from("weekly_plans")
                .select("*, daily_outfits(*)")
                .eq("user_id", userId)
                .lte("start_date", today)
                .gte("end_date", today)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                throw error;
            }

            if (!plan) {
                return res.status(404).json({ message: "No active plan found for today" });
            }

            res.json(plan);
        } catch (error: any) {
            logger.error("Get current plan error", { error: error.message });
            res.status(500).json({ error: error.message });
        }
    }
}
