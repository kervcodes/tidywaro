import sharp from 'sharp';
import { removeBackground } from '@imgly/background-removal-node';
import logger from '../utils/logger';

/**
 * App theme colors - matching mobile theme.ts
 */
const THEME_COLORS = {
    // Background gradients
    backgroundPrimary: '#FFFFFF',
    backgroundSecondary: '#FAFAF9',
    backgroundTertiary: '#F5F5F4',
    // Neutral warm gray
    neutral100: '#F5F5F4',
    neutral50: '#FAFAF9',
};

/**
 * Image processing configuration
 */
const IMAGE_CONFIG = {
    // Target dimensions for stored images
    maxWidth: 1024,
    maxHeight: 1024,
    // Quality for JPEG (0-100 for sharp)
    jpegQuality: 85,
    // Quality for WebP
    webpQuality: 85,
    // Processed image dimensions (smaller for faster loading)
    processedWidth: 512,
    processedHeight: 512,
    // Thumbnail dimensions
    thumbnailWidth: 256,
    thumbnailHeight: 256,
    // Background color for processed images (matches app theme)
    backgroundColor: THEME_COLORS.neutral50,
};

export interface ProcessedImageResult {
    originalBuffer: Buffer;
    processedBuffer: Buffer;
    thumbnailBuffer?: Buffer;
    width: number;
    height: number;
    format: string;
    backgroundRemoved: boolean;
}

/**
 * Resize an image to fit within max dimensions while preserving aspect ratio
 */
export async function resizeImage(
    buffer: Buffer,
    maxWidth: number = IMAGE_CONFIG.maxWidth,
    maxHeight: number = IMAGE_CONFIG.maxHeight,
    quality: number = IMAGE_CONFIG.jpegQuality
): Promise<Buffer> {
    try {
        const result = await sharp(buffer)
            .resize(maxWidth, maxHeight, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .jpeg({ quality })
            .toBuffer();
        
        logger.debug('Image resized', { maxWidth, maxHeight });
        return result;
    } catch (error: any) {
        logger.error('Failed to resize image', { error: error.message });
        throw error;
    }
}

/**
 * Remove background from clothing image and replace with themed background
 * Returns image with solid themed background color
 */
export async function removeImageBackground(
    buffer: Buffer,
    backgroundColor: string = IMAGE_CONFIG.backgroundColor
): Promise<Buffer> {
    try {
        logger.info('Starting background removal', { backgroundColor });
        const startTime = Date.now();
        
        // Convert buffer to Uint8Array for the library
        const uint8Array = new Uint8Array(buffer);
        const blob = new Blob([uint8Array], { type: 'image/png' });
        
        // Remove background - returns transparent PNG
        logger.info('Calling removeBackground library...');
        const resultBlob = await removeBackground(blob, {
            model: 'medium', // 'medium' is more accurate for clothing
            output: {
                format: 'image/png',
                quality: 0.95,
            },
        });
        
        // Convert blob back to buffer
        const arrayBuffer = await resultBlob.arrayBuffer();
        const transparentBuffer = Buffer.from(arrayBuffer);
        
        logger.info('Background removed, adding themed background color');
        
        // Get image dimensions
        const metadata = await sharp(transparentBuffer).metadata();
        const width = metadata.width || IMAGE_CONFIG.processedWidth;
        const height = metadata.height || IMAGE_CONFIG.processedHeight;
        
        // Create a solid color background and composite the transparent image on top
        const resultBuffer = await sharp({
            create: {
                width,
                height,
                channels: 3,
                background: backgroundColor,
            },
        })
            .composite([{
                input: transparentBuffer,
                gravity: 'centre',
            }])
            .jpeg({ quality: IMAGE_CONFIG.jpegQuality })
            .toBuffer();
        
        const duration = Date.now() - startTime;
        logger.info('Background replaced successfully', { 
            duration: `${duration}ms`,
            backgroundColor,
            dimensions: `${width}x${height}`,
        });
        
        return resultBuffer;
    } catch (error: any) {
        logger.error('Background removal failed', { error: error.message, stack: error.stack });
        throw error;
    }
}

/**
 * Create a processed version of the image (resized, optimized)
 */
export async function createProcessedImage(
    buffer: Buffer,
    width: number = IMAGE_CONFIG.processedWidth,
    height: number = IMAGE_CONFIG.processedHeight
): Promise<Buffer> {
    try {
        return await sharp(buffer)
            .resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .jpeg({ quality: IMAGE_CONFIG.jpegQuality })
            .toBuffer();
    } catch (error: any) {
        logger.error('Failed to create processed image', { error: error.message });
        throw error;
    }
}

/**
 * Create a thumbnail of the image
 */
export async function createThumbnail(
    buffer: Buffer,
    width: number = IMAGE_CONFIG.thumbnailWidth,
    height: number = IMAGE_CONFIG.thumbnailHeight
): Promise<Buffer> {
    try {
        return await sharp(buffer)
            .resize(width, height, {
                fit: 'cover',
                position: 'centre',
            })
            .jpeg({ quality: 75 })
            .toBuffer();
    } catch (error: any) {
        logger.error('Failed to create thumbnail', { error: error.message });
        throw error;
    }
}

/**
 * Get image metadata (dimensions, format, etc.)
 */
export async function getImageMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
}> {
    const metadata = await sharp(buffer).metadata();
    return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
    };
}

/**
 * Full image processing pipeline for wardrobe uploads:
 * 1. Resize to max dimensions
 * 2. Remove background
 * 3. Create processed version
 * 4. Optionally create thumbnail
 */
export async function processWardrobeImage(
    buffer: Buffer,
    options?: {
        removeBackground?: boolean;
        createThumbnail?: boolean;
    }
): Promise<ProcessedImageResult> {
    const shouldRemoveBg = options?.removeBackground ?? true;
    const shouldCreateThumb = options?.createThumbnail ?? false;
    
    logger.info('Starting wardrobe image processing', { 
        removeBackground: shouldRemoveBg,
        createThumbnail: shouldCreateThumb 
    });
    
    try {
        // 1. First, resize the original to reasonable dimensions
        const resizedBuffer = await resizeImage(buffer);
        const metadata = await getImageMetadata(resizedBuffer);
        
        let processedBuffer: Buffer;
        let backgroundRemoved = false;
        
        // 2. Remove background if requested
        if (shouldRemoveBg) {
            try {
                const noBgBuffer = await removeImageBackground(resizedBuffer);
                processedBuffer = await createProcessedImage(noBgBuffer);
                backgroundRemoved = true;
            } catch (bgError) {
                logger.warn('Background removal failed, using original', { 
                    error: (bgError as Error).message 
                });
                processedBuffer = await createProcessedImage(resizedBuffer);
            }
        } else {
            processedBuffer = await createProcessedImage(resizedBuffer);
        }
        
        // 3. Create thumbnail if requested
        let thumbnailBuffer: Buffer | undefined;
        if (shouldCreateThumb) {
            thumbnailBuffer = await createThumbnail(processedBuffer);
        }
        
        logger.info('Wardrobe image processing complete', {
            width: metadata.width,
            height: metadata.height,
            backgroundRemoved,
        });
        
        return {
            originalBuffer: resizedBuffer,
            processedBuffer,
            thumbnailBuffer,
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            backgroundRemoved,
        };
    } catch (error: any) {
        logger.error('Wardrobe image processing failed', { error: error.message });
        throw error;
    }
}

export default {
    resizeImage,
    removeImageBackground,
    createProcessedImage,
    createThumbnail,
    getImageMetadata,
    processWardrobeImage,
    IMAGE_CONFIG,
};
