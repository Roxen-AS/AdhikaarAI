# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2)

## Artifacts

### Adhikaar.AI (`artifacts/adhikaar`)
- React + Vite frontend
- Dark institutional legal AI chatbot for India
- Gold (#C9A24D) accent color palette
- Citizen Mode + Lawyer Mode with different LLM system prompts
- English + Hindi language toggle
- Real-time streaming responses via SSE
- react-markdown + remark-gfm for markdown rendering
- Conversation history stored in PostgreSQL

### API Server (`artifacts/api-server`)
- Express 5 backend
- OpenAI integration via `@workspace/integrations-openai-ai-server`
- Routes: `/api/openai/conversations` (CRUD + streaming chat)
- System prompts tuned for Citizen vs Lawyer modes
- Hindi language support via instruction injection

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

- `conversations` — id, title, mode (citizen/lawyer), language (en/hi), created_at
- `messages` — id, conversation_id, role, content, created_at

## Environment Variables

- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Replit AI Integrations proxy URL
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit AI Integrations API key (auto-set)
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — PostgreSQL

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
