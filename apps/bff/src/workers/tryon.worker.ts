/**
 * Try-On Job Worker
 * 
 * Polls the tryon_jobs table for pending jobs and processes them.
 * Uses existing tryon.service.ts - NO changes to AI generation logic.
 * 
 * Run: npx ts-node src/workers/tryon.worker.ts
 * Production: node dist/workers/tryon.worker.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateOutfitTryOn } from '../services/tryon.service';
import logger from '../utils/logger';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
// Worker needs service role key to bypass RLS, but can fallback to anon key for testing
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!;

// How often to poll for new jobs (ms)
const POLL_INTERVAL = 5000; // 5 seconds

// Maximum time a job can be in 'processing' before considered stale (ms)
const STALE_JOB_TIMEOUT = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// Types
// ============================================================================

interface TryOnJob {
    id: string;
    user_id: string;
    user_photo_id: string;
    wardrobe_item_ids: string[];
    status: 'pending' | 'processing' | 'completed' | 'failed';
    credits_charged: number;
    result_image_url: string | null;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
}

interface UserPhoto {
    id: string;
    user_id: string;
    image_url: string;
}

interface WardrobeItem {
    id: string;
    image_url: string;
    processed_image_url: string | null;
    category: string;
    subcategory: string | null;
}

// ============================================================================
// Worker State
// ============================================================================

let isRunning = true;
let supabase: SupabaseClient;

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Fetch the next pending job and mark it as processing (atomic)
 * Uses the database function for race-condition safety
 */
async function getNextJob(): Promise<TryOnJob | null> {
    const { data, error } = await supabase.rpc('get_next_tryon_job');
    
    if (error) {
        logger.error('Failed to get next job', { error: error.message });
        return null;
    }
    
    if (!data || data.length === 0) {
        return null;
    }
    
    return data[0] as TryOnJob;
}

/**
 * Mark job as completed with result URL
 */
async function completeJob(jobId: string, resultImageUrl: string): Promise<void> {
    const { error } = await supabase
        .from('tryon_jobs')
        .update({
            status: 'completed',
            result_image_url: resultImageUrl,
            completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    
    if (error) {
        logger.error('Failed to complete job', { jobId, error: error.message });
        throw error;
    }
    
    logger.info('Job completed successfully', { jobId });
}

/**
 * Mark job as failed, refund credits
 */
async function failJob(jobId: string, errorMessage: string, userId: string, creditsToRefund: number): Promise<void> {
    // First, refund credits
    if (creditsToRefund > 0) {
        const { error: refundError } = await supabase.rpc('refund_tryon_credits', {
            p_user_id: userId,
            p_amount: creditsToRefund,
        });
        
        if (refundError) {
            logger.error('Failed to refund credits', { jobId, userId, error: refundError.message });
            // Continue to mark job as failed anyway
        } else {
            logger.info('Credits refunded', { jobId, userId, amount: creditsToRefund });
        }
    }
    
    // Mark job as failed
    const { error } = await supabase
        .from('tryon_jobs')
        .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    
    if (error) {
        logger.error('Failed to mark job as failed', { jobId, error: error.message });
    }
    
    logger.warn('Job failed', { jobId, errorMessage });
}

/**
 * Fetch user photo by ID
 */
async function getUserPhoto(photoId: string): Promise<UserPhoto | null> {
    const { data, error } = await supabase
        .from('tryon_user_photos')
        .select('id, user_id, image_url')
        .eq('id', photoId)
        .single();
    
    if (error) {
        logger.error('Failed to fetch user photo', { photoId, error: error.message });
        return null;
    }
    
    return data;
}

/**
 * Fetch wardrobe items by IDs
 */
async function getWardrobeItems(itemIds: string[]): Promise<WardrobeItem[]> {
    const { data, error } = await supabase
        .from('wardrobe_items')
        .select('id, image_url, processed_image_url, category, subcategory')
        .in('id', itemIds);
    
    if (error) {
        logger.error('Failed to fetch wardrobe items', { itemIds, error: error.message });
        return [];
    }
    
    return data || [];
}

/**
 * Find and reset stale jobs (stuck in 'processing' too long)
 */
async function resetStaleJobs(): Promise<void> {
    const staleThreshold = new Date(Date.now() - STALE_JOB_TIMEOUT).toISOString();
    
    const { data: staleJobs, error } = await supabase
        .from('tryon_jobs')
        .select('id, user_id, credits_charged')
        .eq('status', 'processing')
        .lt('started_at', staleThreshold);
    
    if (error) {
        logger.error('Failed to find stale jobs', { error: error.message });
        return;
    }
    
    if (!staleJobs || staleJobs.length === 0) {
        return;
    }
    
    logger.warn('Found stale jobs, marking as failed', { count: staleJobs.length });
    
    for (const job of staleJobs) {
        await failJob(
            job.id,
            'Job timed out - worker may have crashed. Credits refunded.',
            job.user_id,
            job.credits_charged
        );
    }
}

// ============================================================================
// Job Processing
// ============================================================================

/**
 * Process a single try-on job
 */
async function processJob(job: TryOnJob): Promise<void> {
    logger.info('Processing job', { jobId: job.id, userId: job.user_id });
    
    try {
        // 1. Fetch user photo
        const userPhoto = await getUserPhoto(job.user_photo_id);
        if (!userPhoto) {
            throw new Error('User photo not found');
        }
        
        // 2. Fetch wardrobe items
        const items = await getWardrobeItems(job.wardrobe_item_ids);
        if (items.length === 0) {
            throw new Error('No wardrobe items found');
        }
        
        // 3. Prepare garments for try-on service
        const garments = items.map(item => ({
            url: item.processed_image_url || item.image_url,
            category: item.category,
            subcategory: item.subcategory || undefined,
        }));
        
        // 4. Call existing try-on service (NO CHANGES to AI logic)
        const result = await generateOutfitTryOn(
            supabase,
            userPhoto.image_url,
            garments
        );
        
        // 5. Handle result
        if (result.success && result.imageUrl) {
            await completeJob(job.id, result.imageUrl);
        } else {
            throw new Error(result.error || 'Try-on generation failed');
        }
        
    } catch (error: any) {
        await failJob(
            job.id,
            error.message || 'Unknown error',
            job.user_id,
            job.credits_charged
        );
    }
}

// ============================================================================
// Main Loop
// ============================================================================

async function runWorker(): Promise<void> {
    logger.info('Try-On Worker starting...');
    
    // Validate environment
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        logger.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
        logger.error('Ensure .env file exists and contains these variables');
        process.exit(1);
    }
    
    // Initialize Supabase with service role (bypasses RLS for worker)
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    logger.info('Worker connected to Supabase');
    
    // Main polling loop
    while (isRunning) {
        try {
            // Check for stale jobs periodically (every 10 polls)
            if (Math.random() < 0.1) {
                await resetStaleJobs();
            }
            
            // Get next job
            const job = await getNextJob();
            
            if (job) {
                await processJob(job);
            } else {
                // No jobs available, wait before polling again
                await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            }
            
        } catch (error: any) {
            logger.error('Worker loop error', { error: error.message });
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL * 2));
        }
    }
    
    logger.info('Worker shutting down...');
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    isRunning = false;
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    isRunning = false;
});

// ============================================================================
// Start Worker
// ============================================================================

runWorker().catch(error => {
    logger.error('Worker crashed', { error: error.message });
    process.exit(1);
});
