# DreamJob

AI-assisted job application platform for mid-career professionals. DreamJob now runs a v2 sequence per opportunity: Listing Review (2-column) transitions into a three-column Work History evidence-alignment workspace, then Resume, Cover Letter, and finally Overview while preserving left reference context and right persistent chat.

## Features

- **Listing intake** — Paste a job URL for AI-powered parsing, or enter details manually. AI auto-discovers company website and scrapes LinkedIn URL from the footer.
- **Listing review** — Edit all parsed fields, view a live match score against your profile skills, find LinkedIn connections at the company.
- **AI document generation** — Resume, cover letter, interview guide, and negotiation guide — each tailored to the specific listing.
- **Work History bridge step** — After Listing Review, users land in a 3-column Work History evidence-mapping workspace (left listing context, center mapping, right persistent chat).
- **Core sequence** — Listing Review → Work History → Resume → Cover Letter → Overview.
- **Trustworthy export gating** — Resume export requires saved resume, cover-letter export requires saved cover letter, combined export requires both saved.
- **Application state persistence** — Documents auto-save every 2 seconds; approved status persists across sessions.
- **LinkedIn integration** — Browser-based company research, connection discovery (1st/2nd/3rd degree), and LinkedIn URL scraping.
- **Status tracking** — Track applications from sent through hired/rejected with a full event timeline.
- **30-day soft delete** — Recover accidentally deleted listings and applications within 30 days.
- **Multi-role access** — Super Admin, Admin, Support, User, Agent, Demo roles.
- **Dual auth** — Google OAuth for external users, username/password for internal users.

## Tech Stack

- **Framework**: Next.js 16.2.3 (React 19, Turbopack)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (`@supabase/ssr`)
- **AI**: Anthropic Claude (primary), OpenAI GPT-4o (secondary)
- **UI**: Tailwind CSS v4, Lucide icons
- **LinkedIn**: Playwright browser automation
- **Payments**: Stripe (installed, not yet active)

## Quick Start

```bash
# Install dependencies
npm install --legacy-peer-deps

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials and AI provider keys

# Run database migrations
# Go to Supabase Dashboard → SQL Editor and run each file in order:
#   supabase/migrations/001_initial_schema.sql
#   supabase/migrations/002_add_company_website_to_listings.sql

# Seed Super Admin account
npm run seed

# Start development server
npm run dev
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, OAuth callback
│   └── (dashboard)/         # Main app pages (all behind auth)
│       ├── page.tsx          # Analyze — paste URL or enter manually
│       ├── listings/         # Job listings queue
│       │   ├── page.tsx      # All saved listings
│       │   └── [id]/         # Listing review & edit
│       ├── jobs/             # Active applications
│       │   ├── page.tsx      # Applications list
│       │   └── [id]/         # Application detail + doc editors
│       │       ├── page.tsx          # Work History evidence-alignment workspace
│       │       ├── resume/           # Resume generation + editing workspace
│       │       ├── cover-letter/     # Cover letter generation + editing workspace
│       │       ├── overview/         # Concluding hub (submission + support spokes)
│       │       ├── interview-guide/  # Interview guide editor
│       │       ├── negotiation-guide/ # Negotiation guide editor
│       │       └── export/           # Copy / download all docs
│       ├── profile/          # User profile & employment history
│       ├── settings/         # AI provider, preferences
│       ├── stats/            # Application stats dashboard
│       ├── trash/            # 30-day soft delete recovery
│       └── admin/            # Admin panel (admin+ roles)
│   └── api/                 # API routes
│       ├── workflows/        # Workflow CRUD + state management
│       ├── listings/         # Parse, discover-company, scrape-company-linkedin
│       ├── ai/               # Generate documents, chat
│       ├── profile/          # Profile, employment, evidence
│       ├── linkedin/         # Session, company data
│       └── admin/            # User management
├── components/
│   ├── layout/              # AppShell, TopNav (+ mobile bottom nav)
│   ├── documents/           # AiChatPanel, DocumentEditor
│   └── jobs/                # StatusBadge
├── lib/
│   ├── ai/                  # Provider abstraction, prompts
│   ├── linkedin/            # Browser automation
│   ├── types.ts             # TypeScript interfaces
│   ├── utils.ts             # cn() and helpers
│   └── workflow-adapter.ts  # Workflow → Job shape conversion
scripts/
├── seed.ts                  # Create Super Admin account
└── reset-db.ts              # Reset database schema
supabase/
└── migrations/              # SQL schema files (run in order)
docs/                        # Setup guides and architecture docs
```

## Navigation

**Desktop** — Top navigation bar:
- **Analyze** (`/`) — Start a new listing
- **Listings** — Saved listings awaiting application decision
- **Applications** — Active application workflows
- **Profile**, **Settings**, **Stats**, **Trash**, **Admin**

**Mobile** — Fixed bottom tab bar with three primary tabs.

## Application Workflow

```
Analyze page
  → paste URL → AI parse → review & edit fields → Save Listing
  OR enter manually → fill fields → Save Listing

Listings page
  → select listing → review match score, connections → Start Application

Application detail (v2 workflow)
  → Work History step maps listing requirements/responsibilities to stored profile + work history evidence
  → placeholder guidance appears for missing evidence signals before document generation
  → Resume workspace follows Work History
  → Cover Letter workspace follows Resume (or user can skip)
  → Overview becomes the post-creation hub
    - Submission Materials spoke (resume/cover/export readiness)
    - Application Support spoke (interview/follow-up/negotiation), gated until core materials complete
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
