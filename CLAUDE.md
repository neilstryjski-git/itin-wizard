# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity

**Trip Wizard** — an AI-first travel companion. Users drop booking PDFs/screenshots into the app; Gemini parses them into a structured, shareable, offline-ready itinerary. No manual data entry.

This project is co-developed by **Gemini (The Architect)** and **Claude (The Builder)**. The shared task board is `PROJECT_ROADMAP.md` and protocol is in `AI_WOW.md`. Always read both at session start.

## Commands

```bash
npm run dev          # Start Vite dev server (http://localhost:8080)
npm run build        # Production build
npm run lint         # ESLint check
npm run test         # Vitest unit tests (single run)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright E2E (auto-starts dev server)
npm run test:e2e:ui  # Playwright with interactive UI
```

Run a single Vitest test file:
```bash
npx vitest run src/lib/itinerary-utils.test.ts
```

Run a single Playwright spec:
```bash
npx playwright test e2e/itinerary.spec.ts
```

Supabase Edge Functions live in `supabase/functions/` and are deployed separately (Deno runtime). They are not part of the Vite build.

## Architecture

### Data Flow

```
User email (localStorage) → useUserEmail → ProjectsContext
                                                  ↓
                                         useProjects (TanStack Query)
                                                  ↓
                                    Supabase `projects` table (JSONB)
```

The entire `TravelProject` object is stored as a single JSONB blob in `projects.data`. There is no relational decomposition of events, packing items, etc. — everything is one document per trip.

### Key Data Model (`src/types/project.ts`)

`TravelProject` has three phases:
- `phase_1_requirements` — AI chat interview + requirements checklist
- `phase_2_itinerary` — raw input, summary, and `ItineraryEvent[]`
- `phase_3_packing` — packing list items

`ItineraryEvent.type` can be: `flight | check-in | check-out | activity | transfer | accommodation`. The `accommodation` type is a virtual container that `buildTimeline()` expands into `check-in` / `check-out` bookend entries for display. **Never split accommodation events manually** — let `buildTimeline` handle it.

### Collaboration & Auth

Auth is email-as-identity (no passwords). Email stored in localStorage via `useUserEmail`. Collaboration is implemented two ways (dual-write for reliability):
1. `data.metadata.collaborators[]` — JSONB array inside the project blob
2. `project_collaborators` table — separate relational table for RLS-friendly querying

`useProjects` runs **three separate queries** (owned, sharedJson, sharedTable) and deduplicates by `project_id`. This is intentional — the RLS complexity required it.

### State Management

TanStack Query manages all async state. The query client is persisted to `localStorage` via `createSyncStoragePersister` — this is the PWA offline strategy. Cache TTL: 1 hour stale, 7 days gc.

All mutations in `useProjects` do a fetch-then-update (read current → apply updater fn → write back) to avoid race conditions from optimistic updates.

### PDF Export (`src/pages/ExportPreview.tsx`)

Uses `jsPDF` + `jspdf-autotable`. Emojis must be stripped before passing text to jsPDF (it can't render them) — use `stripEmoji()` from `itinerary-utils`. PDF titles use `getEventTitlePdf()` (bracket prefix) instead of `getEventTitle()` (emoji prefix).

### AI Parsing (`supabase/functions/parse-itinerary/index.ts`)

Deno Edge Function. Calls `google/gemini-2.5-flash` via the Lovable AI gateway with a tool-use schema. Returns `{ events[], summary? }`. The sparse-merge pattern in the frontend (ExportPreview, Phase2Itinerary) only overwrites fields that are currently empty — existing user edits are never clobbered.

### Core Utilities (`src/lib/itinerary-utils.ts`)

- `normalizeDate()` — normalizes any date format to `YYYY-MM-DD`. Always use this before storing or comparing dates.
- `buildTimeline()` — expands accommodation events into bookends, sorts chronologically. Tie-break: newest `createdAt` first.
- `eventsFromTimeline()` — inverse of buildTimeline; reconstructs the flat events array after drag-reorder. Handles interleaved check-in/check-out splitting.
- `buildEventTable()` — produces the `{rows, notes, noteItems}` structure used by both the web preview and PDF export.

## Coding Conventions

- All pages consume `useProjectsContext()` — never instantiate `useProjects` directly in pages.
- `updateProject(id, updater)` takes a pure function `(p: TravelProject) => TravelProject`. The hook handles the fetch-mutate-write cycle.
- Dates stored as `YYYY-MM-DD` strings, times as `HH:MM` (24h). Use `normalizeDate()` on any AI-provided or user-entered date.
- UI components are Shadcn/ui (Radix primitives + Tailwind). Path alias `@/` maps to `src/`.
- Toasts use `sonner` (imported as `toast` from `"sonner"`), not the Radix toast.
- Drag-and-drop reordering uses `@dnd-kit` via the `SortableEventList` abstraction.
