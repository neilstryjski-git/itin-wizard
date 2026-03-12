# Project Roadmap & AI Task Board

This file tracks the status of work and is the shared task board for **Gemini (♊)** and **Claude (🤖)**.
See **AI_WOW.md** for interaction protocols and rules of engagement.

---

## 🏎️ Active Pipelines (High Priority)

*All high-priority pipelines are currently complete.*

## 🤖 AI Orchestration & WoW Improvements

| Status | Task | Description | Current Owner |
| :--- | :--- | :--- | :--- |
| 🟢 Done | **Direct Baton Pass Check** | Verified that Gemini can autonomously execute CLI commands for handoffs. | **♊ Gemini** |
| 🟢 Done | **Security Hardening** | Implemented `.geminiignore`, project-specific SSH deploy keys, and sandbox isolation audit. | **♊ Gemini** |
| 🟢 Done | **Way of Working (WoW) Initialized** | Create AI_WOW.md and move rules of engagement there. | **♊ Gemini** |
| 🟢 Done | **Persona Definition** | Define Architect (Gemini) and Builder (Claude) roles in WoW. | **♊ Gemini** |

---

## 🚀 Feature Backlog
| ID | Feature | Status | Owner | Plan |
| :--- | :--- | :--- | :--- | :--- |
| 🟢 Done | **F14: Minimalist PDF Template** | ✅ Done | 🤖 Claude | [`f14-pdf-aesthetic.md`](docs/plans/f14-pdf-aesthetic.md) |
| **F9** | **Cloud Vault (GDrive Sync)** | 🟡 In Progress | 🤖 Claude | [`f9-cloud-vault.md`](docs/plans/f9-cloud-vault.md) |
| **F16** | **The Travel Library** | ✅ Done | 🤖 Claude | [`f16-finalize-trip.md`](docs/plans/f16-finalize-trip.md) |
| **F15** | **Test Trip for New Users** | ✅ Done | ♊ Gemini | *Direct Implementation* |
| **F13** | **Gemini Native Migration** | 📅 Planned | ♊ Gemini | *Planned* |
| **F8** | **QR Code Detection** | 📅 Backlog | ♊ Gemini | *Not Started* |

---

## 🟢 Resolved Features (History)
| Date | ID | Feature | Resolution |
| :--- | :--- | :--- | :--- |
| 2026-03-11 | F16 | Enhanced Permissions | Collaborators can now toggle the lock on finalized trips. "Add Event" button is now disabled when a trip is locked. Deletion remains owner-only. |
| 2026-03-11 | F16 | Dynamic Home Route | Implemented auto-redirection on `/`: defaults to Finalized view if trips exist, falls back to Drafts, or creation view for new users. |
| 2026-03-11 | B11 | Mobile Sidebar Labels | Fixed issue where sidebar labels and counts were hidden on mobile due to collapsed state logic. |
| 2026-03-11 | B10 | Finalized Archive Locking | Restricted "Archive" action for finalized trips to only be available when the record is Unlocked. |
| 2026-03-11 | B9 | Archive Button on Drafts | Removed the "Archive" action from draft trips in the Dashboard; drafts must now be Finalized before they can be Archived. |
| 2026-03-09 | F15 | Test Trip for New Users | Automatically create a "Belize Family Adventure 2026 TEST" trip for new users, personalized with their identity as the sole traveler and re-assigned packing items. |
| 2026-03-09 | F9 | GDrive Infrastructure | Implemented `user_cloud_auth` table and `gdrive-proxy` Edge Function for OAuth token management. |
| 2026-03-09 | B8 | Model Name Fix | Corrected typo `gemini-2.5-flash` to `gemini-2.0-flash` in `parse-itinerary` function. |
| 2026-03-09 | F14 | Minimalist PDF Template | Option C implemented: plain theme, coloured bottom-border headers, 2mm accent pips, muted palette, left-rule summary block, page numbers. |
| 2026-03-08 | F3 | PDF Export Styles | Enhanced with event-type colour-coded headers and refined typography. Superseded by F14 minimalist refactor. |
| 2026-03-08 | F5 | Multi-Event Doc Split | Multiple events in docs are now appended to the timeline. |
| 2026-03-08 | F6 | Cloud Link Extraction | URLs are extracted from documents and merged into event links. |
| 2026-03-08 | T1 | E2E Testing Suite | Set up Playwright for end-to-end testing, including a spec for the itinerary workflow and UI interactions. |
| 2026-03-08 | UX2 | Identity Management | Refined the email prompt to be closable when a user is already logged in. Added "Change User" button to the header. |
| 2026-03-08 | UX1 | New Event Workflow | Improved "Add Event" experience with in-line active cards, auto-focus, scroll-to-view, and chronological tie-breaking. |
| 2026-03-08 | B7 | Sharing Fixes | Allowed non-owners to manage collaborators and improved shared project visibility via JSONB containment and table-syncing. |
| 2026-03-08 | F12 | PWA & Offline Support | Added Service Worker, Web Manifest, and React Query persistence for offline itinerary viewing. |
| 2026-03-08 | F11 | Private Trip Sharing | Implemented email-based collaboration with full edit access and a management dialog. |
| 2026-03-08 | B1 | Meta Tag Cleanup | Updated index.html title and meta tags to Trip Wizard. |
| 2026-03-08 | F10 | Trip Summary | Added editable Trip Summary card at the top of the itinerary and included it in the PDF export. |
| 2026-03-06 | F1 | User-Scoped Trips | Migrated to Supabase DB with email-based identity and automatic local storage migration bridge. |
| 2026-03-06 | B5 | PDF Link New Tab | Optimized PDF link metadata to encourage opening in new browser tabs. |
| 2026-03-06 | B6 | Editor Drop Zone | Restored full drag-and-drop zone in the event editor. |
| 2026-03-06 | B3 | Check-Out Edit | Enabled editing for check-out markers in the timeline and export preview. |
| 2026-03-06 | B4 | Paperclip Cleanup | Removed redundant explicit attachment buttons. |
| 2026-03-06 | F7 | Editor Consolidation | Merged Attachments and Update Details into a single 'Update from Document' tool. |
| 2026-03-06 | F4 | AI Parse-on-Drop | Dropping files on activities triggers an AI sparse-merge update. |
| 2026-03-06 | B2 | Accommodation Edit Bug | Fixed logic preventing edits on check-in/accommodation entries. |
| 2026-03-06 | F2 | Rich Notes | Multi-line and bulleted notes support in itinerary activities. |

---

## 🗣️ VoC Requests
| User | Request | Status |
| :--- | :--- | :--- |
| `neil.stryjski@gmail.com` | **GDrive-Link Sync**: Enhance F9 to support saving files to GDrive and linking them directly to the itinerary. | 🟢 Synced |

---

## 🔴 Active Bugs
| ID | Issue | Description | Current Owner |
| :--- | :--- | :--- | :--- |
| 🟢 Done | **Meta Tag Cleanup** | Update index.html title and OG tags. | **♊ Gemini** |

---


*Note: This file is the primary coordination point for Gemini and Claude. Please maintain the structure for automated parsing.*
