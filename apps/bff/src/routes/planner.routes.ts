import { Router } from "express";
import { PlannerController } from "../controllers/planner.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// POST /weekly-plans/generate
router.post("/generate", authMiddleware, PlannerController.generatePlan);

// GET /weekly-plans/current
router.get("/current", authMiddleware, PlannerController.getCurrentPlan);

export default router;
