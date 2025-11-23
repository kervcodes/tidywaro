import { GoogleGenerativeAI } from "@google/generative-ai";
import { SupabaseClient } from "@supabase/supabase-js";
import logger from "../utils/logger";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface WardrobeItem {
    id: string;
    category: string;
    image_url: string;
    color?: string;
}

export class AIService {
    static async generateWeeklyPlan(
        supabase: SupabaseClient,
        userId: string,
        startDate: string
    ) {
        try {
            // 1. Fetch User's Wardrobe
            const { data: items, error } = await supabase
                .from("wardrobe_items")
                .select("id, category, image_url, color")
                .eq("user_id", userId);

            if (error) throw error;
            if (!items || items.length === 0) {
                throw new Error("No wardrobe items found. Please upload some clothes first.");
            }

            // 2. Construct Prompt
            const prompt = `
        You are a personal stylist. Create a 7-day outfit plan starting from ${startDate}.
        
        Here is my wardrobe:
        ${JSON.stringify(items)}

        For each day, select items to form a complete outfit.
        Consider the weather: "Sunny, 25°C" (Assume this for now).
        
        Return ONLY a valid JSON array with 7 objects. Each object must have:
        - date: string (YYYY-MM-DD)
        - day_of_week: string (e.g., "Monday")
        - occasion: string (e.g., "Work", "Casual")
        - weather_summary: string
        - items: array of item_ids from the provided wardrobe.

        Example JSON format:
        [
          {
            "date": "2023-10-27",
            "day_of_week": "Friday",
            "occasion": "Work",
            "weather_summary": "Sunny, 25°C",
            "items": ["item_id_1", "item_id_2"]
          }
        ]
      `;

            // 3. Call Gemini
            const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // 4. Parse JSON
            // Clean up potential markdown code blocks
            const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const plan = JSON.parse(jsonString);

            return plan;
        } catch (error: any) {
            logger.error("AI Generation failed", { error: error.message });
            throw new Error("Failed to generate plan: " + error.message);
        }
    }
}
