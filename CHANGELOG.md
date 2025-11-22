# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.1.0] - 2025-11-21

### Added
- **Monorepo**: Initialized Turborepo with `apps/bff`, `apps/mobile`, `apps/web`, `packages/shared`.
- **BFF**: Express.js application with TypeScript.
    - `/health` endpoint.
    - `/me` endpoint with Supabase Auth Middleware.
- **Database**: `supabase_schema.sql` for `profiles` table and RLS.
- **Docs**: Initial `task.md`, `implementation_plan.md`, `walkthrough.md`.
