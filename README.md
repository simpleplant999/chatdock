# ContextChat frontend

Single deployable Next.js app (UI + API routes). The NestJS `backend/` folder is obsolete.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo login:** `demo@example.com` / `password123`

## Environment

Copy `.env.example` to `.env.local` if you want custom values:

- `JWT_SECRET` — optional; defaults to a local dev secret
- `MONGODB_URI` — MongoDB connection string (Atlas or local). Defaults to `mongodb://127.0.0.1:27017/contextchat`
- `GROQ_API_KEY` — optional; enables Groq LLM answers
- `NEXT_PUBLIC_API_URL` — leave empty so the browser calls same-origin `/api/*`

On first connect with an empty database, a demo user is seeded: `demo@example.com` / `password123`.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production server
