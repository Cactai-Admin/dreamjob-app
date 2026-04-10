# DreamJob

AI-assisted job application support platform for mid-career professionals. DreamJob helps you create tailored resumes, cover letters, interview guides, and negotiation strategies for each job opportunity.

## Features

- **Workflow-based job applications** — One active workflow at a time, guiding you from listing to submission
- **AI-powered document generation** — Resumes, cover letters, interview guides, and negotiation guides tailored to each listing
- **Interactive Q&A** — AI asks targeted questions to gather your specific experience for each role
- **LinkedIn integration** — Browser-based company research, connection discovery, and insights
- **Evidence library** — Store and reuse accomplishments, metrics, and career highlights
- **Status tracking** — Track application progress from sent through hired/rejected
- **30-day soft delete** — Recover accidentally deleted items within 30 days
- **Multi-role access** — Super Admin, Admin, Support, User, Agent, Demo roles
- **Dual auth** — Google OAuth for external users, username/password for internal users

## Tech Stack

- **Framework**: Next.js 16.2.3 (React 19, Turbopack)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (@supabase/ssr)
- **AI**: Anthropic Claude (primary), OpenAI GPT-4o (secondary)
- **UI**: Tailwind CSS v4, Radix UI primitives
- **LinkedIn**: Playwright browser automation
- **Payments**: Stripe (ready to implement)

## Quick Start

```bash
# Install dependencies
npm install --legacy-peer-deps

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migration
# Go to Supabase Dashboard → SQL Editor → paste contents of supabase/migrations/001_initial_schema.sql

# Seed Super Admin account
npm run seed

# Start development server
npm run dev
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, OAuth callback
│   ├── (dashboard)/     # Main app pages
│   │   ├── admin/       # Admin panel
│   │   ├── jobs/        # Job workflows
│   │   ├── ready/       # Ready-to-send documents
│   │   ├── sent/        # Sent applications
│   │   └── profile/     # User profile, settings
│   └── api/             # API routes
├── components/
│   ├── layout/          # Sidebar, mobile nav
│   ├── shared/          # Empty state, page header, loading
│   └── ui/              # Button, card, dialog, etc.
├── hooks/               # useSession, useToast, etc.
├── lib/
│   ├── ai/              # Provider abstraction, prompts
│   ├── auth/            # Session, roles
│   ├── linkedin/        # Browser automation
│   └── supabase/        # Client configs
├── types/               # TypeScript interfaces
scripts/
├── seed.ts              # Create Super Admin account
└── reset-db.ts          # Reset database schema
supabase/
└── migrations/          # SQL schema
docs/                    # Setup guides and documentation
```

## Documentation

- [Setup & Run Guide](docs/setup-and-run.md)
- [Environment Variables](docs/environment-variables.md)
- [Architecture Decisions](docs/architecture-decisions.md)
- [AI Providers Setup](docs/ai-providers-setup.md)
- [Google OAuth Setup](docs/google-oauth-setup.md)
- [LinkedIn Integration](docs/linkedin-integration.md)
- [Stripe Setup](docs/stripe-setup.md)
- [Test Plan](docs/test-plan.md)
- [Known Gaps & Assumptions](docs/known-gaps-and-assumptions.md)
- [Spec Traceability](docs/spec-traceability.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run seed` | Create Super Admin account |
| `npm run db:reset` | Reset database schema |
| `npm run lint` | Run ESLint |

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@dreamjob.app | test1234 |
