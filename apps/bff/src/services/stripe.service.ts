import Stripe from 'stripe';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
    logger.warn('STRIPE_SECRET_KEY not set - Payment features will be unavailable');
}

const stripe = stripeSecretKey 
    ? new Stripe(stripeSecretKey)
    : null;

// Subscription tier limits
export const SUBSCRIPTION_LIMITS = {
    free: 10,      // 10 items for free tier
    premium: -1,   // Unlimited (-1 means no limit)
};

// Price IDs from Stripe Dashboard (set these in your .env)
const STRIPE_PRICES = {
    premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '',
    premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || '',
};

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

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
    userId: string,
    email: string,
    name?: string
): Promise<string> {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

    if (subscription?.stripe_customer_id) {
        return subscription.stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
            supabase_user_id: userId,
        },
    });

    // Update subscription record with customer ID
    await supabase
        .from('user_subscriptions')
        .update({ stripe_customer_id: customer.id })
        .eq('user_id', userId);

    logger.info('Created Stripe customer', { userId, customerId: customer.id });
    return customer.id;
}

/**
 * Create a checkout session for subscription upgrade
 */
export async function createCheckoutSession(
    userId: string,
    email: string,
    priceType: 'monthly' | 'yearly' = 'monthly',
    successUrl: string,
    cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    const priceId = priceType === 'yearly' 
        ? STRIPE_PRICES.premium_yearly 
        : STRIPE_PRICES.premium_monthly;

    if (!priceId) {
        throw new Error(`Stripe price not configured for ${priceType}`);
    }

    const customerId = await getOrCreateStripeCustomer(userId, email);

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            user_id: userId,
        },
        subscription_data: {
            metadata: {
                user_id: userId,
            },
        },
    });

    logger.info('Created checkout session', { userId, sessionId: session.id, priceType });

    return {
        sessionId: session.id,
        url: session.url!,
    };
}

/**
 * Create a billing portal session for subscription management
 */
export async function createBillingPortalSession(
    userId: string,
    returnUrl: string
): Promise<{ url: string }> {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    // Get customer ID
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

    if (!subscription?.stripe_customer_id) {
        throw new Error('No Stripe customer found for user');
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl,
    });

    logger.info('Created billing portal session', { userId });

    return { url: session.url };
}

/**
 * Get user's subscription info
 */
export async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
    // Get subscription with usage from database function
    const { data, error } = await supabase
        .rpc('get_subscription_with_usage', { p_user_id: userId });

    if (error || !data || data.length === 0) {
        // Return default free tier if no subscription found
        logger.warn('No subscription found, returning default', { userId, error: error?.message });
        
        // Count current items
        const { count } = await supabase
            .from('wardrobe_items')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        const itemsUsed = count || 0;
        
        return {
            tier: 'free',
            status: 'active',
            itemLimit: SUBSCRIPTION_LIMITS.free,
            itemsUsed,
            canAddItems: itemsUsed < SUBSCRIPTION_LIMITS.free,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            stripeCustomerId: null,
        };
    }

    const sub = data[0];
    
    // Get Stripe customer ID separately
    const { data: subRecord } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

    return {
        tier: sub.tier,
        status: sub.status,
        itemLimit: sub.item_limit,
        itemsUsed: sub.items_used,
        canAddItems: sub.can_add_items,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        stripeCustomerId: subRecord?.stripe_customer_id || null,
    };
}

/**
 * Check if user can add more items
 */
export async function canUserAddItem(userId: string): Promise<{
    allowed: boolean;
    itemsUsed: number;
    itemLimit: number;
    tier: string;
}> {
    const info = await getSubscriptionInfo(userId);
    
    return {
        allowed: info.canAddItems,
        itemsUsed: info.itemsUsed,
        itemLimit: info.itemLimit,
        tier: info.tier,
    };
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(
    payload: Buffer,
    signature: string
): Promise<{ received: boolean; type?: string }> {
    if (!stripe || !stripeWebhookSecret) {
        throw new Error('Stripe webhook not configured');
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
    } catch (err: any) {
        logger.error('Webhook signature verification failed', { error: err.message });
        throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    logger.info('Processing Stripe webhook', { type: event.type, id: event.id });

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            await handleCheckoutCompleted(session);
            break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;
            await handleSubscriptionUpdated(subscription);
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            await handleSubscriptionDeleted(subscription);
            break;
        }

        case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice;
            await handlePaymentFailed(invoice);
            break;
        }

        default:
            logger.debug('Unhandled webhook event type', { type: event.type });
    }

    return { received: true, type: event.type };
}

/**
 * Handle checkout.session.completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.user_id;
    if (!userId) {
        logger.error('No user_id in checkout session metadata');
        return;
    }

    logger.info('Checkout completed', { userId, sessionId: session.id });
    
    // Subscription will be updated via subscription webhook
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.user_id;
    
    if (!userId) {
        // Try to get user from customer
        const customer = await stripe!.customers.retrieve(subscription.customer as string);
        if (customer.deleted) {
            logger.error('Customer deleted, cannot update subscription');
            return;
        }
        const userIdFromCustomer = (customer as Stripe.Customer).metadata?.supabase_user_id;
        if (!userIdFromCustomer) {
            logger.error('No user_id found in subscription or customer metadata');
            return;
        }
    }

    const finalUserId = userId || subscription.metadata?.user_id;
    
    // Map Stripe status to our status
    const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        trialing: 'trialing',
        incomplete: 'incomplete',
        incomplete_expired: 'canceled',
        unpaid: 'past_due',
        paused: 'canceled',
    };

    const status = statusMap[subscription.status] || 'active';
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';

    const { error } = await supabase
        .from('user_subscriptions')
        .update({
            tier: isActive ? 'premium' : 'free',
            status,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0]?.price.id,
            current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at 
                ? new Date(subscription.canceled_at * 1000).toISOString() 
                : null,
            item_limit: isActive ? SUBSCRIPTION_LIMITS.premium : SUBSCRIPTION_LIMITS.free,
        })
        .eq('user_id', finalUserId);

    if (error) {
        logger.error('Failed to update subscription', { error: error.message, userId: finalUserId });
    } else {
        logger.info('Subscription updated', { 
            userId: finalUserId, 
            tier: isActive ? 'premium' : 'free',
            status 
        });
    }
}

/**
 * Handle subscription deleted (canceled at period end)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // Get user from customer metadata
    const customer = await stripe!.customers.retrieve(subscription.customer as string);
    if (customer.deleted) {
        logger.error('Customer deleted');
        return;
    }

    const userId = (customer as Stripe.Customer).metadata?.supabase_user_id;
    if (!userId) {
        logger.error('No user_id found in customer metadata');
        return;
    }

    // Downgrade to free tier
    const { error } = await supabase
        .from('user_subscriptions')
        .update({
            tier: 'free',
            status: 'canceled',
            stripe_subscription_id: null,
            stripe_price_id: null,
            current_period_start: null,
            current_period_end: null,
            cancel_at_period_end: false,
            canceled_at: new Date().toISOString(),
            item_limit: SUBSCRIPTION_LIMITS.free,
        })
        .eq('user_id', userId);

    if (error) {
        logger.error('Failed to downgrade subscription', { error: error.message, userId });
    } else {
        logger.info('Subscription canceled, downgraded to free', { userId });
    }
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    
    const customer = await stripe!.customers.retrieve(customerId);
    if (customer.deleted) {
        return;
    }

    const userId = (customer as Stripe.Customer).metadata?.supabase_user_id;
    if (!userId) {
        return;
    }

    await supabase
        .from('user_subscriptions')
        .update({ status: 'past_due' })
        .eq('user_id', userId);

    logger.warn('Payment failed', { userId, invoiceId: invoice.id });
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(userId: string): Promise<void> {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .single();

    if (!subscription?.stripe_subscription_id) {
        throw new Error('No active subscription found');
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
    });

    await supabase
        .from('user_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('user_id', userId);

    logger.info('Subscription set to cancel at period end', { userId });
}

/**
 * Resume a canceled subscription
 */
export async function resumeSubscription(userId: string): Promise<void> {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .single();

    if (!subscription?.stripe_subscription_id) {
        throw new Error('No subscription found');
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: false,
    });

    await supabase
        .from('user_subscriptions')
        .update({ cancel_at_period_end: false })
        .eq('user_id', userId);

    logger.info('Subscription resumed', { userId });
}

export default {
    getOrCreateStripeCustomer,
    createCheckoutSession,
    createBillingPortalSession,
    getSubscriptionInfo,
    canUserAddItem,
    handleWebhookEvent,
    cancelSubscription,
    resumeSubscription,
    SUBSCRIPTION_LIMITS,
};
