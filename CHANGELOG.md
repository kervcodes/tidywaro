# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **BFF**: `POST /wardrobe/items` endpoint for uploading images.
- **BFF**: `GET /wardrobe/items` endpoint for listing items.
- **BFF**: `WardrobeItem` interface.
- **Storage**: RLS policies for `wardrobe-items` bucket (`03_storage_policy.sql`).
- **Database**: `wardrobe_items` table SQL (`02_wardrobe_items.sql`).
- **Database**: `processed_image_url` column (`04_add_processed_image.sql`).
- **BFF**: Background removal logic (Mock implementation).
- **BFF**: Structured logging with `winston`.
- **Mobile**: Image upload flow with `expo-image-picker`.
- **Mobile**: Closet grid view with pull-to-refresh.
- **Mobile**: Simple tab navigation.

### Added - Phase 5: Subscriptions & Try-On

- **Database**: Subscriptions schema (`10_subscriptions_schema.sql`)
- **Database**: Try-on cache bucket (`09_tryon_cache_bucket.sql`)
- **BFF**: Stripe integration for subscription management (`stripe.service.ts`)
- **BFF**: Try-on service for virtual outfit preview (`tryon.service.ts`)
- **BFF**: Subscription routes (`/subscription/*`)
- **BFF**: Try-on routes (`/tryon/*`)
- **Mobile**: UpgradeScreen for premium subscriptions
- **Mobile**: TryOnScreen for virtual outfit preview
- **Mobile**: SubscriptionContext for managing user subscription state

### Added - Phase 4: AI Enhancements

- **Database**: Extended wardrobe item AI attributes (`08_wardrobe_items_ai_attributes.sql`)
- **BFF**: Enhanced AI analysis with detailed clothing attributes (subcategory, pattern, material, season, occasions)
- **BFF**: Automatic retry with exponential backoff for AI rate limits
- **BFF**: 30-second timeout for AI analysis to prevent hanging
- **Mobile**: ItemDetailScreen with full AI analysis display
- **Mobile**: StyleAIScreen for AI-powered styling suggestions
- **Mobile**: ModelSelectionScreen for try-on model selection

### Added - Phase 3: Weekly Planner + AI Integration

- **Database**: `weekly_plans` and `daily_outfits` tables with RLS policies (`07_weekly_planner_schema.sql`)
- **BFF**: AI service using Google Gemini 2.0 Flash for clothing analysis and outfit generation
- **BFF**: `POST /weekly-plans/generate` endpoint for creating weekly outfit plans
- **BFF**: `GET /weekly-plans/current` endpoint for fetching active plans
- **Mobile**: PlannerScreen with 7-day outfit view and generation UI
- **Mobile**: Planner tab in bottom navigation
- **Dependencies**: `@google/generative-ai` for BFF

### Changed - Phase 3

- Updated `apps/bff/.env.example` to include `GEMINI_API_KEY`
- Modified `AuthContext.tsx` to hardcode token for physical device testing (temporary)

### Fixed

- **AI Analysis**: Fixed issue where missing `GEMINI_API_KEY` caused all items to be categorized as "uncategorized"
- Added clear warning log when `GEMINI_API_KEY` is not configured

### Known Issues

- Gemini API rate limiting may cause temporary 429 errors (automatic retry with exponential backoff handles this)

## [0.1.0] - 2025-11-21

### Added

- **Monorepo**: Initialized Turborepo with `apps/bff`, `apps/mobile`, `apps/web`, `packages/shared`.
- **BFF**: Express.js application with TypeScript.
  - `/health` endpoint.
  - `/me` endpoint with Supabase Auth Middleware.
- **Database**: `supabase_schema.sql` for `profiles` table and RLS.
- **Docs**: Initial `task.md`, `implementation_plan.md`, `walkthrough.md`.
