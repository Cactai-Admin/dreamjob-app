# DreamJob Restoration Pass Note

## Purpose

This note captures the fresh restoration pass after the accidental merge/revert cycle.

The repo now restores the intended DreamJob support updates completed so far as a targeted patch set (not a rebuild), including:

- Phase 1 support structures (type alignment + shared low-risk utilities)
- state-aware app entry scaffolding
- onboarding modal gating behavior
- onboarding/profile field consistency fixes

## Restored change areas

1. Shared listing requirement parsing/match logic (`src/lib/listing-match.ts`) and active call-site adoption.
2. State-aware app entry resolver support (`src/lib/entry-routing.ts`) with dashboard entry integration.
3. Onboarding support structures (`src/lib/onboarding-memory.ts`) and onboarding modal UI (`src/components/onboarding/onboarding-modal.tsx`).
4. Login default redirect correction to root entry path (`src/app/(auth)/login/page.tsx`).
5. Profile/contact consistency updates (`src/app/api/profile/route.ts`, `src/app/(dashboard)/profile/page.tsx`).
6. Type/state alignment updates (`src/types/database.ts`, `src/types/workflow.ts`, `src/lib/constants.ts`).

## Scope discipline

- Preserved Stage 2 and Stage 3 surfaces.
- Avoided broad restructuring and styling overhaul.
- Preserved listing intake/review/start-application golden-path behavior.
