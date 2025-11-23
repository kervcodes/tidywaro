import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { authMiddleware, AuthRequest } from "./middleware/auth.middleware";
import wardrobeRoutes from "./routes/wardrobe.routes";
import plannerRoutes from "./routes/planner.routes";
import logger from "./utils/logger";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

logger.info("Starting BFF...", {
    geminiKeyPresent: !!process.env.GEMINI_API_KEY,
    geminiKeyLength: process.env.GEMINI_API_KEY?.length
});

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Routes
app.use("/wardrobe", wardrobeRoutes);
app.use("/weekly-plans", plannerRoutes);

// Health Check
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// Protected Route
app.get("/me", authMiddleware, ((req: Request, res: Response) => {
    const user = (req as AuthRequest).user;
    res.json(user);
}) as any);

app.listen(port, () => {
    logger.info(`BFF running on http://localhost:${port}`);
});
