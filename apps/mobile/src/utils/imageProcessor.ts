import * as ImageManipulator from 'expo-image-manipulator';
import { logger } from './logger';

/**
 * Image processing configuration
 */
const IMAGE_CONFIG = {
    // Target dimensions for uploads (maintains aspect ratio within these bounds)
    maxWidth: 1024,
    maxHeight: 1024,
    // Quality for JPEG compression (0-1)
    quality: 0.85,
    // Thumbnail dimensions for quick previews
    thumbnailSize: 256,
};

export interface ProcessedImage {
    uri: string;
    width: number;
    height: number;
    base64?: string;
}

/**
 * Resize an image to fit within max dimensions while preserving aspect ratio
 * This prevents images from being cropped during upload
 */
export async function resizeImage(
    uri: string,
    options?: {
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
        includeBase64?: boolean;
    }
): Promise<ProcessedImage> {
    const maxWidth = options?.maxWidth ?? IMAGE_CONFIG.maxWidth;
    const maxHeight = options?.maxHeight ?? IMAGE_CONFIG.maxHeight;
    const quality = options?.quality ?? IMAGE_CONFIG.quality;

    try {
        logger.debug('Resizing image', { maxWidth, maxHeight, quality });

        const result = await ImageManipulator.manipulateAsync(
            uri,
            [
                {
                    resize: {
                        width: maxWidth,
                        height: maxHeight,
                    },
                },
            ],
            {
                compress: quality,
                format: ImageManipulator.SaveFormat.JPEG,
                base64: options?.includeBase64,
            }
        );

        logger.debug('Image resized successfully', {
            width: result.width,
            height: result.height,
            hasBase64: !!result.base64,
        });

        return {
            uri: result.uri,
            width: result.width,
            height: result.height,
            base64: result.base64,
        };
    } catch (error: any) {
        logger.error('Failed to resize image', { error: error.message });
        throw error;
    }
}

/**
 * Process image for upload - resizes and optimizes for wardrobe storage
 * This is the main function to use before uploading
 */
export async function processImageForUpload(uri: string): Promise<ProcessedImage> {
    logger.info('Processing image for upload');
    
    return resizeImage(uri, {
        maxWidth: IMAGE_CONFIG.maxWidth,
        maxHeight: IMAGE_CONFIG.maxHeight,
        quality: IMAGE_CONFIG.quality,
        includeBase64: false,
    });
}

/**
 * Process multiple images for bulk upload
 */
export async function processImagesForUpload(uris: string[]): Promise<ProcessedImage[]> {
    logger.info('Processing multiple images for upload', { count: uris.length });
    
    const results: ProcessedImage[] = [];
    
    for (const uri of uris) {
        try {
            const processed = await processImageForUpload(uri);
            results.push(processed);
        } catch (error: any) {
            logger.error('Failed to process image in batch', { error: error.message });
            // Continue with other images even if one fails
        }
    }
    
    return results;
}

/**
 * Create a thumbnail for quick preview
 */
export async function createThumbnail(uri: string): Promise<ProcessedImage> {
    return resizeImage(uri, {
        maxWidth: IMAGE_CONFIG.thumbnailSize,
        maxHeight: IMAGE_CONFIG.thumbnailSize,
        quality: 0.7,
    });
}

/**
 * Get image dimensions without modifying the image
 */
export async function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
    try {
        // Use a no-op manipulation to get dimensions
        const result = await ImageManipulator.manipulateAsync(uri, [], {
            format: ImageManipulator.SaveFormat.JPEG,
        });
        
        return {
            width: result.width,
            height: result.height,
        };
    } catch (error: any) {
        logger.error('Failed to get image dimensions', { error: error.message });
        throw error;
    }
}

export default {
    resizeImage,
    processImageForUpload,
    processImagesForUpload,
    createThumbnail,
    getImageDimensions,
    IMAGE_CONFIG,
};
