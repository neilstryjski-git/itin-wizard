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
| 🟢 Done | **Way of Working (WoW) Initialized** | Create AI_WOW.md and move rules of engagement there. | **♊ Gemini** |
| 🟢 Done | **Persona Definition** | Define Architect (Gemini) and Builder (Claude) roles in WoW. | **♊ Gemini** |

---

## 🚀 Feature Backlog
| ID | Feature | Status | Owner | Plan |
| :--- | :--- | :--- | :--- | :--- |
| **F9** | **Cloud Vault (GDrive Sync)** | 🧠 Brainstorming | ♊ Gemini | [`f9-cloud-vault.md`](docs/plans/f9-cloud-vault.md) |
| **F13** | **Gemini Native Migration** | 📅 Planned | ♊ Gemini | *Planned* |
| **F8** | **QR Code Detection** | 📅 Backlog | ♊ Gemini | *Not Started* |

---

## 🟢 Resolved Features (History)
| Date | ID | Feature | Resolution |
| :--- | :--- | :--- | :--- |
| 2026-03-08 | F3 | PDF Export Styles | Enhanced with event-type colour-coded headers and refined typography. |
| 2026-03-08 | F5 | Multi-Event Doc Split | Multiple events in docs are now appended to the timeline. |
| 2026-03-08 | F6 | Cloud Link Extraction | URLs are extracted from documents and merged into event links. |

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

## 🟢 Resolved (History)
| Date | ID | Task | Resolution |
| :--- | :--- | :--- | :--- |
| 2026-03-08 | F3 | PDF Export Styles | Event-type colour-coded table headers, left-pip section titles, improved cover page with accent bar, page numbers, and refined slate/blue colour palette. |
| 2026-03-08 | F6 | Cloud Link Extraction | Confirmed already fully implemented across all AI parse paths (bulk parse, per-event drop, edit form). No code change required. |
| 2026-03-08 | F5 | Multi-Event Doc Split | Extended handleEventAIUpdate in Phase2Itinerary to append all events beyond the first as new timeline entries when a multi-event document is dropped on an existing card. |
| 2026-03-08 | T1 | E2E Testing Suite | Set up Playwright for end-to-end testing, including a spec for the itinerary workflow and UI interactions. |
| 2026-03-08 | UX2 | Identity Management | Refined the email prompt to be closable when a user is already logged in, while remaining mandatory for first-time users. Added a "Change User" button to the header. |
| 2026-03-08 | UX1 | New Event Workflow | Improved the "Add Event" experience with in-line active cards, auto-focus, scroll-to-view, and intelligent chronological tie-breaking. |
| 2026-03-08 | B7 | Sharing Fixes | Allowed non-owners to manage collaborators and improved shared project visibility for specific users (e.g. maevestryjski190@gmail.com) via robust JSONB containment and table-syncing. |
| 2026-03-08 | F12 | PWA & Offline Support | Added Service Worker, Web Manifest, and React Query persistence for offline itinerary viewing. |
| 2026-03-08 | F11 | Private Trip Sharing | Implemented email-based collaboration with full edit access and a management dialog. |
| 2026-03-08 | B1 | Meta Tag Cleanup | Updated index.html title and meta tags to Trip Wizard. |
| 2026-03-08 | F10 | Trip Summary | Added editable Trip Summary card at the top of the itinerary and included it in the PDF export. |
| 2026-03-06 | F1 | User-Scoped Trips | Migrated to Supabase DB with email-based identity and automatic local storage migration bridge. |
| 2026-03-06 | B5 | PDF Link New Tab | Optimized PDF link metadata to encourage opening in new browser tabs. |
| 2026-03-06 | B6 | Editor Drop Zone | Restored full drag-and-drop zone in the event editor. |
| 2026-03-06 | B3 | Check-Out Edit | Enabled editing for check-out markers in the timeline and export preview. |
| 2026-03-06 | B4 | Paperclip Cleanup | Removed redundant explicit attachment buttons; cards remain drop-to-update targets. |
| 2026-03-06 | F7 | Editor Consolidation | Simplified event editor by merging 'Attachments' and 'Update Details' into a single 'Update from Document' tool. |
| 2026-03-06 | F4 | AI Parse-on-Drop | Dropping files on activities now triggers an AI sparse-merge update instead of an attachment. |
| 2026-03-06 | B2 | Accommodation Edit Bug | Fixed logic preventing edits on check-in/accommodation entries. |
| 2026-03-06 | F2 | Rich Notes | Multi-line and bulleted notes support in itinerary activities. |
| 2026-03-06 | - | Checklist refinement | AI updates for Phase 1 Interview. |

---
*Note: This file is the primary coordination point for Gemini and Claude. Please maintain the structure for automated parsing.*
