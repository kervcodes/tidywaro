# Tidywaro

**Tidywaro** is a cross-platform wardrobe assistant that helps users digitize their closet, generate weekly outfit plans using AI, and share their style.

## Tech Stack

- **Mobile**: React Native (Expo)
- **Web**: Next.js
- **Backend-for-Frontend (BFF)**: Express.js (TypeScript)
- **Database & Auth**: Supabase
- **Monorepo Tool**: Turborepo

## Project Structure

```
.
├── apps
│   ├── bff/          # Express.js Backend
│   ├── mobile/       # Expo React Native App
│   └── web/          # Next.js Web App
├── packages
│   └── shared/       # Shared TypeScript types/config
└── ...
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v10+)

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/kervcodes/tidywaro.git
    cd tidywaro
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration

1.  **BFF**: Copy `.env.example` to `.env` in `apps/bff` and add your Supabase credentials.

    ```bash
    cp apps/bff/.env.example apps/bff/.env
    ```

2.  **Supabase**: Run the SQL in `supabase_schema.sql` in your Supabase project's SQL Editor to set up the database.

### Running the Project

Start all applications (BFF, Mobile, Web) in development mode:

```bash
npm run dev
```

- **BFF**: http://localhost:3000
- **Web**: http://localhost:3001 (usually)
- **Mobile**: Expo Dev Client

## License

[MIT](LICENSE)
