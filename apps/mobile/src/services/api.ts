import axios from 'axios';
import { Platform } from 'react-native';
import { logApi, logger } from '../utils/logger';

// Type definition for React Native file upload
// React Native's FormData.append() accepts objects with uri, name, and type
// properties for file uploads, which differs from the standard web Blob API
interface FormDataImage {
    uri: string;
    name: string;
    type: string;
}

// Use 10.0.2.2 for Android Emulator
// For physical devices (iPhone/Android), use your computer's local LAN IP address (e.g., 192.168.1.x)
// REPLACE 'YOUR_LOCAL_IP' with your actual IP address (run `ipconfig` on Windows or `ifconfig` on Mac)
const LOCAL_IP = process.env.EXPO_PUBLIC_LOCAL_IP || '192.168.1.165';

const PORT = process.env.EXPO_PUBLIC_PORT || '3000';
const DEV_API_URL = Platform.select({
    android: `http://10.0.2.2:${PORT}`,
    ios: `http://${LOCAL_IP}:${PORT}`, // Use local IP for physical iPhone
    default: `http://${LOCAL_IP}:${PORT}`,
});

logger.info('API initialized', { baseURL: DEV_API_URL, platform: Platform.OS });

const api = axios.create({
    baseURL: DEV_API_URL,
});

// Request interceptor for logging
api.interceptors.request.use(
    (config) => {
        const startTime = Date.now();
        (config as any).metadata = { startTime };
        logApi.request(config.method?.toUpperCase() || 'GET', config.url || '');
        return config;
    },
    (error) => {
        logger.error('Request interceptor error', { error: error.message });
        return Promise.reject(error);
    }
);

// Response interceptor for logging
api.interceptors.response.use(
    (response) => {
        const startTime = (response.config as any).metadata?.startTime;
        const duration = startTime ? Date.now() - startTime : undefined;
        logApi.response(
            response.config.method?.toUpperCase() || 'GET',
            response.config.url || '',
            response.status,
            duration
        );
        return response;
    },
    (error) => {
        if (axios.isAxiosError(error) && error.config) {
            const startTime = (error.config as any).metadata?.startTime;
            const duration = startTime ? Date.now() - startTime : undefined;
            logApi.response(
                error.config.method?.toUpperCase() || 'GET',
                error.config.url || '',
                error.response?.status || 0,
                duration
            );
        }
        return Promise.reject(error);
    }
);

/**
 * Helper function to parse axios errors and provide descriptive error messages
 */
const getErrorMessage = (error: unknown, context: string): string => {
    if (axios.isAxiosError(error)) {
        // Network error (no response received)
        if (!error.response) {
            if (error.code === 'ECONNABORTED') {
                return `${context}: Request timeout. Please check your internet connection and try again.`;
            }
            if (error.message.includes('Network Error')) {
                return `${context}: Network error. Please check your internet connection and ensure the server is running.`;
            }
            return `${context}: Unable to connect to server. Please check your internet connection.`;
        }

        // HTTP error responses
        const status = error.response.status;
        const data = error.response.data as { message?: string; error?: string } | undefined;
        const serverMessage = data?.message || data?.error;

        switch (status) {
            case 400:
                return `${context}: Invalid request${serverMessage ? ` - ${serverMessage}` : ''}`;
            case 401:
                return `${context}: Authentication failed. Please check your credentials and try again.`;
            case 403:
                return `${context}: Access denied. You don't have permission to perform this action.`;
            case 404:
                return `${context}: Resource not found. The endpoint may not exist.`;
            case 413:
                return `${context}: File too large. Please choose a smaller image.`;
            case 429:
                return `${context}: Too many requests. Please wait a moment and try again.`;
            case 500:
                return `${context}: Server error${serverMessage ? ` - ${serverMessage}` : '. Please try again later.'}`;
            case 503:
                return `${context}: Service unavailable. The server may be down for maintenance.`;
            default:
                return `${context}: Request failed with status ${status}${serverMessage ? ` - ${serverMessage}` : ''}`;
        }
    }

    // Unknown error type
    return `${context}: An unexpected error occurred. Please try again.`;
};

/**
 * Uploads a wardrobe item image. AI will automatically detect category, color, style, etc.
 * @param imageUri - Local URI of the image to upload
 * @param token - JWT authentication token
 * @returns Promise resolving to the created wardrobe item with AI-detected attributes
 * @throws Error if upload fails
 */
export const uploadWardrobeItem = async (imageUri: string, token: string) => {
    // Validate imageUri
    if (!imageUri || typeof imageUri !== 'string' || imageUri.trim() === '') {
        throw new Error('Invalid imageUri: must be a non-empty string');
    }

    // Validate that imageUri is a valid URI format (file://, content://, or http(s)://)
    const uriPattern = /^(file|content|https?):\/\/\S+$/i;
    if (!uriPattern.test(imageUri.trim())) {
        throw new Error('Invalid imageUri: must be a valid URI format (file://, content://, or http(s)://)');
    }

    const formData = new FormData();

    // Append image
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const imageFile: FormDataImage = {
        uri: imageUri,
        name: filename || 'upload.jpg',
        type,
    };

    // React Native's FormData implementation accepts ReactNativeFile objects
    formData.append('image', imageFile as unknown as Blob);

    try {
        const response = await api.post('/wardrobe/items', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`,
            },
            timeout: 60000, // 60 second timeout for AI analysis
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Upload failed');
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    }
};

/**
 * Response type for bulk upload
 */
export interface BulkUploadResult {
    message: string;
    successful: any[];
    failed: { filename: string; error: string }[];
    summary: {
        total: number;
        successCount: number;
        failCount: number;
        skippedDueToLimit?: number;
    };
}

/**
 * Progress callback for bulk upload
 */
export type BulkUploadProgressCallback = (progress: {
    current: number;
    total: number;
    status: 'uploading' | 'processing';
}) => void;

/**
 * Uploads multiple wardrobe item images in a single request.
 * AI will automatically detect category, color, style, etc. for each item.
 * @param imageUris - Array of local image URIs to upload (max 10)
 * @param token - JWT authentication token
 * @param onProgress - Optional callback to track upload progress
 * @returns Promise resolving to bulk upload results with successful and failed items
 * @throws Error if upload fails completely
 */
export const bulkUploadWardrobeItems = async (
    imageUris: string[],
    token: string,
    onProgress?: BulkUploadProgressCallback
): Promise<BulkUploadResult> => {
    // Validate input
    if (!imageUris || !Array.isArray(imageUris) || imageUris.length === 0) {
        throw new Error('Invalid imageUris: must be a non-empty array');
    }

    if (imageUris.length > 10) {
        throw new Error('Too many images: maximum 10 images allowed per bulk upload');
    }

    // Validate each URI
    const uriPattern = /^(file|content|https?):\/\/\S+$/i;
    for (const uri of imageUris) {
        if (!uri || typeof uri !== 'string' || !uriPattern.test(uri.trim())) {
            throw new Error(`Invalid imageUri: ${uri}`);
        }
    }

    logger.info('Starting bulk upload', { imageCount: imageUris.length });
    onProgress?.({ current: 0, total: imageUris.length, status: 'uploading' });

    const formData = new FormData();

    // Append all images
    for (let i = 0; i < imageUris.length; i++) {
        const imageUri = imageUris[i];
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        const imageFile: FormDataImage = {
            uri: imageUri,
            name: filename || `upload_${i + 1}.jpg`,
            type,
        };

        // React Native's FormData implementation accepts ReactNativeFile objects
        formData.append('images', imageFile as unknown as Blob);
    }

    try {
        onProgress?.({ current: 0, total: imageUris.length, status: 'processing' });
        
        const response = await api.post('/wardrobe/items/bulk', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`,
            },
            // With parallel processing (3 at a time), timeout is ~20s per batch
            // For 10 images: 4 batches * 20s = 80s + 60s buffer = 140s
            timeout: Math.ceil(imageUris.length / 3) * 20000 + 60000,
        });
        
        const result = response.data as BulkUploadResult;
        logger.info('Bulk upload complete', {
            successful: result.summary.successCount,
            failed: result.summary.failCount,
        });
        
        return result;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Bulk upload failed');
        logger.error('Bulk upload failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

/**
 * Fetches all wardrobe items for the authenticated user
 * @param token - JWT authentication token
 * @returns Promise resolving to an array of wardrobe items
 * @throws Error if fetch fails or token is invalid
 */
export const getWardrobeItems = async (token: string) => {
    try {
        const response = await api.get('/wardrobe/items', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Fetch items failed');
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    }
};

/**
 * Generates a weekly outfit plan
 * @param startDate - Start date of the plan (YYYY-MM-DD)
 * @param token - JWT authentication token
 * @returns Promise resolving to the generated plan
 */
export const generateWeeklyPlan = async (startDate: string, token: string) => {
    try {
        const response = await api.post('/weekly-plans/generate', { startDate }, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Plan generation failed');
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    }
};

/**
 * Fetches the current weekly plan
 * @param token - JWT authentication token
 * @returns Promise resolving to the current plan, or null if no plan exists
 */
export const getWeeklyPlan = async (token: string) => {
    try {
        const response = await api.get('/weekly-plans/current', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        // 404 means no plan exists - this is expected, not an error
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null;
        }
        const errorMessage = getErrorMessage(error, 'Fetch plan failed');
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    }
};

/**
 * Fetches a single wardrobe item by ID
 * @param id - Item ID
 * @param token - JWT authentication token
 * @returns Promise resolving to the wardrobe item
 */
export const getWardrobeItem = async (id: string, token: string) => {
    try {
        const response = await api.get(`/wardrobe/items/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Fetch item failed');
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    }
};

/**
 * Updates a wardrobe item
 * @param id - Item ID
 * @param updates - Fields to update
 * @param token - JWT authentication token
 * @returns Promise resolving to the updated item
 */
export const updateWardrobeItem = async (
    id: string, 
    updates: {
        category?: string;
        subcategory?: string;
        color?: string;
        style?: string;
        pattern?: string;
        material?: string;
        season?: string[];
        occasions?: string[];
        brand?: string;
    },
    token: string
) => {
    try {
        const response = await api.put(`/wardrobe/items/${id}`, updates, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Update item failed');
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    }
};

/**
 * Deletes a wardrobe item
 * @param id - Item ID
 * @param token - JWT authentication token
 */
export const deleteWardrobeItem = async (id: string, token: string) => {
    try {
        await api.delete(`/wardrobe/items/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Delete item failed');
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    }
};

/**
 * Re-analyze a wardrobe item with AI
 * @param id - Item ID
 * @param token - JWT authentication token
 * @returns Promise resolving to the updated item with new AI analysis
 */
export const reanalyzeWardrobeItem = async (id: string, token: string) => {
    try {
        const response = await api.post(`/wardrobe/items/${id}/reanalyze`, {}, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            timeout: 60000, // 60 second timeout for AI analysis
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'AI analysis failed');
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    }
};

/**
 * Virtual try-on result
 */
export interface TryOnResult {
    success: boolean;
    imageUrl?: string;
    cached?: boolean;
    error?: string;
    fallback?: boolean;
}

/**
 * Generate virtual try-on for a single garment
 * @param modelImageUrl - URL of the model/person image
 * @param garmentImageUrl - URL of the garment image
 * @param category - Clothing category (tops, bottoms, etc.)
 * @param token - JWT authentication token
 * @returns Promise resolving to try-on result with generated image URL
 */
export const generateVirtualTryOn = async (
    modelImageUrl: string,
    garmentImageUrl: string,
    category: string,
    token: string
): Promise<TryOnResult> => {
    try {
        const response = await api.post('/tryon/generate', {
            modelImageUrl,
            garmentImageUrl,
            category,
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            timeout: 120000, // 2 minute timeout for AI generation
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Virtual try-on failed');
        logger.error('Virtual try-on failed', { error: errorMessage });
        return {
            success: false,
            error: errorMessage,
            fallback: true,
        };
    }
};

/**
 * Generate virtual try-on for a full outfit
 * @param modelImageUrl - URL of the model/person image
 * @param garments - Array of garment objects with url, category, subcategory
 * @param token - JWT authentication token
 * @returns Promise resolving to try-on result with generated image URL
 */
export const generateOutfitTryOn = async (
    modelImageUrl: string,
    garments: Array<{ url: string; category: string; subcategory?: string }>,
    token: string
): Promise<TryOnResult> => {
    try {
        const response = await api.post('/tryon/outfit', {
            modelImageUrl,
            garments,
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            timeout: 120000, // 2 minute timeout for AI generation
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Outfit try-on failed');
        logger.error('Outfit try-on failed', { error: errorMessage });
        return {
            success: false,
            error: errorMessage,
            fallback: true,
        };
    }
};

/**
 * Check virtual try-on service status
 * @returns Promise resolving to service status
 */
export const getTryOnStatus = async (): Promise<{
    available: boolean;
    huggingFaceConfigured: boolean;
    gradioFallback: boolean;
}> => {
    try {
        const response = await api.get('/tryon/status');
        return response.data;
    } catch (error) {
        return {
            available: false,
            huggingFaceConfigured: false,
            gradioFallback: false,
        };
    }
};

// ============== SUBSCRIPTION API ==============

export interface SubscriptionInfo {
    tier: 'free' | 'premium';
    status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
    itemLimit: number;
    itemsUsed: number;
    canAddItems: boolean;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    stripeCustomerId: string | null;
}

export interface CheckoutSession {
    sessionId: string;
    url: string;
}

/**
 * Get user's subscription info
 */
export const getSubscription = async (token: string): Promise<SubscriptionInfo> => {
    try {
        const response = await api.get('/subscription', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to get subscription');
        logger.error('Get subscription failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

/**
 * Check if user can add more items
 */
export const checkItemLimit = async (token: string): Promise<{
    allowed: boolean;
    itemsUsed: number;
    itemLimit: number;
    tier: string;
}> => {
    try {
        const response = await api.get('/subscription/check-limit', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to check item limit');
        logger.error('Check item limit failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

/**
 * Create checkout session for premium upgrade
 */
export const createCheckoutSession = async (
    token: string,
    priceType: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string
): Promise<CheckoutSession> => {
    try {
        const response = await api.post('/subscription/checkout', {
            priceType,
            successUrl,
            cancelUrl,
        }, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to create checkout');
        logger.error('Create checkout failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

/**
 * Create billing portal session for subscription management
 */
export const createBillingPortalSession = async (
    token: string,
    returnUrl: string
): Promise<{ url: string }> => {
    try {
        const response = await api.post('/subscription/billing-portal', {
            returnUrl,
        }, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to open billing portal');
        logger.error('Create billing portal failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

/**
 * Cancel subscription at period end
 */
export const cancelSubscription = async (token: string): Promise<void> => {
    try {
        await api.post('/subscription/cancel', {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to cancel subscription');
        logger.error('Cancel subscription failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

/**
 * Resume a canceled subscription
 */
export const resumeSubscription = async (token: string): Promise<void> => {
    try {
        await api.post('/subscription/resume', {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to resume subscription');
        logger.error('Resume subscription failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

// ============================================================================
// TRY-ON USER PHOTOS API
// ============================================================================

/**
 * User photo for try-on
 */
export interface TryOnUserPhoto {
    id: string;
    user_id: string;
    image_url: string;
    thumbnail_url: string | null;
    is_default: boolean;
    created_at: string;
}

/**
 * Upload a user photo for try-on (max 3 photos allowed)
 */
export const uploadTryOnPhoto = async (imageUri: string, token: string): Promise<TryOnUserPhoto> => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const imageFile: FormDataImage = {
        uri: imageUri,
        name: filename || 'photo.jpg',
        type,
    };

    formData.append('image', imageFile as unknown as Blob);

    try {
        const response = await api.post('/tryon/photos', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`,
            },
            timeout: 30000,
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to upload photo');
        logger.error('Upload try-on photo failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

/**
 * Get all user photos for try-on
 */
export const getTryOnPhotos = async (token: string): Promise<TryOnUserPhoto[]> => {
    try {
        const response = await api.get('/tryon/photos', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to fetch photos');
        logger.error('Get try-on photos failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

/**
 * Delete a user photo
 */
export const deleteTryOnPhoto = async (photoId: string, token: string): Promise<void> => {
    try {
        await api.delete(`/tryon/photos/${photoId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to delete photo');
        logger.error('Delete try-on photo failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

/**
 * Set a photo as the default for try-on
 */
export const setDefaultTryOnPhoto = async (photoId: string, token: string): Promise<void> => {
    try {
        await api.put(`/tryon/photos/${photoId}/default`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to set default photo');
        logger.error('Set default try-on photo failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

// ============================================================================
// TRY-ON CREDITS API
// ============================================================================

/**
 * Credits balance information
 */
export interface TryOnCreditsInfo {
    tryon_credits_balance: number;
    tryon_credits_used: number;
    subscription_tier: string;
}

/**
 * Get user's try-on credits balance
 */
export const getTryOnCredits = async (token: string): Promise<TryOnCreditsInfo> => {
    try {
        const response = await api.get('/tryon/credits', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to fetch credits');
        logger.error('Get try-on credits failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

// ============================================================================
// TRY-ON JOBS API (Async Full-Outfit Generation)
// ============================================================================

/**
 * Try-on job status
 */
export type TryOnJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Try-on job information
 */
export interface TryOnJob {
    id: string;
    user_id: string;
    user_photo_id: string;
    wardrobe_item_ids: string[];
    status: TryOnJobStatus;
    credits_charged: number;
    result_image_url: string | null;
    error_message: string | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
}

/**
 * Create a new try-on job (async processing)
 */
export const createTryOnJob = async (
    userPhotoId: string,
    wardrobeItemIds: string[],
    token: string
): Promise<TryOnJob> => {
    try {
        const response = await api.post('/tryon/jobs', {
            user_photo_id: userPhotoId,
            wardrobe_item_ids: wardrobeItemIds,
        }, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to create try-on job');
        logger.error('Create try-on job failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

/**
 * Get status of a specific try-on job
 */
export const getTryOnJobStatus = async (jobId: string, token: string): Promise<TryOnJob> => {
    try {
        const response = await api.get(`/tryon/jobs/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to get job status');
        logger.error('Get try-on job status failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

/**
 * List all user's try-on jobs
 */
export const getTryOnJobs = async (token: string, limit = 20): Promise<TryOnJob[]> => {
    try {
        const response = await api.get(`/tryon/jobs?limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to fetch jobs');
        logger.error('Get try-on jobs failed', { error: errorMessage });
        throw new Error(errorMessage);
    }
};

/**
 * Poll for job completion with timeout
 * @param jobId - Job to poll
 * @param token - Auth token
 * @param maxWaitMs - Maximum time to wait (default 5 minutes)
 * @param pollIntervalMs - How often to poll (default 3 seconds)
 */
export const pollTryOnJob = async (
    jobId: string,
    token: string,
    onProgress?: (job: TryOnJob) => void,
    maxWaitMs = 5 * 60 * 1000,
    pollIntervalMs = 3000
): Promise<TryOnJob> => {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        const job = await getTryOnJobStatus(jobId, token);
        
        if (onProgress) {
            onProgress(job);
        }

        if (job.status === 'completed' || job.status === 'failed') {
            return job;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error('Try-on generation timed out. Please check back later.');
};

export default api;
