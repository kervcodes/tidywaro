import { Router, RequestHandler } from "express";
import { WardrobeController } from "../controllers/wardrobe.controller";
import { authMiddleware } from "../middleware/auth.middleware";

import multer from "multer";

const router = Router();

// Configure Multer (Memory Storage)
// We store the file in memory so we can pass the buffer to Supabase
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10, // Maximum 10 files at once
  },
});

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
  upload.single("image") as unknown as RequestHandler,
  WardrobeController.uploadItem,
);

// POST /wardrobe/items/bulk
// Bulk upload multiple items at once
// 1. Run authMiddleware
// 2. Run upload.array('images', 10) -> parses up to 10 images
// 3. Run WardrobeController.bulkUploadItems
router.post(
  "/items/bulk",
  authMiddleware,
  upload.array("images", 10) as unknown as RequestHandler,
  WardrobeController.bulkUploadItems,
);

// GET /wardrobe/items/:id - Get single item
router.get("/items/:id", authMiddleware, WardrobeController.getItem);

// PUT /wardrobe/items/:id - Update item
router.put("/items/:id", authMiddleware, WardrobeController.updateItem);

// DELETE /wardrobe/items/:id - Delete item
router.delete("/items/:id", authMiddleware, WardrobeController.deleteItem);

// POST /wardrobe/items/:id/reanalyze - Re-run AI analysis on an item
router.post("/items/:id/reanalyze", authMiddleware, WardrobeController.reanalyzeItem);

export default router;
