# Epic: F9 - Cloud Vault (Google Drive Sync)
**Status**: 🧠 Brainstorming
**Owner**: ♊ Gemini (Architect) / 🤖 Claude (Builder)

## 🎯 Objective
Enable users to automatically back up trip data to Google Drive and link existing Drive files (PDFs, Images) directly to itinerary events.

## 📋 Task Board

### Phase 1: Preparation & Strategy
- [ ] **T9.1: Define Sync Trigger Behavior**
  - **Assignee**: 👤 User
  - **Task**: Decide if sync should be "Manual Export" or "Real-time Auto-save".
- [ ] **T9.2: Select OAuth Scopes**
  - **Assignee**: ♊ Gemini
  - **Task**: Research minimal scopes for `drive.file` vs `drive.appdata` to maximize privacy.

### Phase 2: Infrastructure
- [ ] **T9.3: Provision Google Cloud Project**
  - **Assignee**: 👤 User
  - **Task**: Create a project in Google Cloud Console and enable Drive API.
- [ ] **T9.4: Setup Edge Function Proxy**
  - **Assignee**: ♊ Gemini
  - **Task**: Create `supabase/functions/gdrive-proxy` to handle token exchange.

### Phase 3: UI/UX
- [ ] **T9.5: GDrive Connection Toggle**
  - **Assignee**: 🤖 Claude
  - **Task**: Add "Connect Google Drive" button in user settings/profile.
- [ ] **T9.6: File Picker Integration**
  - **Assignee**: 🤖 Claude
  - **Task**: Integrate Google Picker API for selecting existing files.

---

## 📓 Decision Log / Notes
*   *2026-03-07*: Epic initialized. Hybrid Roadmap architecture adopted.
