import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { Request, Response, NextFunction } from "express";
import { supabase as globalSupabase } from "../config/supabase";
import dotenv from "dotenv";
import logger, { logAuth } from "../utils/logger";

dotenv.config();

export interface AuthRequest extends Request {
  user: User;
  supabase: SupabaseClient;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  const path = req.path;

  if (!authHeader) {
    logAuth(`Missing auth header for ${path}`, undefined, false);
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  
  if (!token) {
    logAuth(`Empty token for ${path}`, undefined, false);
    return res.status(401).json({ error: "Invalid token format" });
  }

  // Verify token using global client
  const {
    data: { user },
    error,
  } = await globalSupabase.auth.getUser(token);

  if (error || !user) {
    logAuth(`Invalid token for ${path}`, undefined, false);
    logger.debug("Token validation error", { error: error?.message });
    return res.status(401).json({ error: "Invalid token" });
  }

  logAuth(`Authenticated for ${path}`, user.id, true);

  // Create a scoped client for this request
  // This ensures RLS policies work correctly using the user's auth context
  const scopedClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );

  (req as AuthRequest).user = user;
  (req as AuthRequest).supabase = scopedClient;
  next();
};
