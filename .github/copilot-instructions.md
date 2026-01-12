# Tidywaro AI Agent Instructions

## Project Overview
Tidywaro is a cross-platform wardrobe assistant built as a monorepo with Turborepo. Users digitize their closet, generate AI-powered weekly outfit plans, and manage their style across mobile and web platforms.

## Architecture & Data Flow

### Core Architecture
- **Monorepo Structure**: `apps/` (bff, mobile, web) + `packages/shared` managed by Turborepo
- **Authentication**: Supabase Auth with JWT tokens, RLS policies enforce user isolation
- **Data Layer**: PostgreSQL via Supabase with strict Row Level Security on all user data
- **AI Integration**: Google Gemini API via BFF for outfit planning

### Service Boundaries
```
Mobile/Web → BFF (Express) → Supabase/Gemini
```
- **BFF Pattern**: Express.js backend aggregates Supabase + AI services for clients
- **Scoped Supabase Clients**: Each authenticated request gets user-scoped client via `auth.middleware.ts`
- **Database Schema**: Core entities: `profiles`, `wardrobe_items`, `weekly_plans`, `daily_outfits`

## Development Workflows

### Environment Setup
```bash
# Root level - starts all services
npm run dev
# BFF: localhost:3000, Web: localhost:3001, Mobile: Expo Dev Client
```

### Mobile Environment Configuration
- **Required**: Copy `apps/mobile/.env.example` to `apps/mobile/.env`
- **Critical Variables**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`
- **Common Issue**: Missing env vars cause "Auth will not work" warnings
- **Type Safety**: SecureStore returns `string | null`, always check for boolean coercion

### Database Migrations
- Apply numbered SQL files (02_*, 03_*, etc.) to Supabase SQL Editor in sequence
- `supabase_schema.sql` contains the base profiles schema

### Authentication Pattern
```typescript
// BFF routes use authMiddleware which provides:
(req as AuthRequest).user      // Supabase User object
(req as AuthRequest).supabase  // User-scoped client for RLS
```

## Key Patterns & Conventions

### File Upload & Storage
- **Pattern**: Images upload to Supabase Storage with `processed_image` column for optimized versions
- **Bucket Config**: Public read access via RLS policies (see `06_make_bucket_public.sql`)

### AI Service Integration
```typescript
// AIService.generateWeeklyPlan() structure:
// 1. Fetch user wardrobe via scoped client
// 2. Construct structured prompt with JSON schema
// 3. Parse Gemini response into database schema
```

### Mobile Navigation
- **Auth Flow**: `SignInScreen` → `OnboardingScreen` → `MainTabNavigator`
- **State Management**: `AuthContext` manages session + onboarding status via SecureStore
- **Tab Structure**: Upload → Closet → Planner (core user journey)

### Turborepo Task Dependencies
```json
"build": {"dependsOn": ["^build"]}  // Shared packages build first
"dev": {"persistent": true}         // Long-running dev servers
```

## Critical Integration Points

### Cross-App API Communication
- Mobile/Web → BFF endpoints: `/wardrobe`, `/weekly-plans`, `/me` (health check)
- All requests require `Authorization: Bearer <token>` header

### Database Relationships
```sql
profiles (auth.users)
  ↓ 1:many
wardrobe_items (user's clothes)
  ↓ referenced by
daily_outfits.items (JSONB array of item IDs)
```

### Error Handling
- **Logger**: Winston-based structured logging in BFF (`utils/logger.ts`)
- **AI Failures**: Service throws descriptive errors, controller returns 400/500 appropriately

## File Naming & Structure Conventions
- **SQL Migrations**: Numbered prefix (e.g., `07_weekly_planner_schema.sql`)
- **Shared Types**: Minimal - main logic in each app (anti-pattern: over-sharing)
- **BFF Routes**: RESTful with resource-based routing (`wardrobe.routes.ts`, `planner.routes.ts`)

## Common Issues & Debugging

### Mobile Development
- **Boolean/String Type Errors**: Often caused by SecureStore string values in boolean contexts
- **Auth Failures**: Check `.env` file exists with correct `EXPO_PUBLIC_*` prefixes
- **Navigation Issues**: Ensure AuthContext state is properly typed (`boolean` not `boolean | null`)
- **Environment Loading**: May require `react-native-dotenv` plugin in `babel.config.js`
- **Android Config Issues**: `edgeToEdgeEnabled` and `predictiveBackGestureEnabled` can cause native type errors

### Environment Variable Debugging
- Use console logs to verify environment loading: `console.log('Env check:', !!process.env.EXPO_PUBLIC_SUPABASE_URL)`
- Expo requires `EXPO_PUBLIC_*` prefix for client-side variables
- Clear Metro cache with `npx expo start --clear` after environment changes

## When Modifying Code
- **New Features**: Add to BFF first, then client consumption
- **Schema Changes**: Create new numbered SQL file, update TypeScript interfaces
- **Mobile Screens**: Follow `Screen` suffix, integrate with `AppNavigator.tsx` tabs/stack
- **Authentication**: Always use scoped Supabase client pattern for RLS compliance
- **Environment Variables**: Mobile uses `EXPO_PUBLIC_*` prefix, BFF uses direct names