

## Plan: User-Scoped Trips via Email Identity

### Approach

Use a lightweight email-based identity system — no password, no verification. Users enter their email once, it's stored in `localStorage`, and all trips are scoped to that email. This keeps things simple now while enabling sharing later (since trips will have an `owner_email` and eventually a `shared_with` list).

### Database

Move trip storage from `localStorage` to the database so trips can be queried by email and eventually shared.

**New table: `projects`**
- `id` (uuid, PK)
- `project_id` (text, unique) — matches existing `project_id` in the JSON
- `owner_email` (text, not null) — the creator's email
- `data` (jsonb, not null) — the full `TravelProject` object
- `created_at`, `updated_at` (timestamptz)
- RLS disabled initially (no auth — just email-based filtering client-side)

**Future sharing table (not built now, just noted):**
- `project_shares` with `project_id`, `shared_with_email`, `permission` (view/edit)

### Frontend Changes

1. **Email prompt component** — A simple modal/page that asks "Enter your email to get started". Stores email in `localStorage` under a key like `travel-user-email`. Shows on app load if no email is set. Includes a "Change identity" option in the sidebar.

2. **Refactor `useProjects` hook** — Replace `localStorage` read/write with database queries filtered by `owner_email`. Use `@tanstack/react-query` for fetching and mutations against the `projects` table.

3. **Update `ProjectsContext`** — Expose the current user email alongside projects. Pass `owner_email` when creating new projects.

4. **Dashboard** — Only shows trips belonging to the current email. No other changes needed.

5. **Sidebar** — Show current email, with option to switch/logout.

### Why This Sets Up Sharing

Since every trip has an `owner_email` stored in the database, a future sharing feature just needs:
- A `project_shares` table
- Query projects where `owner_email = me OR shared_with = me`
- Permission checks on mutations

### Steps

1. Create `projects` table (with RLS allowing all access for now — no auth)
2. Build email prompt component
3. Refactor `useProjects` to use database + email filtering
4. Update sidebar to show current user email
5. Migrate seed data handling to work with new flow

