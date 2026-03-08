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
| ID | Feature | Description | Target Agent |
| :--- | :--- | :--- | :--- |
| 🟢 Done | **Trip Summary** | Add an editable summary section at the top of the itinerary for trip-wide notes and links. | **♊ Gemini** |
| **F8** | **QR Code / Digital Pass** | Detect and store digital passes (QR codes) in Supabase Storage, linking them to events for offline/quick access. | ♊ Gemini |
| **F9** | **Google Drive Sync** | Automatically back up trip data to Google Drive for cross-device access. | 🤖 Claude |
| **F5** | **Multi-Event Doc Split** | Automatically split a single document into multiple itinerary events if the AI detects more than one. | 🤖 Claude |
| **F6** | **Cloud Link Extraction** | Automatically extract and save document URLs (if available) as event links during AI parsing. | 🤖 Claude |
| **F3** | **PDF Export Styles** | Enhance the visual layout of the PDF export for itineraries. | 🤖 Claude |

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
| 2026-03-08 | F12 | PWA & Offline Support | Added Service Worker, Web Manifest, and React Query persistence for offline itinerary viewing. |
| 2026-03-08 | F11 | Private Trip Sharing | Implemented email-based collaboration with full edit access and a management dialog. |
| 2026-03-08 | B1 | Meta Tag Cleanup | Updated index.html title and meta tags to Itinerary Wizard. |
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
