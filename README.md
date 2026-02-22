# job-assistant

## Environment Variables

Create a `.env` file (or set in Vercel Project Settings):

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

You can also copy `.env.example`.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Supabase Notes

- The app now scopes `documents`, `saved_jobs`, and `profiles` queries to the authenticated user.
- `profiles` writes use `upsert` on `id = auth.uid()`.
- If signup returns `Database error saving new user`, the issue is usually in Supabase SQL (auth trigger or RLS), not in Vite/React build config.
