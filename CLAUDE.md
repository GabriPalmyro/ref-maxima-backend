# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ref Maxima Backend — a NestJS 10 API (TypeScript, Express) for a mentor/mentee platform with AI-powered report generation. Mentors register via email or Google OAuth, create invite codes, and manage mentees. Mentees authenticate via social login (Google/Apple), link to a mentor using an invite code, and generate AI reports.

## Commands

```bash
pnpm install              # Install dependencies
pnpm run build            # Compile to /dist
pnpm run start:dev        # Dev server with hot reload (port 3000)
pnpm run lint             # ESLint with auto-fix
pnpm run format           # Prettier formatting
pnpm run test             # Run unit tests (Jest)
pnpm run test:watch       # Jest in watch mode
pnpm run test:cov         # Jest with coverage
pnpm run test:e2e         # E2E tests (separate config: test/jest-e2e.json)
npx prisma migrate dev    # Run database migrations
npx prisma generate       # Regenerate Prisma client after schema changes
```

## Architecture

**NestJS modular structure** — each feature is a module with its own controller, service, and DTOs under `src/`:

- `auth/` — Multi-provider authentication (email+password for mentors, Google/Apple OAuth for mentees). JWT tokens with role-based payloads (`mentor`, `mentee`, `unlinked`). Strategies in `strategies/`.
- `mentor/` — Mentor profile CRUD, mentee listing, and access to mentee reports/cards.
- `mentee/` — Mentee entity management.
- `invite/` — Invite code lifecycle (create, list, revoke). 6-char codes generated with nanoid.
- `report/` — AI report generation. Report types: PERSONA_ICP, POSICIONAMENTO, MENSAGEM_CLARA. Prompt builders live in `report/prompts/`.
- `message-card/` — Structured cards extracted from reports (DESEJO, PROBLEMA, GUIA, PLANO, CONVITE, SUCESSO, FRACASSO).
- `ai/` — Configurable AI service (external API endpoint, model, and key via env vars).
- `prisma/` — PrismaService singleton wrapping PrismaClient with lifecycle hooks.
- `common/` — Shared guards (`JwtAuthGuard`, `RolesGuard`), decorators (`@CurrentUser()`, `@Roles()`), and interfaces (`JwtPayload`).

## Database

PostgreSQL with Prisma ORM. Schema at `prisma/schema.prisma`.

Tables: `mentors`, `mentees`, `invite_codes`, `generated_reports`, `message_cards`. Reports and message cards use unique constraints per mentee/type to enforce one report per type per mentee.

## Auth Flow

1. Mentor registers (email/password) or logs in via Google → receives JWT with `role: 'mentor'`
2. Mentee does social login (Google/Apple) → receives JWT with `role: 'unlinked'`
3. Mentee submits invite code → gets linked to mentor → receives JWT with `role: 'mentee'` and `mentorId`

Guards: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('mentor')` / `@Roles('mentee')` on protected routes.

## Environment

Copy `.env.example` to `.env`. Required vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `GOOGLE_CLIENT_ID`, `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`.

## Code Conventions

- **Package manager:** pnpm
- **Strict TypeScript** with decorators enabled (ES2021 target, CommonJS modules)
- **Validation:** class-validator decorators on DTOs, global `ValidationPipe` with `whitelist` and `transform`
- **Formatting:** Prettier with single quotes, trailing commas
- **Linting:** ESLint with `@typescript-eslint`, `no-explicit-any` is off
