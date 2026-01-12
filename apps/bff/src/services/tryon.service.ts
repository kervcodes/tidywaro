import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../utils/logger';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { Client } from '@gradio/client';

// Hugging Face API configuration
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Try-on result cache bucket
const TRYON_CACHE_BUCKET = 'tryon-cache';

// List of virtual try-on spaces to try (in order of preference)
const TRYON_SPACES = [
    'yisol/IDM-VTON',
    'Nymbo/Virtual-Try-On',
    'levihsu/OOTDiffusion',
];

// Gradio space URL for raw API calls
const GRADIO_CLIENT_URL = 'https://yisol-idm-vton.hf.space';

interface TryOnRequest {
    modelImageUrl: string;      // Full-body photo of the person/model
    garmentImageUrl: string;    // Clothing item image
    category: string;           // tops, bottoms, full-body, etc.
}

interface TryOnResult {
    success: boolean;
    imageUrl?: string;
    cached?: boolean;
    error?: string;
    fallback?: boolean;
}

/**
 * Generate a cache key for a try-on combination
 */
function generateCacheKey(modelUrl: string, garmentUrl: string): string {
    const hash = crypto.createHash('md5')
        .update(`${modelUrl}:${garmentUrl}`)
        .digest('hex');
    return `tryon_${hash}.png`;
}

/**
 * Check if a cached try-on result exists
 */
async function getCachedResult(
    supabase: SupabaseClient,
    cacheKey: string
): Promise<string | null> {
    try {
        const { data } = supabase.storage
            .from(TRYON_CACHE_BUCKET)
            .getPublicUrl(cacheKey);

        // Check if file exists by making a HEAD request
        const response = await fetch(data.publicUrl, { method: 'HEAD' });
        if (response.ok) {
            logger.debug('Try-on cache hit', { cacheKey });
            return data.publicUrl;
        }
    } catch (error) {
        // Cache miss - that's okay
    }
    return null;
}

/**
 * Download image as blob for Gradio client
 */
async function downloadImageAsBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return new Blob([arrayBuffer], { type: 'image/png' });
}

/**
 * Call virtual try-on using official Gradio client
 * This properly handles Space wakeup, queuing, and authentication
 */
async function callGradioClientTryOn(
    modelImageUrl: string,
    garmentImageUrl: string
): Promise<Buffer | null> {
    for (const spaceName of TRYON_SPACES) {
        try {
            logger.info(`Trying Gradio space via client: ${spaceName}`);
            
            // Connect to the space with HF token for priority access
            const connectOptions: any = {};
            if (HF_API_KEY) {
                connectOptions.hf_token = HF_API_KEY;
            }
            const client = await Client.connect(spaceName, connectOptions);
            
            // Download images as blobs for the client
            const modelBlob = await downloadImageAsBlob(modelImageUrl);
            const garmentBlob = await downloadImageAsBlob(garmentImageUrl);
            
            let result: any;
            
            // Different spaces have different API endpoints
            if (spaceName === 'yisol/IDM-VTON') {
                // IDM-VTON interface
                result = await client.predict('/tryon', {
                    dict: {
                        background: modelBlob,
                        layers: [],
                        composite: null,
                    },
                    garm_img: garmentBlob,
                    garment_des: "A stylish garment",
                    is_checked: true,
                    is_checked_crop: false,
                    denoise_steps: 30,
                    seed: 42,
                });
            } else if (spaceName === 'Nymbo/Virtual-Try-On') {
                // Nymbo interface (simpler)
                result = await client.predict('/predict', {
                    person_image: modelBlob,
                    garment_image: garmentBlob,
                });
            } else if (spaceName === 'levihsu/OOTDiffusion') {
                // OOTDiffusion interface
                result = await client.predict('/process_dc', {
                    vton_img: modelBlob,
                    garm_img: garmentBlob,
                    category: "upperbody",
                    n_samples: 1,
                    n_steps: 20,
                    image_scale: 2.0,
                    seed: 42,
                });
            } else {
                // Generic fallback
                result = await client.predict('/predict', [
                    modelBlob,
                    garmentBlob,
                ]);
            }
            
            // Extract image from result
            if (result && result.data) {
                const outputData = result.data[0];
                
                if (typeof outputData === 'object' && outputData.url) {
                    // It's a file reference with URL
                    const fileResponse = await fetch(outputData.url);
                    if (fileResponse.ok) {
                        const arrayBuffer = await fileResponse.arrayBuffer();
                        logger.info(`Gradio client ${spaceName} succeeded`);
                        return Buffer.from(arrayBuffer);
                    }
                } else if (typeof outputData === 'string') {
                    if (outputData.startsWith('data:')) {
                        const base64Data = outputData.split(',')[1];
                        logger.info(`Gradio client ${spaceName} succeeded (base64)`);
                        return Buffer.from(base64Data, 'base64');
                    } else if (outputData.startsWith('http')) {
                        const fileResponse = await fetch(outputData);
                        if (fileResponse.ok) {
                            const arrayBuffer = await fileResponse.arrayBuffer();
                            logger.info(`Gradio client ${spaceName} succeeded (URL)`);
                            return Buffer.from(arrayBuffer);
                        }
                    }
                }
            }
            
            logger.warn(`Gradio client ${spaceName} returned unexpected format`);
        } catch (error: any) {
            logger.warn(`Gradio client ${spaceName} failed`, { 
                error: error.message,
                name: error.name 
            });
            // Continue to next space
        }
    }
    
    logger.error('All Gradio client attempts failed');
    return null;
}

/**
 * Call IDM-VTON via Gradio API (Hugging Face Spaces)
 * This is the recommended way to use virtual try-on models
 */
async function callHuggingFaceTryOn(
    modelImageUrl: string,
    garmentImageUrl: string,
    category: string
): Promise<Buffer | null> {
    try {
        logger.info('Attempting IDM-VTON via Gradio API', { category });
        
        // Step 1: Create a session and upload images
        // The IDM-VTON Gradio space expects direct URLs or file uploads
        const gradioUrl = `${GRADIO_CLIENT_URL}/api/predict`;
        
        // Build the request payload for IDM-VTON Gradio space
        // Based on the space's interface: model image, garment image, options
        const payload = {
            data: [
                modelImageUrl,      // Human/model image URL
                garmentImageUrl,    // Garment image URL  
                "Virtual Try-On",   // Mode
                true,               // Auto-mask
                true,               // Auto-crop
                30,                 // Number of steps
                42,                 // Seed
            ],
        };

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        // Add HF token for priority access if available
        if (HF_API_KEY) {
            headers['Authorization'] = `Bearer ${HF_API_KEY}`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout for AI processing

        const response = await fetch(gradioUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text();
            
            if (response.status === 503) {
                logger.info('IDM-VTON model is loading, please wait...');
                // Wait for model to load and retry once
                await new Promise(resolve => setTimeout(resolve, 30000));
                
                const retryResponse = await fetch(gradioUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                });
                
                if (!retryResponse.ok) {
                    logger.error('IDM-VTON retry failed', { status: retryResponse.status });
                    return null;
                }
                
                return await processGradioResponse(retryResponse);
            }

            logger.error('IDM-VTON API error', { status: response.status, error: errorText.substring(0, 500) });
            return null;
        }

        return await processGradioResponse(response);
    } catch (error: any) {
        if (error.name === 'AbortError') {
            logger.error('IDM-VTON request timed out');
        } else {
            logger.error('IDM-VTON API call failed', { error: error.message });
        }
        return null;
    }
}

/**
 * Process Gradio API response and extract image buffer
 */
async function processGradioResponse(response: any): Promise<Buffer | null> {
    try {
        const result = await response.json();
        
        if (result.data && result.data[0]) {
            let imageData = result.data[0];
            
            // Handle different response formats
            if (typeof imageData === 'object' && (imageData.path || imageData.url)) {
                // It's a file reference, fetch it
                const fileUrl = imageData.url || imageData.path;
                const fileResponse = await fetch(fileUrl);
                if (fileResponse.ok) {
                    const arrayBuffer = await fileResponse.arrayBuffer();
                    logger.info('IDM-VTON succeeded (file reference)');
                    return Buffer.from(arrayBuffer);
                }
            } else if (typeof imageData === 'string') {
                if (imageData.startsWith('data:')) {
                    // Base64 data URL
                    const base64Data = imageData.split(',')[1];
                    logger.info('IDM-VTON succeeded (base64 data URL)');
                    return Buffer.from(base64Data, 'base64');
                } else if (imageData.startsWith('http')) {
                    // Direct URL
                    const fileResponse = await fetch(imageData);
                    if (fileResponse.ok) {
                        const arrayBuffer = await fileResponse.arrayBuffer();
                        logger.info('IDM-VTON succeeded (URL)');
                        return Buffer.from(arrayBuffer);
                    }
                } else {
                    // Raw base64
                    logger.info('IDM-VTON succeeded (raw base64)');
                    return Buffer.from(imageData, 'base64');
                }
            }
        }
        
        logger.warn('IDM-VTON returned unexpected format', { data: JSON.stringify(result).substring(0, 200) });
        return null;
    } catch (error: any) {
        logger.error('Failed to process Gradio response', { error: error.message });
        return null;
    }
}

/**
 * Alternative: Use Gradio-hosted VTON model (free, no API key needed)
 * Tries multiple Gradio spaces as fallbacks
 */
async function callGradioTryOn(
    modelImageUrl: string,
    garmentImageUrl: string
): Promise<Buffer | null> {
    // List of Gradio spaces to try (in order of preference)
    const gradioSpaces = [
        {
            name: 'levihsu-ootdiffusion',
            url: 'https://levihsu-ootdiffusion.hf.space/api/predict',
            payload: (modelUrl: string, garmentUrl: string) => ({
                data: [
                    { path: modelUrl, url: modelUrl },
                    { path: garmentUrl, url: garmentUrl },
                    "upper_body",
                    20,  // steps
                    2.0, // guidance
                    42,  // seed
                ],
            }),
        },
        {
            name: 'yisol-idm-vton',
            url: 'https://yisol-idm-vton.hf.space/api/predict',
            payload: (modelUrl: string, garmentUrl: string) => ({
                data: [
                    modelUrl,
                    garmentUrl,
                    "Virtual Try-On",
                    true,
                    true,
                    30,
                    42,
                ],
            }),
        },
        {
            name: 'Nymbo-Virtual-Try-On',
            url: 'https://nymbo-virtual-try-on.hf.space/api/predict',
            payload: (modelUrl: string, garmentUrl: string) => ({
                data: [
                    modelUrl,
                    garmentUrl,
                ],
            }),
        },
    ];

    for (const space of gradioSpaces) {
        try {
            logger.info(`Trying Gradio space: ${space.name}`);
            
            // Add timeout controller (30s)
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch(space.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(space.payload(modelImageUrl, garmentImageUrl)),
                signal: controller.signal,
            });
            
            clearTimeout(timeout);

            if (!response.ok) {
                const errorText = await response.text();
                logger.warn(`Gradio space ${space.name} failed`, { status: response.status, error: errorText.substring(0, 200) });
                continue; // Try next space
            }

            const result = await response.json();
            
            // Gradio returns base64 encoded image or file path
            if (result.data && result.data[0]) {
                let imageData = result.data[0];
                
                // Handle different response formats
                if (typeof imageData === 'object' && imageData.path) {
                    // It's a file reference, fetch it
                    const fileResponse = await fetch(imageData.url || imageData.path);
                    if (fileResponse.ok) {
                        const arrayBuffer = await fileResponse.arrayBuffer();
                        logger.info(`Gradio space ${space.name} succeeded`);
                        return Buffer.from(arrayBuffer);
                    }
                } else if (typeof imageData === 'string') {
                    // It's base64 or a URL
                    if (imageData.startsWith('data:')) {
                        const base64Data = imageData.split(',')[1];
                        logger.info(`Gradio space ${space.name} succeeded`);
                        return Buffer.from(base64Data, 'base64');
                    } else if (imageData.startsWith('http')) {
                        const fileResponse = await fetch(imageData);
                        if (fileResponse.ok) {
                            const arrayBuffer = await fileResponse.arrayBuffer();
                            logger.info(`Gradio space ${space.name} succeeded`);
                            return Buffer.from(arrayBuffer);
                        }
                    } else {
                        // Assume it's raw base64
                        logger.info(`Gradio space ${space.name} succeeded`);
                        return Buffer.from(imageData, 'base64');
                    }
                }
            }
            
            logger.warn(`Gradio space ${space.name} returned unexpected format`);
        } catch (error: any) {
            logger.warn(`Gradio space ${space.name} error`, { error: error.message });
            continue; // Try next space
        }
    }

    logger.error('All Gradio spaces failed');
    return null;
}

/**
 * Upload result to cache
 */
async function cacheResult(
    supabase: SupabaseClient,
    cacheKey: string,
    imageBuffer: Buffer
): Promise<string | null> {
    try {
        const { error } = await supabase.storage
            .from(TRYON_CACHE_BUCKET)
            .upload(cacheKey, imageBuffer, {
                contentType: 'image/png',
                upsert: true,
            });

        if (error) {
            logger.error('Failed to cache try-on result', { error: error.message });
            return null;
        }

        const { data } = supabase.storage
            .from(TRYON_CACHE_BUCKET)
            .getPublicUrl(cacheKey);

        logger.info('Try-on result cached', { cacheKey });
        return data.publicUrl;
    } catch (error: any) {
        logger.error('Cache upload error', { error: error.message });
        return null;
    }
}

/**
 * Map clothing category to try-on category
 */
function mapCategoryToTryOnType(category: string, subcategory?: string): string {
    const lowerCat = (category || '').toLowerCase();
    const lowerSub = (subcategory || '').toLowerCase();
    
    const fullBody = ['dress', 'jumpsuit', 'romper', 'suit'];
    const lowerBody = ['pants', 'jeans', 'shorts', 'skirt', 'trousers'];
    
    if (fullBody.some(c => lowerCat.includes(c) || lowerSub.includes(c))) {
        return 'full_body';
    }
    
    if (lowerBody.some(c => lowerCat.includes(c) || lowerSub.includes(c))) {
        return 'lower_body';
    }
    
    return 'upper_body'; // Default to tops
}

/**
 * Main virtual try-on function
 */
export async function generateVirtualTryOn(
    supabase: SupabaseClient,
    request: TryOnRequest
): Promise<TryOnResult> {
    const { modelImageUrl, garmentImageUrl, category } = request;
    
    logger.info('Starting virtual try-on', { category });
    
    // Generate cache key
    const cacheKey = generateCacheKey(modelImageUrl, garmentImageUrl);
    
    // Check cache first
    const cachedUrl = await getCachedResult(supabase, cacheKey);
    if (cachedUrl) {
        return {
            success: true,
            imageUrl: cachedUrl,
            cached: true,
        };
    }
    
    // Try official Gradio client first (most reliable)
    let resultBuffer: Buffer | null = null;
    
    logger.info('Attempting virtual try-on via Gradio client');
    resultBuffer = await callGradioClientTryOn(modelImageUrl, garmentImageUrl);
    
    // Fallback to raw API calls if Gradio client fails
    if (!resultBuffer) {
        const tryOnCategory = mapCategoryToTryOnType(category);
        logger.info('Falling back to raw Gradio API');
        resultBuffer = await callHuggingFaceTryOn(modelImageUrl, garmentImageUrl, tryOnCategory);
    }
    
    // Final fallback to other Gradio spaces
    if (!resultBuffer) {
        logger.info('Falling back to alternative Gradio spaces');
        resultBuffer = await callGradioTryOn(modelImageUrl, garmentImageUrl);
    }
    
    // If we got a result, cache it
    if (resultBuffer) {
        const cachedUrl = await cacheResult(supabase, cacheKey, resultBuffer);
        
        if (cachedUrl) {
            return {
                success: true,
                imageUrl: cachedUrl,
                cached: false,
            };
        }
        
        // Return as base64 if caching failed
        return {
            success: true,
            imageUrl: `data:image/png;base64,${resultBuffer.toString('base64')}`,
            cached: false,
        };
    }
    
    // All methods failed
    return {
        success: false,
        error: 'Virtual try-on generation failed. Please try again later.',
        fallback: true,
    };
}

/**
 * Generate try-on for multiple garments (full outfit)
 */
export async function generateOutfitTryOn(
    supabase: SupabaseClient,
    modelImageUrl: string,
    garments: Array<{ url: string; category: string; subcategory?: string }>
): Promise<TryOnResult> {
    logger.info('Generating outfit try-on', { garmentCount: garments.length });
    
    // For full outfits, we process the most significant garment
    // Priority: full-body > tops > bottoms
    const sortedGarments = [...garments].sort((a, b) => {
        const priority: { [key: string]: number } = {
            'full_body': 3,
            'upper_body': 2,
            'lower_body': 1,
        };
        const aType = mapCategoryToTryOnType(a.category, a.subcategory);
        const bType = mapCategoryToTryOnType(b.category, b.subcategory);
        return (priority[bType] || 0) - (priority[aType] || 0);
    });
    
    // Generate with the primary garment
    const primaryGarment = sortedGarments[0];
    if (!primaryGarment) {
        return {
            success: false,
            error: 'No garments provided',
        };
    }
    
    return generateVirtualTryOn(supabase, {
        modelImageUrl,
        garmentImageUrl: primaryGarment.url,
        category: primaryGarment.category,
    });
}

export default {
    generateVirtualTryOn,
    generateOutfitTryOn,
};
