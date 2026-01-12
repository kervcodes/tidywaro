import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authMiddleware, AuthRequest } from "./middleware/auth.middleware";
import requestLogger from "./middleware/requestLogger.middleware";
import { errorHandler, notFoundHandler, setupProcessErrorHandlers } from "./middleware/errorHandler.middleware";
import wardrobeRoutes from "./routes/wardrobe.routes";
import plannerRoutes from "./routes/planner.routes";
import tryonRoutes from "./routes/tryon.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import logger from "./utils/logger";

dotenv.config();

// Setup process-level error handlers
setupProcessErrorHandlers();

const app = express();
const port = process.env.PORT || 3000;

logger.info("Starting BFF...", {
    geminiKeyPresent: !!process.env.GEMINI_API_KEY,
    geminiKeyLength: process.env.GEMINI_API_KEY?.length,
    nodeEnv: process.env.NODE_ENV || 'development',
    port,
});

// Middleware
app.use(cors());

// Stripe webhook needs raw body - must be before json parser for this route
// The subscription routes handle this internally with express.raw()

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Routes
app.use("/wardrobe", wardrobeRoutes);
app.use("/weekly-plans", plannerRoutes);
app.use("/tryon", tryonRoutes);
app.use("/subscription", subscriptionRoutes);

// Health Check
app.get("/health", (req, res) => {
    res.json({ 
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Protected Route
app.get("/me", authMiddleware, ((req: Request, res: Response) => {
    const user = (req as AuthRequest).user;
    res.json(user);
}) as any);

// Error Handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
    logger.info(`BFF running on http://localhost:${port}`);
});
