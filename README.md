# Exam Platform

Full-stack multi-subject exam preparation platform with AI-generated visual lessons, per-subject subscriptions, and role-based access (Student, Parent, Teacher, Admin).

## Tech stack

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router + TanStack Query
- **Backend:** Node.js + Express + Prisma
- **Database:** Neon PostgreSQL
- **Auth:** JWT (access token + httpOnly refresh cookie)
- **Payments:** Stripe
- **AI:** Anthropic Claude (visual lessons + answer marking)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` in the project root and fill in values:

```bash
cp .env.example .env
```

Also copy env vars for the API (or symlink `.env` into `apps/api/`):

```bash
cp .env.example apps/api/.env
```

Required for local dev:

- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_SECRET` and `JWT_REFRESH_SECRET` — random strings
- `ANTHROPIC_API_KEY` — for visual lesson generation (optional for browsing)

### 3. Database setup

```bash
npm run db:migrate -w apps/api
npm run db:seed -w apps/api
```

### 4. Run development servers

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000

## Seed accounts

| Role    | Email                 | Password     |
|---------|-----------------------|--------------|
| Admin   | admin@platform.com    | Admin123!    |
| Teacher | teacher@platform.com  | Teacher123!  |
| Student | student@platform.com  | Student123!  |

Seed data includes Edexcel → Biology → Grade 9 with 5 units and a sample published lesson.

## Project structure

```
apps/
  web/     React frontend
  api/     Express backend + Prisma
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + web concurrently |
| `npm run dev:api` | API only |
| `npm run dev:web` | Web only |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed development data |
| `npm run db:studio` | Open Prisma Studio |

## Phase 1–5 status

- Monorepo scaffold, design system, auth, layouts
- Content hierarchy (exam boards → subjects → grades → units)
- Lesson CRUD, 5-step teacher wizard, Claude SSE visual generation
- Student lesson page with sandboxed visual iframe
- Question attempts with Claude Haiku marking (short answer)
- Stripe subscription scaffolding, progress tracking, admin panel basics

Phases 6–10 (past paper upload UI, email templates, full landing polish, SEO) are partially implemented and ready for iteration.
