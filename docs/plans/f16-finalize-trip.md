# Feature Plan: F16 - The Travel Library (State Promotion Model)

This feature implements a "The Travel Library" architecture where trips are promoted through three distinct states: Draft, Finalized, and Archive. Navigation is driven by sidebar "buckets" with dynamic counts.

## 🛠️ Technical Overview

### 1. Data Model Updates (`src/types/project.ts`)
Add to `TravelProject['metadata']`:
- `is_finalized?: boolean`
- `is_locked?: boolean`
- `version?: number`
- `finalized_at?: string` (ISO timestamp)
- `status: 'active' | 'archived'` (Ensuring consistent use of existing status)

### 2. Sidebar Navigation (`src/components/AppSidebar.tsx`)
- Implement three primary navigation buckets with real-time dynamic counts:
    - **Drafts [Count]**: `is_finalized !== true && status === 'active'`
    - **Finalized [Count]**: `is_finalized === true && status === 'active'`
    - **Archive [Count]**: `status === 'archived'`
- Dashboard (`/`) will serve as the view for the selected bucket.

### 3. State Promotion & UX
- **Draft -> Finalized**: "Finalize" action (Owner only). 
    - Logic: Sets `is_finalized: true`, `is_locked: true`, `version: 1`, and `finalized_at`.
    - UX: Success toast + Increment Sidebar Count + Auto-navigate to `/finalized`.
- **Finalized -> Archive**: "Archive" action (Owner only). 
    - Logic: Sets `status: 'archived'`.
    - UX: Success toast + Increment Sidebar Count + Auto-navigate to `/archive`.
- **Naming Visuals**: Display "Finalized - [Date] v.[X]" as metadata below the trip name on cards.

### 4. Guardrails & Modification
- **Locked State**: Read-only UI in Itinerary/Packing; delete icons hidden on dashboard.
- **Unlocked State**: 
    - Persistent toggle (saved to DB) allows editing.
    - Enables "Editing Mode" indicator in header.
    - Requires manual "Save Changes" click (Auto-save disabled).
    - Saving requires Overwrite Confirmation and increments `version`.
- **Deletion**: Finalized/Archived records require a prominent, high-friction confirmation dialog.

## 📋 Task Breakdown

### Phase 1: Foundation & Navigation
- [x] T16.1: Update `TravelProject` type and `createNewProject` factory.
- [ ] T16.2: Update `AppSidebar.tsx` with dynamic bucket counts and active/inactive icons.
- [ ] T16.3: Create routing and views for `/finalized` and `/archive`.

### Phase 2: Promotion Logic
- [x] T16.4: Implement `finalizeProject` and `archiveProject` in `useProjects.ts` with Toast/Navigation.
- [x] T16.5: Add "Finalize" button to `Phase2Itinerary.tsx` header.
- [ ] T16.6: Add "Archive/Restore" buttons to Dashboard cards.

### Phase 3: Dashboard & Visuals
- [ ] T16.7: Update `Dashboard.tsx` to support filtered lists with independent scrolling.
- [ ] T16.8: Style Finalized/Archived cards with "Record" aesthetic and metadata sub-labels.
- [ ] T16.9: Add Lock/Unlock toggle to Dashboard cards and project headers.

### Phase 4: Safety & Verification
- [ ] T16.10: Implement "Editing Mode" indicator and "Save Changes" guardrail.
- [ ] T16.11: Add prominent "DELETE" confirmation for official records.
- [ ] T16.12: Verify versioning resets and state-persistence.

## 🚀 Proceed?
Please review this final "Travel Library" plan. If it looks correct, say **"Proceed"** and I will begin implementation.
