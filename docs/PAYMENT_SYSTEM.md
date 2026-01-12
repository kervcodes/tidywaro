# Payment & Subscription System

This document describes Tidywaro's payment and subscription system powered by Stripe.

> ⚠️ **Status: Work in Progress**
> 
> The payment system is partially implemented. See the [Implementation Status](#implementation-status) section for details on what's complete and what's pending.

---

## Overview

Tidywaro uses a freemium model with two subscription tiers:

| Tier | Price | Item Limit | Features |
|------|-------|------------|----------|
| **Free** | $0 | 10 items | Basic wardrobe management, AI analysis |
| **Premium** | $4.99/month or $39.99/year | Unlimited | All features + Virtual Try-On + Advanced Planning |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │      BFF        │     │     Stripe      │
│                 │     │                 │     │                 │
│  UpgradeScreen  │────►│ Subscription    │────►│  Checkout API   │
│  Subscription   │     │ Controller      │     │  Customer API   │
│  Context        │◄────│                 │◄────│  Webhooks       │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    Supabase     │
                        │                 │
                        │ user_subscriptions│
                        │ (with RLS)       │
                        └─────────────────┘
```

---

## Subscription Tiers

### Free Tier
- **Item Limit**: 10 wardrobe items
- **AI Analysis**: ✅ Full access
- **Weekly Planning**: ✅ Basic planning
- **Virtual Try-On**: ❌ Not available
- **Created automatically** when user signs up

### Premium Tier
- **Item Limit**: Unlimited (-1 in database)
- **AI Analysis**: ✅ Full access
- **Weekly Planning**: ✅ Advanced planning
- **Virtual Try-On**: ✅ Full access
- **Pricing**:
  - Monthly: $4.99/month
  - Yearly: $39.99/year (33% savings)

---

## Database Schema

### `user_subscriptions` Table

```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Subscription info
    tier subscription_tier NOT NULL DEFAULT 'free',  -- 'free' | 'premium'
    status subscription_status NOT NULL DEFAULT 'active',  -- 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
    
    -- Stripe references
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    
    -- Billing period
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    
    -- Limits
    item_limit INTEGER NOT NULL DEFAULT 10,
    
    -- Timestamps
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    
    CONSTRAINT unique_user_subscription UNIQUE (user_id)
);
```

### Database Functions

| Function | Description |
|----------|-------------|
| `can_add_wardrobe_item(user_id)` | Returns `BOOLEAN` - checks if user can add more items |
| `get_subscription_with_usage(user_id)` | Returns subscription info with current item count |
| `create_free_subscription()` | Trigger function - auto-creates free tier on signup |

### Row Level Security

- Users can only view their own subscription
- Users can insert their own subscription (initial creation)
- Only service role can update subscriptions (via webhooks)

---

## API Endpoints

### Get Subscription Info

```
GET /subscription
Authorization: Bearer <token>
```

**Response:**
```json
{
    "tier": "free",
    "status": "active",
    "itemLimit": 10,
    "itemsUsed": 5,
    "canAddItems": true,
    "currentPeriodEnd": null,
    "cancelAtPeriodEnd": false,
    "stripeCustomerId": null
}
```

### Check Item Limit

```
GET /subscription/check-limit
Authorization: Bearer <token>
```

**Response:**
```json
{
    "allowed": true,
    "itemsUsed": 5,
    "itemLimit": 10,
    "tier": "free"
}
```

### Create Checkout Session

```
POST /subscription/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
    "priceType": "monthly",  // or "yearly"
    "successUrl": "https://app.tidywaro.com/upgrade/success",
    "cancelUrl": "https://app.tidywaro.com/upgrade"
}
```

**Response:**
```json
{
    "sessionId": "cs_xxx",
    "url": "https://checkout.stripe.com/..."
}
```

### Create Billing Portal Session

```
POST /subscription/billing-portal
Authorization: Bearer <token>
Content-Type: application/json

{
    "returnUrl": "https://app.tidywaro.com/settings"
}
```

**Response:**
```json
{
    "url": "https://billing.stripe.com/..."
}
```

### Cancel Subscription

```
POST /subscription/cancel
Authorization: Bearer <token>
```

**Response:**
```json
{
    "success": true,
    "message": "Subscription will be canceled at period end"
}
```

### Resume Subscription

```
POST /subscription/resume
Authorization: Bearer <token>
```

**Response:**
```json
{
    "success": true,
    "message": "Subscription resumed"
}
```

### Webhook (Stripe → BFF)

```
POST /subscription/webhook
Content-Type: application/json
stripe-signature: <signature>
```

Handled events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## Stripe Integration

### Environment Variables

```env
# Required for payment features
STRIPE_SECRET_KEY=sk_test_xxx          # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_xxx        # Webhook signing secret

# Price IDs from Stripe Dashboard
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxx  # Monthly plan price ID
STRIPE_PRICE_PREMIUM_YEARLY=price_xxx   # Yearly plan price ID
```

### Setting Up Stripe

1. **Create Stripe Account**: https://dashboard.stripe.com

2. **Create Products & Prices**:
   - Product: "Tidywaro Premium"
   - Price 1: $4.99/month (recurring)
   - Price 2: $39.99/year (recurring)

3. **Get API Keys**:
   - Dashboard → Developers → API Keys
   - Copy Secret Key to `STRIPE_SECRET_KEY`

4. **Configure Webhook**:
   - Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-bff-url.com/subscription/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy Signing Secret to `STRIPE_WEBHOOK_SECRET`

5. **Configure Customer Portal**:
   - Dashboard → Settings → Billing → Customer Portal
   - Enable features: Update payment method, Cancel subscription

---

## Mobile Integration

### SubscriptionContext

The mobile app uses a React Context to manage subscription state:

```tsx
const { 
    subscription,      // Current subscription info
    isPremium,         // Boolean: is premium tier
    canAddItems,       // Boolean: can add more items
    itemsRemaining,    // Number: items left (Infinity for premium)
    
    refreshSubscription,  // Refresh from server
    checkCanAddItem,      // Quick limit check
    upgradeToPremium,     // Open Stripe checkout
    openBillingPortal,    // Open Stripe billing portal
    cancelSubscription,   // Cancel at period end
    resumeSubscription,   // Resume canceled subscription
} = useSubscription();
```

### UpgradeScreen

The upgrade screen shows:
- Current usage (items used / limit)
- Premium features list
- Price options (monthly/yearly toggle)
- Upgrade button → Opens Stripe Checkout

### Enforcing Limits

Before uploading an item, the app checks limits:

```tsx
// In wardrobe controller
const limitCheck = await stripeService.canUserAddItem(userId);
if (!limitCheck.allowed) {
    throw new SubscriptionLimitError(limitCheck.itemsUsed, limitCheck.itemLimit);
}
```

---

## Subscription Lifecycle

### New User Signup

```
1. User signs up via Supabase Auth
2. Database trigger fires: create_free_subscription()
3. user_subscriptions row created with tier='free', item_limit=10
```

### Upgrade to Premium

```
1. User taps "Upgrade" in app
2. App calls POST /subscription/checkout
3. BFF creates Stripe customer (if needed)
4. BFF creates Checkout Session
5. App opens Stripe Checkout URL
6. User completes payment
7. Stripe fires checkout.session.completed webhook
8. Stripe fires customer.subscription.created webhook
9. BFF updates user_subscriptions: tier='premium', item_limit=-1
```

### Subscription Renewal

```
1. Stripe automatically charges card
2. Stripe fires customer.subscription.updated webhook
3. BFF updates current_period_start and current_period_end
```

### Cancel Subscription

```
1. User requests cancellation
2. App calls POST /subscription/cancel
3. BFF sets cancel_at_period_end=true on Stripe
4. User retains premium until period end
5. At period end, Stripe fires customer.subscription.deleted
6. BFF downgrades to free tier
```

### Payment Failed

```
1. Stripe attempts charge, fails
2. Stripe fires invoice.payment_failed webhook
3. BFF sets status='past_due'
4. Stripe retries per retry schedule
5. If all retries fail, subscription canceled
```

---

## Implementation Status

### ✅ Completed

- [x] Database schema (`10_subscriptions_schema.sql`)
- [x] Stripe service (`stripe.service.ts`)
- [x] Subscription controller (`subscription.controller.ts`)
- [x] API routes (`subscription.routes.ts`)
- [x] SubscriptionContext for mobile
- [x] UpgradeScreen UI
- [x] Item limit enforcement in upload
- [x] Webhook handlers for subscription events
- [x] Checkout session creation
- [x] Billing portal integration
- [x] Cancel/Resume subscription

### 🚧 In Progress / Pending

- [ ] **Stripe Price IDs**: Need to create products in Stripe Dashboard and add price IDs to `.env`
- [ ] **Webhook URL**: Need to configure production webhook URL in Stripe
- [ ] **Deep Linking**: Handle return from Stripe Checkout back to app
- [ ] **Success/Cancel Screens**: Create screens for post-checkout redirect
- [ ] **Email Notifications**: Configure Stripe emails for receipts, failed payments
- [ ] **Testing**: End-to-end testing with Stripe test mode
- [ ] **Apple/Google Pay**: Add as payment methods in Stripe Checkout
- [ ] **In-App Purchases**: Consider native iOS/Android IAP for App Store compliance
- [ ] **Trial Period**: Implement free trial for new users
- [ ] **Promo Codes**: Add support for discount codes
- [ ] **Analytics**: Track conversion funnel, churn, MRR

### ⚠️ Known Issues

1. **Stripe not configured warning**: If `STRIPE_SECRET_KEY` is not set, payment features return errors
2. **Webhook requires raw body**: The webhook endpoint must receive raw body, not JSON-parsed
3. **Mobile deep linking**: Returning from Stripe Checkout to app needs implementation

---

## Testing

### Test Mode

Use Stripe test mode for development:
- Test card: `4242 4242 4242 4242`
- Any future expiry, any CVC, any ZIP

### Test Scenarios

1. **New user gets free tier**: Sign up → Check subscription shows free tier
2. **Upgrade to premium**: Free user → Checkout → Premium tier
3. **Item limit enforcement**: Free user at 10 items → Upload blocked
4. **Premium unlimited**: Premium user → Can upload unlimited items
5. **Cancel subscription**: Premium → Cancel → Still premium until period end
6. **Resume subscription**: Canceled → Resume → Stays premium
7. **Payment failed**: Simulate failed payment → Status becomes past_due

### Stripe CLI for Local Webhooks

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/subscription/webhook

# Copy the webhook signing secret to .env
# STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## Security Considerations

1. **Webhook Signature Verification**: Always verify webhook signatures
2. **Server-Side Validation**: Never trust client-side subscription status
3. **RLS Enforcement**: Subscriptions protected by Row Level Security
4. **Customer ID Protection**: Stripe customer IDs stored server-side only
5. **No Card Data**: Tidywaro never handles raw card data (Stripe manages this)

---

## Troubleshooting

### "Stripe is not configured"

- Check `STRIPE_SECRET_KEY` is set in `.env`
- Restart BFF after adding environment variable

### Webhook Not Updating Subscription

- Verify webhook signing secret matches
- Check webhook endpoint is accessible
- Review BFF logs for webhook errors
- Ensure raw body parser is used for webhook route

### User Stuck on Free After Payment

- Check Stripe Dashboard for subscription status
- Verify `user_id` is in subscription metadata
- Check webhook logs in Stripe Dashboard
- Manually sync: update `user_subscriptions` table

### Item Limit Not Enforced

- Check `can_add_wardrobe_item()` function exists
- Verify subscription record exists for user
- Check wardrobe controller calls `canUserAddItem()`
