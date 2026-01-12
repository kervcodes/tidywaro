import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { generateVirtualTryOn, generateOutfitTryOn } from '../services/tryon.service';
import logger from '../utils/logger';
import crypto from 'crypto';

// ============================================================================
// HELPER: Generate cache key for outfit combination
// ============================================================================
function generateOutfitCacheKey(userPhotoUrl: string, itemIds: string[]): string {
    const sortedIds = [...itemIds].sort().join(':');
    return crypto.createHash('md5').update(`${userPhotoUrl}:${sortedIds}`).digest('hex');
}

/**
 * Generate virtual try-on for a single garment
 * POST /tryon/generate
 */
export const generateTryOn = async (req: Request, res: Response) => {
    try {
        const { modelImageUrl, garmentImageUrl, category } = req.body;
        const supabase = (req as AuthRequest).supabase;

        if (!modelImageUrl || !garmentImageUrl) {
            return res.status(400).json({
                error: 'Missing required fields: modelImageUrl and garmentImageUrl',
            });
        }

        logger.info('Try-on generation requested', { 
            category,
            userId: (req as AuthRequest).user?.id,
        });

        const result = await generateVirtualTryOn(supabase, {
            modelImageUrl,
            garmentImageUrl,
            category: category || 'tops',
        });

        if (!result.success) {
            return res.status(422).json({
                error: result.error,
                fallback: result.fallback,
            });
        }

        res.json({
            success: true,
            imageUrl: result.imageUrl,
            cached: result.cached,
        });
    } catch (error: any) {
        logger.error('Try-on generation failed', { error: error.message });
        res.status(500).json({ 
            error: 'Failed to generate virtual try-on',
            details: error.message,
        });
    }
};

/**
 * Generate virtual try-on for a full outfit
 * POST /tryon/outfit
 */
export const generateOutfitTryOnController = async (req: Request, res: Response) => {
    try {
        const { modelImageUrl, garments } = req.body;
        const supabase = (req as AuthRequest).supabase;

        if (!modelImageUrl || !garments || !Array.isArray(garments) || garments.length === 0) {
            return res.status(400).json({
                error: 'Missing required fields: modelImageUrl and garments array',
            });
        }

        logger.info('Outfit try-on generation requested', { 
            garmentCount: garments.length,
            userId: (req as AuthRequest).user?.id,
        });

        const result = await generateOutfitTryOn(
            supabase,
            modelImageUrl,
            garments.map((g: any) => ({
                url: g.url || g.image_url || g.processed_image_url,
                category: g.category,
                subcategory: g.subcategory,
            }))
        );

        if (!result.success) {
            return res.status(422).json({
                error: result.error,
                fallback: result.fallback,
            });
        }

        res.json({
            success: true,
            imageUrl: result.imageUrl,
            cached: result.cached,
        });
    } catch (error: any) {
        logger.error('Outfit try-on generation failed', { error: error.message });
        res.status(500).json({ 
            error: 'Failed to generate outfit try-on',
            details: error.message,
        });
    }
};

/**
 * Check try-on service status
 * GET /tryon/status
 */
export const getTryOnStatus = async (req: Request, res: Response) => {
    const hasHuggingFaceKey = !!process.env.HUGGINGFACE_API_KEY;
    
    res.json({
        available: true,
        huggingFaceConfigured: hasHuggingFaceKey,
        gradioFallback: true,
        cacheEnabled: true,
    });
};

// ============================================================================
// USER PHOTOS ENDPOINTS
// These manage the user's full-body photos for try-on (1-3 photos max)
// ============================================================================

/**
 * Upload a user photo for try-on
 * POST /tryon/photos
 * 
 * INTEGRATION NOTE: This does NOT touch wardrobe_items or Gemini.
 * It stores to a separate table (tryon_user_photos) and bucket (tryon-photos).
 */
export const uploadUserPhoto = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user.id;
        const supabase = (req as AuthRequest).supabase;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({ 
                error: 'Invalid file type. Allowed: JPEG, PNG, WebP' 
            });
        }

        // Check photo count limit (max 3) - let DB trigger handle it for atomicity
        const { count } = await supabase
            .from('tryon_user_photos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if ((count || 0) >= 3) {
            return res.status(400).json({ 
                error: 'Maximum 3 try-on photos allowed. Delete one to upload more.' 
            });
        }

        // Upload to storage (separate bucket from wardrobe-items)
        const filename = `${userId}/${Date.now()}_tryon.jpg`;
        const { error: uploadError } = await supabase.storage
            .from('tryon-photos')
            .upload(filename, file.buffer, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
            });

        if (uploadError) {
            logger.error('Failed to upload user photo', { error: uploadError.message, userId });
            return res.status(500).json({ error: 'Failed to upload photo' });
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('tryon-photos')
            .getPublicUrl(filename);

        // Insert record
        const isFirst = (count || 0) === 0;
        const { data, error: dbError } = await supabase
            .from('tryon_user_photos')
            .insert({
                user_id: userId,
                image_url: publicUrl,
                is_default: isFirst, // First photo becomes default
            })
            .select()
            .single();

        if (dbError) {
            logger.error('Failed to save user photo record', { error: dbError.message, userId });
            return res.status(500).json({ error: 'Failed to save photo' });
        }

        logger.info('User photo uploaded', { userId, photoId: data.id, isDefault: isFirst });

        res.status(201).json(data);
    } catch (error: any) {
        logger.error('User photo upload failed', { error: error.message });
        res.status(500).json({ error: 'Failed to upload photo', details: error.message });
    }
};

/**
 * List user's try-on photos
 * GET /tryon/photos
 */
export const listUserPhotos = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user.id;
        const supabase = (req as AuthRequest).supabase;

        const { data, error } = await supabase
            .from('tryon_user_photos')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Failed to list user photos', { error: error.message, userId });
            return res.status(500).json({ error: 'Failed to fetch photos' });
        }

        res.json(data || []);
    } catch (error: any) {
        logger.error('List user photos failed', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch photos' });
    }
};

/**
 * Delete a user photo
 * DELETE /tryon/photos/:id
 */
export const deleteUserPhoto = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user.id;
        const supabase = (req as AuthRequest).supabase;
        const photoId = req.params.id;

        // Check ownership via RLS (will fail if not owner)
        const { data: photo, error: fetchError } = await supabase
            .from('tryon_user_photos')
            .select('*')
            .eq('id', photoId)
            .single();

        if (fetchError || !photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        // Delete from DB (RLS enforces ownership)
        const { error: deleteError } = await supabase
            .from('tryon_user_photos')
            .delete()
            .eq('id', photoId);

        if (deleteError) {
            logger.error('Failed to delete user photo', { error: deleteError.message, photoId });
            return res.status(500).json({ error: 'Failed to delete photo' });
        }

        // If deleted photo was default, make another one default
        if (photo.is_default) {
            await supabase
                .from('tryon_user_photos')
                .update({ is_default: true })
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);
        }

        logger.info('User photo deleted', { userId, photoId });
        res.status(204).send();
    } catch (error: any) {
        logger.error('Delete user photo failed', { error: error.message });
        res.status(500).json({ error: 'Failed to delete photo' });
    }
};

/**
 * Set a photo as default
 * PUT /tryon/photos/:id/default
 */
export const setDefaultPhoto = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user.id;
        const supabase = (req as AuthRequest).supabase;
        const photoId = req.params.id;

        // Update (trigger will unset other defaults)
        const { data, error } = await supabase
            .from('tryon_user_photos')
            .update({ is_default: true })
            .eq('id', photoId)
            .eq('user_id', userId) // RLS backup
            .select()
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        logger.info('Default photo updated', { userId, photoId });
        res.json(data);
    } catch (error: any) {
        logger.error('Set default photo failed', { error: error.message });
        res.status(500).json({ error: 'Failed to update default photo' });
    }
};

// ============================================================================
// CREDITS ENDPOINT
// ============================================================================

/**
 * Get user's try-on credit balance
 * GET /tryon/credits
 */
export const getCredits = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user.id;
        const supabase = (req as AuthRequest).supabase;

        const { data, error } = await supabase
            .from('user_subscriptions')
            .select('tier, tryon_credits, tryon_credits_reset_at')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            // Return default if no subscription record
            return res.json({ 
                credits: 5, 
                tier: 'free',
                resetAt: null,
            });
        }

        res.json({
            credits: data.tryon_credits ?? 5,
            tier: data.tier,
            resetAt: data.tryon_credits_reset_at,
        });
    } catch (error: any) {
        logger.error('Get credits failed', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch credits' });
    }
};

// ============================================================================
// TRY-ON JOBS ENDPOINTS
// Async job queue for full-outfit try-on generation
// ============================================================================

/**
 * Create a try-on job (queue generation)
 * POST /tryon/jobs
 * 
 * INTEGRATION NOTE: 
 * - Does NOT call Gemini or modify wardrobe_items
 * - Uses existing processed_image_url from wardrobe_items
 * - Deducts credits before queuing
 * - Returns cached result instantly if available
 */
export const createTryOnJob = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user.id;
        const supabase = (req as AuthRequest).supabase;
        const { userPhotoId, wardrobeItemIds } = req.body;

        // Validate input
        if (!wardrobeItemIds || !Array.isArray(wardrobeItemIds) || wardrobeItemIds.length === 0) {
            return res.status(400).json({ error: 'wardrobeItemIds array required' });
        }

        if (wardrobeItemIds.length > 10) {
            return res.status(400).json({ error: 'Maximum 10 items per outfit' });
        }

        // Get user photo (default if not specified)
        let userPhotoUrl: string;
        let photoId = userPhotoId;

        if (userPhotoId) {
            const { data: photo, error } = await supabase
                .from('tryon_user_photos')
                .select('id, image_url')
                .eq('id', userPhotoId)
                .single();

            if (error || !photo) {
                return res.status(400).json({ error: 'User photo not found' });
            }
            userPhotoUrl = photo.image_url;
        } else {
            // Get default photo
            const { data: defaultPhoto } = await supabase
                .from('tryon_user_photos')
                .select('id, image_url')
                .eq('user_id', userId)
                .eq('is_default', true)
                .single();

            if (!defaultPhoto) {
                return res.status(400).json({ 
                    error: 'No try-on photo found. Please upload a photo first.' 
                });
            }
            userPhotoUrl = defaultPhoto.image_url;
            photoId = defaultPhoto.id;
        }

        // Validate wardrobe items exist and belong to user (RLS handles ownership)
        const { data: items, error: itemsError } = await supabase
            .from('wardrobe_items')
            .select('id, processed_image_url, image_url, category, subcategory, tryon_ready')
            .in('id', wardrobeItemIds);

        if (itemsError || !items || items.length === 0) {
            return res.status(400).json({ error: 'No valid wardrobe items found' });
        }

        if (items.length !== wardrobeItemIds.length) {
            return res.status(400).json({ 
                error: `Only ${items.length} of ${wardrobeItemIds.length} items found`,
                foundIds: items.map(i => i.id),
            });
        }

        // Check if any items are marked as not try-on ready (warning only, don't block)
        const notReady = items.filter(i => i.tryon_ready === false);
        const warnings = notReady.length > 0 
            ? [`${notReady.length} item(s) may have low quality for try-on`] 
            : [];

        // Generate cache key
        const cacheKey = generateOutfitCacheKey(userPhotoUrl, wardrobeItemIds);

        // Check for cached result FIRST (free, no credit deduction)
        const { data: cachedResult } = await supabase
            .rpc('find_cached_tryon_result', { p_cache_key: cacheKey });

        if (cachedResult) {
            logger.info('Returning cached try-on result', { userId, cacheKey });
            return res.json({
                jobId: null, // No job created
                status: 'completed',
                resultUrl: cachedResult,
                cached: true,
                creditsUsed: 0,
            });
        }

        // Deduct credits BEFORE creating job
        const { data: creditDeducted, error: creditError } = await supabase
            .rpc('deduct_tryon_credits', { p_user_id: userId, p_amount: 1 });

        if (creditError || !creditDeducted) {
            return res.status(402).json({ 
                error: 'Insufficient credits. Please upgrade or wait for monthly reset.',
                code: 'INSUFFICIENT_CREDITS',
            });
        }

        // Create job
        const { data: job, error: jobError } = await supabase
            .from('tryon_jobs')
            .insert({
                user_id: userId,
                user_photo_id: photoId,
                user_photo_url: userPhotoUrl,
                wardrobe_item_ids: wardrobeItemIds,
                cache_key: cacheKey,
                status: 'pending',
                credits_charged: 1,
            })
            .select()
            .single();

        if (jobError) {
            // Refund credit on failure
            await supabase.rpc('refund_tryon_credits', { p_user_id: userId, p_amount: 1 });
            logger.error('Failed to create try-on job', { error: jobError.message, userId });
            return res.status(500).json({ error: 'Failed to create job' });
        }

        logger.info('Try-on job created', { 
            userId, 
            jobId: job.id, 
            itemCount: wardrobeItemIds.length,
            cacheKey,
        });

        res.status(201).json({
            jobId: job.id,
            status: 'pending',
            resultUrl: null,
            cached: false,
            creditsUsed: 1,
            warnings,
        });
    } catch (error: any) {
        logger.error('Create try-on job failed', { error: error.message });
        res.status(500).json({ error: 'Failed to create job', details: error.message });
    }
};

/**
 * Get try-on job status
 * GET /tryon/jobs/:id
 */
export const getJobStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user.id;
        const supabase = (req as AuthRequest).supabase;
        const jobId = req.params.id;

        const { data: job, error } = await supabase
            .from('tryon_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (error || !job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // RLS should handle this, but double-check
        if (job.user_id !== userId) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({
            jobId: job.id,
            status: job.status,
            resultUrl: job.result_url,
            errorMessage: job.error_message,
            createdAt: job.created_at,
            startedAt: job.started_at,
            completedAt: job.completed_at,
            retryCount: job.retry_count,
        });
    } catch (error: any) {
        logger.error('Get job status failed', { error: error.message });
        res.status(500).json({ error: 'Failed to get job status' });
    }
};

/**
 * List user's recent try-on jobs
 * GET /tryon/jobs
 */
export const listJobs = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user.id;
        const supabase = (req as AuthRequest).supabase;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

        const { data, error } = await supabase
            .from('tryon_jobs')
            .select('id, status, result_url, wardrobe_item_ids, created_at, completed_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            logger.error('Failed to list jobs', { error: error.message, userId });
            return res.status(500).json({ error: 'Failed to list jobs' });
        }

        res.json(data || []);
    } catch (error: any) {
        logger.error('List jobs failed', { error: error.message });
        res.status(500).json({ error: 'Failed to list jobs' });
    }
};
