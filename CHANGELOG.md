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

### Added - Phase 3: Weekly Planner + AI Integration

- **Database**: `weekly_plans` and `daily_outfits` tables with RLS policies (`07_weekly_planner_schema.sql`)
- **BFF**: AI service using Gemini API (`gemini-3-pro-preview`) for outfit generation
- **BFF**: `POST /weekly-plans/generate` endpoint for creating weekly outfit plans
- **BFF**: `GET /weekly-plans/current` endpoint for fetching active plans
- **Mobile**: PlannerScreen with 7-day outfit view and generation UI
- **Mobile**: Planner tab in bottom navigation
- **Dependencies**: `@google/generative-ai` for BFF

### Changed - Phase 3

- Updated `apps/bff/.env.example` to include `GEMINI_API_KEY`
- Modified `AuthContext.tsx` to hardcode token for physical device testing (temporary)

### Known Issues - Phase 3

- Gemini API rate limiting with preview model (429 errors, 9-29s retry delays)

## [0.1.0] - 2025-11-21

### Added

- **Monorepo**: Initialized Turborepo with `apps/bff`, `apps/mobile`, `apps/web`, `packages/shared`.
- **BFF**: Express.js application with TypeScript.
  - `/health` endpoint.
  - `/me` endpoint with Supabase Auth Middleware.
- **Database**: `supabase_schema.sql` for `profiles` table and RLS.
- **Docs**: Initial `task.md`, `implementation_plan.md`, `walkthrough.md`.
