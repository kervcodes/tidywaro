# Tidywaro

**Tidywaro** is a cross-platform wardrobe assistant that helps users digitize their closet, generate AI-powered weekly outfit plans, and manage their style across mobile and web platforms.

## ✨ Features

- **📸 AI-Powered Item Analysis**: Upload clothing photos and Google Gemini 2.0 Flash automatically detects category, color, style, material, pattern, season, and occasions
- **👔 Digital Wardrobe**: Organize your entire closet digitally with smart categorization
- **📅 Weekly Outfit Planning**: Generate personalized 7-day outfit recommendations with AI
- **🔄 Re-analyze with AI**: Update item details using AI at any time
- **👗 Virtual Try-On**: Preview outfits on a model (experimental)
- **💳 Subscription System**: Free tier with item limits, Premium for unlimited items
- **📱 Cross-Platform**: Native mobile apps (iOS/Android) and web interface

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Mobile** | React Native (Expo SDK 54) |
| **Web** | Next.js 15 |
| **BFF** | Express.js + TypeScript |
| **AI** | Google Gemini 2.0 Flash |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | Supabase Auth |
| **Storage** | Supabase Storage |
| **Monorepo** | Turborepo |

## Project Structure

```
tidywaro/
├── apps/
│   ├── bff/              # Express.js Backend-for-Frontend
│   │   ├── src/
│   │   │   ├── controllers/   # Request handlers
│   │   │   ├── middleware/    # Auth, logging, error handling
│   │   │   ├── routes/        # API route definitions
│   │   │   ├── services/      # AI service, business logic
│   │   │   └── utils/         # Logger, error classes
│   │   └── logs/             # Application logs
│   │
│   ├── mobile/           # Expo React Native App
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── contexts/      # React contexts (Auth)
│   │   │   ├── navigation/    # React Navigation setup
│   │   │   ├── screens/       # App screens
│   │   │   ├── services/      # API client, Supabase
│   │   │   ├── styles/        # Theme and styling
│   │   │   └── utils/         # Logger, helpers
│   │   └── assets/           # Images, fonts
│   │
│   └── web/              # Next.js Web App
│
├── packages/
│   └── shared/           # Shared TypeScript types
│
└── database/*.sql              # Database migrations
```

## Getting Started

### Prerequisites

- Node.js v18+
- npm v10+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio (for mobile development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kervcodes/tidywaro.git
   cd tidywaro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   **BFF** (`apps/bff/.env`):
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   PORT=3000
   
   # REQUIRED for AI clothing analysis
   GEMINI_API_KEY=your_gemini_api_key
   
   # Optional: for background removal
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   
   # Optional: for subscriptions
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```
   
   > ⚠️ **Important**: Without a valid `GEMINI_API_KEY`, all uploaded clothing items will be categorized as "uncategorized". Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

   **Mobile** (`apps/mobile/.env`):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
   EXPO_PUBLIC_LOCAL_IP=your_local_ip_address
   EXPO_PUBLIC_PORT=3000
   ```

4. **Run database migrations**
   
   Apply SQL files from the `database/` directory in order in the Supabase SQL Editor:
   - `database/supabase_schema.sql` (base schema)
   - `database/02_wardrobe_items.sql`
   - ... and so on, in numeric order

### Running the App

**Start all services** (from root):
```bash
npm run dev
```

Or individually:

```bash
# BFF (http://localhost:3000)
cd apps/bff && npm run dev

# Mobile (Expo Dev Client)
cd apps/mobile && npx expo start

# Web (http://localhost:3001)
cd apps/web && npm run dev
```

## API Documentation

See [docs/API.md](docs/API.md) for complete API reference.

## Design System

See [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for the visual style guide, including colors, typography, and spacing.

## Payment System

Tidywaro uses Stripe for subscription management. See [docs/PAYMENT_SYSTEM.md](docs/PAYMENT_SYSTEM.md) for:
- Subscription tiers (Free vs Premium)
- Stripe integration setup
- Webhook configuration
- Implementation status

> ⚠️ **Note**: The payment system is partially implemented. Check the documentation for current status.

### Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/me` | GET | Get current user |
| `/wardrobe/items` | GET | List wardrobe items |
| `/wardrobe/items` | POST | Upload new item (AI analysis) |
| `/wardrobe/items/bulk` | POST | Upload multiple items |
| `/wardrobe/items/:id` | GET | Get item details |
| `/wardrobe/items/:id` | PUT | Update item |
| `/wardrobe/items/:id` | DELETE | Delete item |
| `/wardrobe/items/:id/reanalyze` | POST | Re-run AI analysis |
| `/weekly-plans/current` | GET | Get current outfit plan |
| `/weekly-plans/generate` | POST | Generate weekly outfit plan |
| `/subscription` | GET | Get subscription info |
| `/subscription/check-limit` | GET | Check item upload limit |
| `/subscription/checkout` | POST | Create upgrade checkout |
| `/tryon/generate` | POST | Generate virtual try-on |
| `/tryon/outfit` | POST | Generate outfit try-on |

## Error Handling

The app implements comprehensive error handling:

- **Custom Error Classes**: Typed errors for different scenarios (BadRequest, NotFound, etc.)
- **Global Error Middleware**: Consistent JSON error responses
- **React Error Boundary**: Graceful UI fallback for crashes
- **Retry Logic**: Automatic retry with exponential backoff for rate limits

See [docs/ERROR_HANDLING.md](docs/ERROR_HANDLING.md) for details.

## Logging

Structured logging throughout the application:

- **BFF**: Winston logger with file and console transports
- **Mobile**: Development logger with log history
- **Log Levels**: debug, info, warn, error

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.
