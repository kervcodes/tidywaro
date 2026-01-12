import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import stripeService from '../services/stripe.service';
import logger from '../utils/logger';
import { BadRequestError } from '../utils/errors';

export class SubscriptionController {
    /**
     * Get current user's subscription info
     */
    static async getSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).user.id;

            const subscription = await stripeService.getSubscriptionInfo(userId);

            logger.info('Fetched subscription info', { 
                userId, 
                tier: subscription.tier,
                itemsUsed: subscription.itemsUsed,
                itemLimit: subscription.itemLimit,
            });

            res.json(subscription);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Check if user can add more items
     */
    static async checkItemLimit(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).user.id;

            const result = await stripeService.canUserAddItem(userId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create checkout session for subscription upgrade
     */
    static async createCheckout(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).user.id;
            const userEmail = (req as AuthRequest).user.email;
            const { priceType = 'monthly', successUrl, cancelUrl } = req.body;

            if (!userEmail) {
                throw new BadRequestError('User email is required');
            }

            if (!successUrl || !cancelUrl) {
                throw new BadRequestError('successUrl and cancelUrl are required');
            }

            if (priceType !== 'monthly' && priceType !== 'yearly') {
                throw new BadRequestError('priceType must be "monthly" or "yearly"');
            }

            const session = await stripeService.createCheckoutSession(
                userId,
                userEmail,
                priceType,
                successUrl,
                cancelUrl
            );

            logger.info('Created checkout session', { 
                userId, 
                priceType,
                sessionId: session.sessionId,
            });

            res.json(session);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create billing portal session for subscription management
     */
    static async createBillingPortal(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).user.id;
            const { returnUrl } = req.body;

            if (!returnUrl) {
                throw new BadRequestError('returnUrl is required');
            }

            const session = await stripeService.createBillingPortalSession(
                userId,
                returnUrl
            );

            logger.info('Created billing portal session', { userId });

            res.json(session);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel subscription at period end
     */
    static async cancelSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).user.id;

            await stripeService.cancelSubscription(userId);

            logger.info('Subscription canceled', { userId });

            res.json({ success: true, message: 'Subscription will be canceled at period end' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Resume a canceled subscription
     */
    static async resumeSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).user.id;

            await stripeService.resumeSubscription(userId);

            logger.info('Subscription resumed', { userId });

            res.json({ success: true, message: 'Subscription resumed' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle Stripe webhooks
     * Note: This endpoint should NOT use authMiddleware
     */
    static async handleWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const signature = req.headers['stripe-signature'] as string;

            if (!signature) {
                throw new BadRequestError('Missing stripe-signature header');
            }

            const result = await stripeService.handleWebhookEvent(
                req.body, // Raw body buffer
                signature
            );

            logger.info('Webhook processed', { type: result.type });

            res.json({ received: true });
        } catch (error: any) {
            logger.error('Webhook error', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    }
}
