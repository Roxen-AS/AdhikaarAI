# Adhikaar.AI — Setup Guide

## Architecture Overview

```
pnpm monorepo
├── artifacts/adhikaar       React + Vite frontend
├── artifacts/api-server     Express 5 backend (Node.js)
├── lib/db                   Drizzle ORM + PostgreSQL schema
└── lib/...                  Shared libraries (API client, types, etc.)
```

The frontend talks to the backend via `/api/*` routes.  
The backend uses PostgreSQL for data and sessions.  
OpenAI (gpt-4o) powers the legal AI chat.

---

## Part 1 — Run Locally

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| pnpm | 10+ | `npm install -g pnpm@latest` |
| PostgreSQL | 15+ | https://www.postgresql.org/download/ |

---

### Step 1 — Clone / Extract

If you cloned from GitHub:
```bash
git clone https://github.com/YOUR_USERNAME/adhikaar-ai.git
cd adhikaar-ai
```

If you extracted the zip:
```bash
unzip adhikaar-ai.zip -d adhikaar-ai
cd adhikaar-ai
```

---

### Step 2 — Create a local PostgreSQL database

```bash
# Start PostgreSQL and open the shell
psql -U postgres

# Inside psql:
CREATE DATABASE adhikaar;
CREATE USER adhikaar_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE adhikaar TO adhikaar_user;
\q
```

---

### Step 3 — Patch Vite config for local use

The Vite config currently requires `PORT` and `BASE_PATH` env vars (set by the Replit platform).  
Open **`artifacts/adhikaar/vite.config.ts`** and replace the top section:

```ts
// BEFORE (Replit-specific):
const rawPort = process.env.PORT;
if (!rawPort) throw new Error("PORT environment variable is required...");
const port = Number(rawPort);
const basePath = process.env.BASE_PATH;
if (!basePath) throw new Error("BASE_PATH environment variable is required...");

// AFTER (local-friendly):
const port = Number(process.env.PORT ?? 5173);
const basePath = process.env.BASE_PATH ?? "/";
```

Also remove the Replit-only plugins (they won't install outside Replit).  
Replace the `plugins` array in `vite.config.ts`:

```ts
plugins: [
  react(),
  tailwindcss(),
],
```

And in `artifacts/adhikaar/package.json`, remove these three devDependencies:
```
"@replit/vite-plugin-cartographer"
"@replit/vite-plugin-dev-banner"
"@replit/vite-plugin-runtime-error-modal"
```

---

### Step 4 — Swap the OpenAI integration

The API server uses a Replit-managed OpenAI proxy (`@workspace/integrations-openai-ai-server`).  
For local use, swap it with the official OpenAI package.

**Install OpenAI in the API server:**
```bash
pnpm --filter @workspace/api-server add openai
```

**Find the chat route** (`artifacts/api-server/src/routes/openai/`) and replace:
```ts
// BEFORE
import { createClient } from "@workspace/integrations-openai-ai-server";
const openai = createClient();

// AFTER
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

---

### Step 5 — Environment variables

Create **`artifacts/api-server/.env`**:
```env
# Database
DATABASE_URL=postgresql://adhikaar_user:yourpassword@localhost:5432/adhikaar
PGHOST=localhost
PGPORT=5432
PGUSER=adhikaar_user
PGPASSWORD=yourpassword
PGDATABASE=adhikaar

# Session (pick any long random string)
SESSION_SECRET=replace-this-with-a-long-random-secret-string

# OpenAI (after swapping the integration above)
OPENAI_API_KEY=sk-...

# Node
NODE_ENV=development
PORT=8080
```

Create **`artifacts/adhikaar/.env`**:
```env
PORT=5173
BASE_PATH=/
NODE_ENV=development
```

---

### Step 6 — Install dependencies and run DB migrations

```bash
# Install all workspace dependencies
pnpm install

# Push the database schema (creates all tables)
pnpm --filter @workspace/db run push
```

---

### Step 7 — Start both servers (two terminal tabs)

**Terminal 1 — API server:**
```bash
cd artifacts/api-server
pnpm dev
# Listening on http://localhost:8080
```

**Terminal 2 — Frontend:**
```bash
cd artifacts/adhikaar
pnpm dev
# Open http://localhost:5173
```

The frontend is pre-configured to call `/api` routes. Because both servers are on different ports locally, add a Vite proxy in `artifacts/adhikaar/vite.config.ts`:

```ts
server: {
  port,
  proxy: {
    "/api": {
      target: "http://localhost:8080",
      changeOrigin: true,
    },
  },
},
```

Then open **http://localhost:5173** — the app is running.

---

## Part 2 — Deploy via GitHub + Vercel

Adhikaar.AI has two parts that must be deployed separately:

| Part | Recommended host | Why |
|------|-----------------|-----|
| **Frontend** (React/Vite) | **Vercel** | Built for static + Vite apps |
| **Backend** (Express API) | **Railway** or **Render** | Runs Node.js servers |
| **Database** | **Neon** (free) or **Supabase** | Managed PostgreSQL |

---

### Step A — Set up a cloud PostgreSQL database (Neon, free tier)

1. Sign up at https://neon.tech (free)
2. Create a new project → copy the **Connection string**:
   ```
   postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
   ```
3. Keep this string — you'll use it in both Railway and Vercel.

Run migrations against your cloud DB:
```bash
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db run push
```

---

### Step B — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/adhikaar-ai.git
git push -u origin main
```

---

### Step C — Deploy backend to Railway

1. Go to https://railway.app → **New Project → Deploy from GitHub Repo**
2. Select your repo
3. Railway will detect Node.js. Set the **root directory** to `artifacts/api-server`  
   *(Settings → Source → Root Directory: `artifacts/api-server`)*
4. Set **Start Command**: `pnpm start`
5. Set **Build Command**: `pnpm install && pnpm build`
6. Add environment variables in Railway's dashboard:

```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
SESSION_SECRET=your-long-random-secret
OPENAI_API_KEY=sk-...
NODE_ENV=production
PORT=8080
```

7. Deploy — Railway gives you a URL like `https://adhikaar-api.railway.app`

---

### Step D — Deploy frontend to Vercel

1. Go to https://vercel.com → **Add New Project → Import from GitHub**
2. Select your repo
3. Set **Root Directory**: `artifacts/adhikaar`
4. Vercel auto-detects Vite. Override **Build Command**:
   ```
   cd ../.. && pnpm install && pnpm --filter @workspace/adhikaar run build
   ```
   Set **Output Directory**: `dist/public`

5. Add environment variables in Vercel:

```
PORT=3000
BASE_PATH=/
NODE_ENV=production
VITE_API_BASE_URL=https://adhikaar-api.railway.app
```

6. Because the frontend makes calls to `/api/*`, you need a **Vercel rewrite** so those calls go to the Railway backend.  
   Create **`artifacts/adhikaar/public/vercel.json`** (or `vercel.json` in the adhikaar root):

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://adhikaar-api.railway.app/api/:path*"
    }
  ]
}
```

7. Deploy — Vercel gives you a URL like `https://adhikaar.vercel.app`

---

### Step E — Configure CORS on the backend

In **`artifacts/api-server/src/app.ts`**, update the CORS config to allow your Vercel domain:

```ts
app.use(cors({
  origin: ["https://adhikaar.vercel.app", "http://localhost:5173"],
  credentials: true,
}));
```

---

### Step F — Configure session cookies for production

Sessions use cookies with `sameSite: "lax"` by default. Since the frontend (Vercel) and backend (Railway) are on different domains, update the session config in `artifacts/api-server/src/app.ts`:

```ts
app.use(session({
  // ... existing config ...
  cookie: {
    secure: process.env.NODE_ENV === "production",  // HTTPS only in prod
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));
```

---

### Summary of environment variables

**Backend (Railway):**
```
DATABASE_URL        Neon connection string
SESSION_SECRET      Long random string (openssl rand -base64 48)
OPENAI_API_KEY      Your OpenAI API key
NODE_ENV            production
PORT                8080
```

**Frontend (Vercel):**
```
PORT                3000
BASE_PATH           /
NODE_ENV            production
VITE_API_BASE_URL   https://your-api.railway.app  (used by vercel.json rewrite)
```

---

## Notes

- **Object storage**: Profile photo uploads use Replit's object storage. For production, swap `lib/integrations/object-storage-web` with AWS S3, Cloudflare R2, or Cloudinary.
- **Sessions across domains**: The `sameSite: "none"` + `secure: true` cookie config is required when frontend and API are on different domains. Both must be on HTTPS.
- **Neon free tier**: 0.5 GB storage, 1 compute unit. Sufficient for development and small production workloads.
- **Railway free tier**: $5 credit/month, enough for light traffic. Scale up as needed.
