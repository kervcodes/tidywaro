# Tidywaro Architecture

This document describes the high-level architecture and design decisions of Tidywaro.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Clients                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │  Mobile App  │    │   Web App    │    │   Future     │          │
│  │   (Expo)     │    │  (Next.js)   │    │   Clients    │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
└─────────┼───────────────────┼───────────────────┼──────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend for Frontend (BFF)                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Express.js Server                         │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │  │
│  │  │  Auth   │  │ Request │  │  Error  │  │    Routes &     │  │  │
│  │  │Middleware│  │ Logger  │  │ Handler │  │   Controllers   │  │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘  │  │
│  │                                              │                │  │
│  │  ┌───────────────────────────────────────────▼────────────┐  │  │
│  │  │                   AI Service                            │  │  │
│  │  │          (Google Gemini Integration)                    │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────┐    ┌─────────────────────────────────────────┐
│   Google Gemini     │    │              Supabase                    │
│   (AI Analysis)     │    │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│                     │    │  │  Auth   │ │ Database│ │ Storage │   │
└─────────────────────┘    │  │         │ │(Postgres)│ │ (Files) │   │
                           │  └─────────┘ └─────────┘ └─────────┘   │
                           └─────────────────────────────────────────┘
```

## Component Details

### Mobile App (Expo/React Native)

**Purpose**: Native mobile experience for iOS and Android

**Key Technologies**:
- Expo SDK 54
- React Navigation 7
- Supabase Auth (direct)
- Axios for API calls

**Architecture**:
```
src/
├── components/     # Reusable UI (Button, Card, Header, ErrorBoundary)
├── contexts/       # React Context (AuthContext)
├── navigation/     # Stack/Tab navigators
├── screens/        # Feature screens
├── services/       # API client, Supabase client
├── styles/         # Theme, colors, typography
└── utils/          # Logger, animations, helpers
```

**Data Flow**:
1. User authenticates directly with Supabase
2. JWT token is stored securely (expo-secure-store)
3. All API calls go through BFF with token in headers
4. BFF validates token and applies Row Level Security

### Web App (Next.js)

**Purpose**: Web-based access to wardrobe management

**Key Technologies**:
- Next.js 15 (App Router)
- React 19
- Tailwind CSS

**Status**: Basic scaffolding in place, features TBD

### Backend for Frontend (BFF)

**Purpose**: API gateway that orchestrates Supabase and AI services

**Key Technologies**:
- Express.js
- TypeScript
- Multer (file uploads)
- Winston (logging)

**Why BFF?**
1. **Security**: Keeps service keys server-side
2. **Orchestration**: Combines Supabase + AI in single endpoints
3. **Flexibility**: Easy to swap AI providers
4. **Caching**: Can add response caching layer
5. **Validation**: Centralized input validation

**Request Flow**:
```
Request → Auth Middleware → Request Logger → Controller → Service → Response
                                                    │
                                        Error Middleware (if error)
```

### AI Service (Google Gemini)

**Purpose**: Analyze clothing images to extract attributes

**Model**: Gemini 2.0 Flash (Vision)

**Capabilities**:
- Category detection (tops, bottoms, suits, outerwear, dresses, shoes, accessories, activewear, swimwear, loungewear, sleepwear, jumpsuits, formal wear, bags, underwear, etc.)
- Subcategory identification (t-shirt, jeans, blazer, sneakers, etc.)
- Color identification (primary color with nuance like "navy blue", "charcoal gray")
- Style classification (casual, formal, business casual, sporty, bohemian, streetwear, classic, minimalist, vintage, smart casual, preppy, edgy)
- Pattern recognition (solid, striped, plaid, floral, geometric, abstract, animal print, polka dot, pinstripe, herringbone, houndstooth, camo, tie-dye)
- Material estimation (cotton, denim, leather, wool, silk, polyester, linen, suede, canvas, knit, tweed, velvet, cashmere, nylon, fleece)
- Season suitability (spring, summer, fall, winter)
- Occasion suggestions (everyday, work, formal, business, party, sport, outdoor, date night, vacation, wedding, interview, gym, beach, home)
- Confidence score (0.0 to 1.0)

**Error Handling**:
- Automatic retry with exponential backoff (3 attempts max)
- Rate limit detection (429 errors) and appropriate error responses
- 30-second timeout to prevent hanging requests
- Fallback to default values (category: "uncategorized") when AI is unavailable

**Configuration**:
- Requires `GEMINI_API_KEY` environment variable
- Without valid API key, all items default to "uncategorized"
- Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Supabase

**Purpose**: Managed backend services

**Components Used**:
- **Auth**: Email/password authentication
- **Database**: PostgreSQL with Row Level Security
- **Storage**: Image file storage with CDN

**Security Model**:
- All tables have RLS policies
- Users can only access their own data
- Service role used in BFF for elevated operations

---

## Data Model

### Core Entities

```
┌─────────────────┐       ┌─────────────────────────────────────┐
│     Profile     │       │           Wardrobe Item              │
├─────────────────┤       ├─────────────────────────────────────┤
│ id (FK auth)    │───┐   │ id (PK)                             │
│ created_at      │   │   │ user_id (FK profiles)               │
│ updated_at      │   │   │ category                            │
└─────────────────┘   │   │ subcategory                         │
                      │   │ color                                │
                      │   │ style                                │
                      │   │ pattern                              │
                      │   │ material                             │
                      │   │ season[] (array)                     │
                      │   │ occasions[] (array)                  │
                      │   │ brand                                │
                      │   │ ai_description                       │
                      │   │ ai_confidence                        │
                      │   │ image_url                            │
                      │   │ processed_image_url                  │
                      └───│ created_at                           │
                          └─────────────────────────────────────┘
                                          │
                                          │ referenced by
                                          ▼
                          ┌─────────────────────────────────────┐
                          │           Weekly Plan                │
                          ├─────────────────────────────────────┤
                          │ id (PK)                             │
                          │ user_id (FK profiles)               │
                          │ start_date                          │
                          │ end_date                            │
                          │ daily_outfits (JSONB)               │
                          │ created_at                          │
                          └─────────────────────────────────────┘
```

### Row Level Security

All user data is protected by RLS policies:

```sql
-- Users can only see their own wardrobe items
CREATE POLICY "Users can view own items"
ON wardrobe_items FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert items for themselves
CREATE POLICY "Users can insert own items"
ON wardrobe_items FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

---

## Security

### Authentication Flow

```
Mobile App                    BFF                      Supabase
    │                          │                          │
    │ 1. Sign in with email    │                          │
    ├──────────────────────────┼─────────────────────────►│
    │                          │                          │
    │◄─────────────────────────┼──────────────────────────┤
    │ 2. Return JWT token      │                          │
    │                          │                          │
    │ 3. API request + token   │                          │
    ├─────────────────────────►│                          │
    │                          │ 4. Validate token        │
    │                          ├─────────────────────────►│
    │                          │                          │
    │                          │◄─────────────────────────┤
    │                          │ 5. User data             │
    │                          │                          │
    │                          │ 6. Create scoped client  │
    │                          │    (applies RLS)         │
    │                          │                          │
    │◄─────────────────────────┤                          │
    │ 7. Response              │                          │
```

### Security Measures

1. **JWT Validation**: All protected routes validate tokens
2. **Row Level Security**: Database enforces user isolation
3. **Scoped Clients**: Each request gets user-specific Supabase client
4. **Input Validation**: File types, sizes, and field types validated
5. **Rate Limiting**: AI service has built-in rate limit handling
6. **Secure Storage**: Mobile app uses expo-secure-store for tokens

---

## Deployment

### Development

```bash
# Start all services
npm run dev

# Services:
# - BFF: http://localhost:3000
# - Web: http://localhost:3001
# - Mobile: Expo Dev Client
```

### Production (TBD)

Recommended architecture:
- BFF: Railway, Fly.io, or AWS Lambda
- Mobile: App Store / Play Store
- Web: Vercel

---

## Future Considerations

### Scalability
- Add Redis for session caching
- Implement request queuing for AI calls
- Add CDN for image optimization

### Features
- Outfit generation with AI
- Social sharing
- Wardrobe analytics
- Style recommendations

### Technical Debt
- Add comprehensive test coverage
- Implement proper TypeScript strict mode
- Add database migrations tooling
