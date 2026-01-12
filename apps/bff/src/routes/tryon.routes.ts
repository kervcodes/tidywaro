import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { 
    generateTryOn, 
    generateOutfitTryOnController,
    getTryOnStatus,
    // New: User photos
    uploadUserPhoto,
    listUserPhotos,
    deleteUserPhoto,
    setDefaultPhoto,
    // New: Credits
    getCredits,
    // New: Jobs
    createTryOnJob,
    getJobStatus,
    listJobs,
} from '../controllers/tryon.controller';

const router = Router();

// Multer for file uploads (same pattern as wardrobe routes)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

// Check service status (public)
router.get('/status', getTryOnStatus);

// ============================================================================
// LEGACY ENDPOINTS (kept for backward compatibility)
// These do synchronous generation - may timeout for complex outfits
// ============================================================================

// Generate single garment try-on (protected)
router.post('/generate', authMiddleware, generateTryOn as any);

// Generate full outfit try-on (protected) - LEGACY, prefer /jobs for async
router.post('/outfit', authMiddleware, generateOutfitTryOnController as any);

// ============================================================================
// USER PHOTOS ENDPOINTS (NEW)
// Manage 1-3 full-body photos for try-on
// ============================================================================

// Upload a user photo
router.post('/photos', authMiddleware, upload.single('image') as any, uploadUserPhoto as any);

// List user's photos
router.get('/photos', authMiddleware, listUserPhotos as any);

// Delete a photo
router.delete('/photos/:id', authMiddleware, deleteUserPhoto as any);

// Set photo as default
router.put('/photos/:id/default', authMiddleware, setDefaultPhoto as any);

// ============================================================================
// CREDITS ENDPOINT (NEW)
// ============================================================================

// Get credit balance
router.get('/credits', authMiddleware, getCredits as any);

// ============================================================================
// JOBS ENDPOINTS (NEW)
// Async job queue for full-outfit try-on - RECOMMENDED over /outfit
// ============================================================================

// Create a try-on job
router.post('/jobs', authMiddleware, createTryOnJob as any);

// List user's jobs
router.get('/jobs', authMiddleware, listJobs as any);

// Get job status
router.get('/jobs/:id', authMiddleware, getJobStatus as any);

export default router;
