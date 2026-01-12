import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import express from 'express';

const router = Router();

// Webhook endpoint - MUST be before auth middleware and use raw body
// This route needs to be registered with raw body parser in index.ts
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    SubscriptionController.handleWebhook
);

// All other routes require authentication
router.use(authMiddleware);

// Get current subscription info
router.get('/', SubscriptionController.getSubscription);

// Check if user can add more items
router.get('/check-limit', SubscriptionController.checkItemLimit);

// Create checkout session for upgrade
router.post('/checkout', SubscriptionController.createCheckout);

// Create billing portal session
router.post('/billing-portal', SubscriptionController.createBillingPortal);

// Cancel subscription
router.post('/cancel', SubscriptionController.cancelSubscription);

// Resume canceled subscription
router.post('/resume', SubscriptionController.resumeSubscription);

export default router;
