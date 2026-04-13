# Repository Tree (architecture-focused)

> Scope: architecture review only. Excludes bulky/generated dirs (`node_modules`, `.next`, `dist`, `build`, `coverage`).

## App routes (Next app router)

```text
src/app/
├── layout.tsx
├── globals.css
├── not-found.tsx
├── providers.tsx
├── (auth)/
│   ├── layout.tsx
│   ├── login/page.tsx
│   └── callback/page.tsx
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx                          # Analyze / intake entrypoint
│   ├── listings/
│   │   ├── page.tsx                      # listing_review queue
│   │   └── [id]/page.tsx                 # listing review/edit/start application
│   ├── jobs/
│   │   ├── page.tsx                      # applications list
│   │   ├── new/page.tsx                  # redirect to /
│   │   └── [id]/
│   │       ├── page.tsx                  # job/app detail + status + listing edits
│   │       ├── review/page.tsx
│   │       ├── resume/page.tsx
│   │       ├── cover-letter/page.tsx
│   │       ├── interview-guide/page.tsx
│   │       ├── negotiation-guide/page.tsx
│   │       └── export/page.tsx
│   ├── profile/page.tsx
│   ├── settings/page.tsx
│   ├── stats/page.tsx
│   ├── trash/page.tsx
│   └── admin/page.tsx
└── api/
    ├── ai/
    │   ├── chat/route.ts
    │   └── generate/route.ts
    ├── auth/
    │   ├── callback/route.ts
    │   ├── login/route.ts
    │   ├── logout/route.ts
    │   └── session/route.ts
    ├── workflows/
    │   ├── route.ts
    │   └── [id]/
    │       ├── route.ts
    │       ├── outputs/route.ts
    │       ├── status/route.ts
    │       ├── qa/route.ts
    │       └── snapshots/route.ts
    ├── listings/
    │   ├── parse/route.ts
    │   ├── discover-company/route.ts
    │   ├── scrape-company-linkedin/route.ts
    │   └── availability/route.ts
    ├── linkedin/
    │   ├── session/route.ts
    │   └── company/route.ts
    ├── profile/
    │   ├── route.ts
    │   ├── parse-artifact/route.ts
    │   ├── memory/route.ts
    │   ├── evidence/route.ts
    │   ├── employment/route.ts
    │   ├── employment/[id]/route.ts
    │   ├── education/route.ts
    │   └── education/[id]/route.ts
    ├── settings/providers/route.ts
    ├── deleted-items/route.ts
    ├── deleted-items/[id]/route.ts
    └── admin/users/route.ts
```

## Components (UI surface)

```text
src/components/
├── documents/
│   ├── ai-chat-panel.tsx
│   ├── markdown-doc.tsx
│   ├── document-editor.tsx
│   └── doc-subheader.tsx
├── jobs/
│   ├── job-card.tsx
│   ├── status-badge.tsx
│   └── doc-status-pill.tsx
├── layout/
│   ├── app-shell.tsx
│   ├── top-nav.tsx
│   ├── page-header.tsx
│   ├── doc-controls-slot.tsx
│   └── mobile-nav-slot.tsx
├── profile/
│   └── upload-artifact-modal.tsx
├── auth/
│   └── login-bg.tsx
├── privacy-screen/
│   └── privacy-screen.tsx
├── shared/...
└── ui/...
```

## AI prompts / generation assets

```text
src/lib/ai/prompts/
├── listing-parse.ts
├── qa-guidance.ts
└── resume-generation.ts
```

## Libraries / utilities

```text
src/lib/
├── ai/
│   ├── provider.ts
│   ├── openai.ts
│   └── anthropic.ts
├── auth/
│   ├── session.ts
│   └── roles.ts
├── supabase/
│   ├── client.ts
│   ├── server.ts
│   └── admin.ts
├── linkedin/browser.ts
├── workflow-adapter.ts
├── validators.ts
├── types.ts
├── constants.ts
└── utils.ts
```

## DB schema / migrations

```text
supabase/migrations/
├── 001_initial_schema.sql
├── 002_add_company_website_to_listings.sql
├── 003_fix_enum_values.sql
├── 004_add_notes_to_workflows.sql
├── 005_add_skills_keywords_to_profiles.sql
├── 006_add_tools_certs_clearances.sql
├── 007_add_ready_event_type.sql
└── 008_add_profile_icon.sql
```

## State / stores / orchestration helpers

```text
src/hooks/
├── use-session.ts
├── use-debounce.ts
├── use-media-query.ts
└── use-toast.ts

src/types/workflow.ts         # workflow steps + status dependency constants
src/lib/workflow-adapter.ts   # DB workflow -> UI job/status mapping
src/components/layout/doc-controls-slot.tsx  # cross-page doc controls state slot
```

## Tool / function integrations

```text
AI providers:
- src/lib/ai/openai.ts
- src/lib/ai/anthropic.ts
- src/lib/ai/provider.ts

LinkedIn automation:
- src/lib/linkedin/browser.ts
- src/app/api/linkedin/session/route.ts
- src/app/api/linkedin/company/route.ts

Supabase integration:
- src/lib/supabase/{client,server,admin}.ts
- API routes under src/app/api/**
```
