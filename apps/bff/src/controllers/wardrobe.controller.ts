import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/auth.middleware";
import { AIService } from "../services/ai.service";
import imageProcessingService from "../services/imageProcessing.service";
import stripeService from "../services/stripe.service";
import logger, { logAI, logStorage, logDatabase } from "../utils/logger";
import { 
  BadRequestError, 
  NotFoundError, 
  StorageError, 
  DatabaseError,
  fromSupabaseError 
} from "../utils/errors";

// Custom error for subscription limits
class SubscriptionLimitError extends BadRequestError {
  constructor(itemsUsed: number, itemLimit: number) {
    super(`You've reached your limit of ${itemLimit} items. Upgrade to Premium for unlimited items.`);
    this.name = 'SubscriptionLimitError';
  }
}

export class WardrobeController {
  static async listItems(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user.id;
      const client = (req as AuthRequest).supabase || supabase;

      logDatabase("SELECT", "wardrobe_items", { userId });
      
      const { data, error } = await client
        .from("wardrobe_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw fromSupabaseError(error);
      }

      logger.info(`Listed ${data?.length || 0} wardrobe items`, { userId, count: data?.length });
      res.json(data || []);
    } catch (error) {
      next(error);
    }
  }

  static async uploadItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user.id;
      const file = req.file;

      if (!file) {
        throw new BadRequestError("No image file provided");
      }

      // Check subscription limits FIRST
      const limitCheck = await stripeService.canUserAddItem(userId);
      if (!limitCheck.allowed) {
        logger.warn("User reached item limit", { 
          userId, 
          itemsUsed: limitCheck.itemsUsed, 
          itemLimit: limitCheck.itemLimit,
          tier: limitCheck.tier,
        });
        throw new SubscriptionLimitError(limitCheck.itemsUsed, limitCheck.itemLimit);
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestError("Invalid file type. Allowed: JPEG, PNG, WebP, HEIC");
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestError("File size exceeds 10MB limit");
      }

      logger.info("Starting item upload", {
        userId,
        filename: file.originalname,
        size: `${(file.size / 1024).toFixed(1)}KB`,
        mimeType: file.mimetype,
        currentItems: limitCheck.itemsUsed,
        itemLimit: limitCheck.itemLimit,
      });

      const client = (req as AuthRequest).supabase || supabase;

      // 1. Process Image (resize and remove background)
      logger.info("Processing image", { userId, filename: file.originalname });
      const imageStartTime = Date.now();
      
      let processedImageResult;
      try {
        processedImageResult = await imageProcessingService.processWardrobeImage(file.buffer, {
          removeBackground: true,
          createThumbnail: false,
        });
        logger.info("Image processing complete", {
          userId,
          duration: `${Date.now() - imageStartTime}ms`,
          backgroundRemoved: processedImageResult.backgroundRemoved,
          dimensions: `${processedImageResult.width}x${processedImageResult.height}`,
        });
      } catch (procError: any) {
        logger.warn("Image processing failed, using original", { error: procError.message });
        // Fall back to original buffer
        processedImageResult = {
          originalBuffer: file.buffer,
          processedBuffer: file.buffer,
          width: 0,
          height: 0,
          format: file.mimetype.split('/')[1],
          backgroundRemoved: false,
        };
      }

      // 2. AI Analysis (use processed image for better results)
      logAI("Starting image analysis", { userId, filename: file.originalname });
      const startTime = Date.now();
      
      const aiAnalysis = await AIService.analyzeClothingImage(
        file.buffer,
        file.mimetype
      );
      
      const aiDuration = Date.now() - startTime;
      logAI("Analysis complete", { 
        userId, 
        category: aiAnalysis.category,
        subcategory: aiAnalysis.subcategory,
        confidence: aiAnalysis.confidence,
        duration: `${aiDuration}ms`,
      });

      // 3. Upload Original to Storage
      const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${userId}/${Date.now()}_${sanitizedFilename}`;
      logStorage("Uploading original", filePath);

      const { data: storageData, error: storageError } = await client.storage
        .from("wardrobe-items")
        .upload(filePath, processedImageResult.originalBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (storageError) {
        logStorage("Upload failed", filePath, false);
        throw new StorageError("Failed to upload image to storage", { 
          originalError: storageError.message 
        });
      }
      
      logStorage("Upload successful", filePath, true);

      // 4. Get Public URL for original
      const {
        data: { publicUrl },
      } = client.storage.from("wardrobe-items").getPublicUrl(filePath);

      // 5. Upload Processed Image (with background replaced with theme color)
      let processedImageUrl = null;
      const processedPath = `processed/${userId}/${Date.now()}_${sanitizedFilename.replace(/\.[^.]+$/, '.jpg')}`;
      
      logger.info("Uploading processed image", { 
        userId, 
        backgroundRemoved: processedImageResult.backgroundRemoved 
      });

      const { error: processedError } = await client.storage
        .from("wardrobe-items")
        .upload(processedPath, processedImageResult.processedBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (!processedError) {
        const {
          data: { publicUrl: procUrl },
        } = client.storage.from("wardrobe-items").getPublicUrl(processedPath);
        processedImageUrl = procUrl;
        logStorage("Processed image uploaded", processedPath, true);
      } else {
        logger.warn("Failed to upload processed image", { error: processedError.message });
      }

      // 6. Save Metadata to Database with AI-detected attributes
      const { data: dbData, error: dbError } = await client
        .from("wardrobe_items")
        .insert({
          user_id: userId,
          image_url: publicUrl,
          processed_image_url: processedImageUrl,
          // AI-detected attributes
          category: aiAnalysis.category,
          subcategory: aiAnalysis.subcategory,
          color: aiAnalysis.color,
          style: aiAnalysis.style,
          pattern: aiAnalysis.pattern,
          material: aiAnalysis.material,
          season: aiAnalysis.season,
          occasions: aiAnalysis.occasions,
          ai_description: aiAnalysis.description,
          ai_confidence: aiAnalysis.confidence,
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      logger.info("Item uploaded successfully with AI analysis", { 
        userId, 
        itemId: dbData.id,
        category: aiAnalysis.category,
        subcategory: aiAnalysis.subcategory,
        confidence: aiAnalysis.confidence
      });
      
      res.status(201).json(dbData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk upload multiple wardrobe items
   * Processes images in parallel with concurrency limit for speed
   */
  static async bulkUploadItems(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user.id;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new BadRequestError("No image files provided");
      }

      if (files.length > 10) {
        throw new BadRequestError("Maximum 10 images allowed per bulk upload");
      }

      // Check subscription limits FIRST
      const limitCheck = await stripeService.canUserAddItem(userId);
      const availableSlots = limitCheck.itemLimit === -1 
        ? Infinity 
        : limitCheck.itemLimit - limitCheck.itemsUsed;

      if (availableSlots <= 0) {
        logger.warn("User reached item limit (bulk)", { 
          userId, 
          itemsUsed: limitCheck.itemsUsed, 
          itemLimit: limitCheck.itemLimit,
          tier: limitCheck.tier,
        });
        throw new SubscriptionLimitError(limitCheck.itemsUsed, limitCheck.itemLimit);
      }

      // Limit files to available slots
      const filesToProcess = files.slice(0, Math.min(files.length, availableSlots));
      const skippedCount = files.length - filesToProcess.length;

      if (skippedCount > 0) {
        logger.warn("Some files will be skipped due to limit", {
          userId,
          totalFiles: files.length,
          processingFiles: filesToProcess.length,
          skippedFiles: skippedCount,
          availableSlots,
        });
      }

      logger.info("Starting bulk upload", {
        userId,
        fileCount: filesToProcess.length,
        totalSize: `${(filesToProcess.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)}MB`,
        currentItems: limitCheck.itemsUsed,
        itemLimit: limitCheck.itemLimit,
      });

      const client = (req as AuthRequest).supabase || supabase;
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      const maxSize = 10 * 1024 * 1024;
      const CONCURRENCY_LIMIT = 3; // Process 3 images at a time

      // Process a single file
      const processFile = async (file: Express.Multer.File, fileIndex: number): Promise<{ success: boolean; data?: any; error?: { filename: string; error: string } }> => {
        try {
          // Validate file type
          if (!allowedTypes.includes(file.mimetype)) {
            return {
              success: false,
              error: { filename: file.originalname, error: "Invalid file type. Allowed: JPEG, PNG, WebP, HEIC" }
            };
          }

          // Validate file size
          if (file.size > maxSize) {
            return {
              success: false,
              error: { filename: file.originalname, error: "File size exceeds 10MB limit" }
            };
          }

          logger.info(`Processing file ${fileIndex}/${filesToProcess.length}`, {
            userId,
            filename: file.originalname,
            size: `${(file.size / 1024).toFixed(1)}KB`,
          });

          // 1. AI Analysis
          logAI(`Analyzing file ${fileIndex}/${filesToProcess.length}`, { userId, filename: file.originalname });
          const aiStartTime = Date.now();
          
          const aiAnalysis = await AIService.analyzeClothingImage(
            file.buffer,
            file.mimetype
          );
          
          const aiDuration = Date.now() - aiStartTime;
          logAI("Analysis complete", { 
            userId, 
            filename: file.originalname,
            category: aiAnalysis.category,
            duration: `${aiDuration}ms`,
          });

          // 2. Upload to Storage
          const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `${userId}/${Date.now()}_${fileIndex}_${sanitizedFilename}`;
          
          const { error: storageError } = await client.storage
            .from("wardrobe-items")
            .upload(filePath, file.buffer, {
              contentType: file.mimetype,
              cacheControl: '3600',
            });

          if (storageError) {
            return {
              success: false,
              error: { filename: file.originalname, error: "Failed to upload to storage" }
            };
          }

          // 3. Get Public URL
          const { data: { publicUrl } } = client.storage
            .from("wardrobe-items")
            .getPublicUrl(filePath);

          // 4. Upload processed image (same for now)
          let processedImageUrl = null;
          const processedPath = `processed/${userId}/${Date.now()}_${fileIndex}_${sanitizedFilename}`;
          
          const { error: processedError } = await client.storage
            .from("wardrobe-items")
            .upload(processedPath, file.buffer, {
              contentType: file.mimetype,
            });

          if (!processedError) {
            const { data: { publicUrl: procUrl } } = client.storage
              .from("wardrobe-items")
              .getPublicUrl(processedPath);
            processedImageUrl = procUrl;
          }

          // 5. Save to Database
          const { data: dbData, error: dbError } = await client
            .from("wardrobe_items")
            .insert({
              user_id: userId,
              image_url: publicUrl,
              processed_image_url: processedImageUrl,
              category: aiAnalysis.category,
              subcategory: aiAnalysis.subcategory,
              color: aiAnalysis.color,
              style: aiAnalysis.style,
              pattern: aiAnalysis.pattern,
              material: aiAnalysis.material,
              season: aiAnalysis.season,
              occasions: aiAnalysis.occasions,
              ai_description: aiAnalysis.description,
              ai_confidence: aiAnalysis.confidence,
            })
            .select()
            .single();

          if (dbError) {
            return {
              success: false,
              error: { filename: file.originalname, error: "Failed to save to database" }
            };
          }

          logger.info(`File ${fileIndex}/${files.length} uploaded successfully`, {
            userId,
            itemId: dbData.id,
            category: aiAnalysis.category,
          });

          return { success: true, data: dbData };

        } catch (fileError: any) {
          logger.error(`Error processing file ${fileIndex}`, {
            filename: file.originalname,
            error: fileError.message,
          });
          return {
            success: false,
            error: { filename: file.originalname, error: fileError.message || "Unknown error occurred" }
          };
        }
      };

      // Process files in parallel with concurrency limit
      const results: {
        successful: any[];
        failed: { filename: string; error: string }[];
      } = {
        successful: [],
        failed: [],
      };

      // Add skipped files to failed if any
      if (skippedCount > 0) {
        for (let i = filesToProcess.length; i < files.length; i++) {
          results.failed.push({
            filename: files[i].originalname,
            error: `Skipped: You've reached your limit of ${limitCheck.itemLimit} items. Upgrade to Premium for unlimited items.`,
          });
        }
      }

      // Process in batches of CONCURRENCY_LIMIT
      for (let i = 0; i < filesToProcess.length; i += CONCURRENCY_LIMIT) {
        const batch = filesToProcess.slice(i, i + CONCURRENCY_LIMIT);
        const batchPromises = batch.map((file, batchIndex) => 
          processFile(file, i + batchIndex + 1)
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        for (const result of batchResults) {
          if (result.success && result.data) {
            results.successful.push(result.data);
          } else if (result.error) {
            results.failed.push(result.error);
          }
        }

        // Small delay between batches to avoid rate limiting
        if (i + CONCURRENCY_LIMIT < filesToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      logger.info("Bulk upload complete", {
        userId,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: skippedCount,
      });

      res.status(201).json({
        message: `Uploaded ${results.successful.length} of ${files.length} items`,
        successful: results.successful,
        failed: results.failed,
        summary: {
          total: files.length,
          successCount: results.successful.length,
          failCount: results.failed.length,
          skippedDueToLimit: skippedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user.id;
      const { id } = req.params;
      const client = (req as AuthRequest).supabase || supabase;

      if (!id) {
        throw new BadRequestError("Item ID is required");
      }

      logDatabase("SELECT", "wardrobe_items", { userId, itemId: id });

      const { data, error } = await client
        .from("wardrobe_items")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new NotFoundError("Item");
        }
        throw fromSupabaseError(error);
      }

      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user.id;
      const { id } = req.params;
      const updates = req.body;
      const client = (req as AuthRequest).supabase || supabase;

      if (!id) {
        throw new BadRequestError("Item ID is required");
      }

      // Only allow updating certain fields
      const allowedFields = [
        "category", "subcategory", "color", "style", "pattern", 
        "material", "season", "occasions", "brand"
      ];
      
      const filteredUpdates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          // Validate field types
          if (field === 'season' || field === 'occasions') {
            if (!Array.isArray(updates[field])) {
              throw new BadRequestError(`${field} must be an array`);
            }
          } else if (typeof updates[field] !== 'string') {
            throw new BadRequestError(`${field} must be a string`);
          }
          filteredUpdates[field] = updates[field];
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        throw new BadRequestError("No valid fields to update", { 
          allowedFields 
        });
      }

      logDatabase("UPDATE", "wardrobe_items", { userId, itemId: id, fields: Object.keys(filteredUpdates) });

      const { data, error } = await client
        .from("wardrobe_items")
        .update(filteredUpdates)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new NotFoundError("Item");
        }
        throw fromSupabaseError(error);
      }

      logger.info("Item updated", { userId, itemId: id, updates: filteredUpdates });
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async deleteItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user.id;
      const { id } = req.params;
      const client = (req as AuthRequest).supabase || supabase;

      if (!id) {
        throw new BadRequestError("Item ID is required");
      }

      // First get the item to find the storage paths
      const { data: item, error: fetchError } = await client
        .from("wardrobe_items")
        .select("image_url, processed_image_url")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          throw new NotFoundError("Item");
        }
        throw fromSupabaseError(fetchError);
      }

      logDatabase("DELETE", "wardrobe_items", { userId, itemId: id });

      // Delete from database
      const { error: deleteError } = await client
        .from("wardrobe_items")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (deleteError) {
        throw fromSupabaseError(deleteError);
      }

      // Try to delete from storage (don't fail if this doesn't work)
      try {
        if (item.image_url) {
          const imagePath = item.image_url.split("/wardrobe-items/")[1];
          if (imagePath) {
            await client.storage.from("wardrobe-items").remove([imagePath]);
            logStorage("Deleted", imagePath, true);
          }
        }
        if (item.processed_image_url) {
          const processedPath = item.processed_image_url.split("/wardrobe-items/")[1];
          if (processedPath) {
            await client.storage.from("wardrobe-items").remove([processedPath]);
            logStorage("Deleted", processedPath, true);
          }
        }
      } catch (storageError: any) {
        logger.warn("Failed to delete storage files (non-critical)", { error: storageError.message });
      }

      logger.info("Item deleted", { userId, itemId: id });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async reanalyzeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user.id;
      const { id } = req.params;
      const client = (req as AuthRequest).supabase || supabase;

      if (!id) {
        throw new BadRequestError("Item ID is required");
      }

      // Get the item and its image URL
      const { data: item, error: fetchError } = await client
        .from("wardrobe_items")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          throw new NotFoundError("Item");
        }
        throw fromSupabaseError(fetchError);
      }

      // Download the image from storage
      const imageUrl = item.image_url;
      logger.info("Re-analyzing item", { userId, itemId: id });
      logAI("Starting re-analysis", { userId, itemId: id });

      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new StorageError("Failed to fetch image from storage for re-analysis");
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get("content-type") || "image/jpeg";

      // Run AI analysis
      const startTime = Date.now();
      const aiAnalysis = await AIService.analyzeClothingImage(buffer, contentType);
      const duration = Date.now() - startTime;
      
      logAI("Re-analysis complete", {
        userId,
        itemId: id,
        category: aiAnalysis.category,
        confidence: aiAnalysis.confidence,
        duration: `${duration}ms`,
      });

      // Update the item with new AI data
      const { data: updated, error: updateError } = await client
        .from("wardrobe_items")
        .update({
          category: aiAnalysis.category,
          subcategory: aiAnalysis.subcategory,
          color: aiAnalysis.color,
          style: aiAnalysis.style,
          pattern: aiAnalysis.pattern,
          material: aiAnalysis.material,
          season: aiAnalysis.season,
          occasions: aiAnalysis.occasions,
          ai_description: aiAnalysis.description,
          ai_confidence: aiAnalysis.confidence,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        throw fromSupabaseError(updateError);
      }

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
}
