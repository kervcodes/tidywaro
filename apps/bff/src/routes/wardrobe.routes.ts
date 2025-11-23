import { Router, RequestHandler } from "express";
import { WardrobeController } from "../controllers/wardrobe.controller";
import { authMiddleware } from "../middleware/auth.middleware";

import multer from "multer";

const router = Router();

// Configure Multer (Memory Storage)
// We store the file in memory so we can pass the buffer to Supabase
const upload = multer({ storage: multer.memoryStorage() });

// Define the route
// GET /wardrobe/items
// 1. Run authMiddleware (check token)
// 2. Run WardrobeController.listItems (fetch data)
router.get("/items", authMiddleware, WardrobeController.listItems);

// POST /wardrobe/items
// 1. Run authMiddleware
// 2. Run upload.single('image') -> parses multipart/form-data
// 3. Run WardrobeController.uploadItem
router.post(
  "/items",
  authMiddleware,
  upload.single("image") as RequestHandler,
  WardrobeController.uploadItem,
);

export default router;
