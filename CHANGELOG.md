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

## [0.1.0] - 2025-11-21

### Added
- **Monorepo**: Initialized Turborepo with `apps/bff`, `apps/mobile`, `apps/web`, `packages/shared`.
- **BFF**: Express.js application with TypeScript.
    - `/health` endpoint.
    - `/me` endpoint with Supabase Auth Middleware.
- **Database**: `supabase_schema.sql` for `profiles` table and RLS.
- **Docs**: Initial `task.md`, `implementation_plan.md`, `walkthrough.md`.
