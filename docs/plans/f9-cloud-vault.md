# Epic: F9 - Cloud Vault (Google Drive Sync)
**Status**: 🧠 Brainstorming
**Owner**: ♊ Gemini (Architect) / 🤖 Claude (Builder)

## 🎯 Objective
Enable users to automatically back up trip data to Google Drive and link existing Drive files (PDFs, Images) directly to itinerary events.

## 📋 Task Board

### Phase 1: Preparation & Strategy
- [x] **T9.1: Define Sync Trigger Behavior**
  - **Assignee**: 👤 User
  - **Decision**: **Real-time Auto-save**. The app will automatically sync changes to GDrive to ensure it "just works" for casual travelers.
- [x] **T9.2: Select OAuth Scopes**
  - **Assignee**: ♊ Gemini
  - **Result**: Selected `https://www.googleapis.com/auth/drive.file`. This allows the app to manage its own files and any files the user explicitly selects via the Picker, without requesting full access to the user's entire Drive.

### Phase 2: Infrastructure
- [x] **T9.3: Provision Google Cloud Project**
  - **Assignee**: 👤 User
  - **Result**: Project created, Drive API enabled, and OAuth credentials generated. Frontend ID and Backend Secret are now in place.
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
*   *2026-03-07*: T9.1 - User selected "Real-time Auto-save" for a seamless, zero-effort experience.
*   *2026-03-07*: T9.2 - Selected `drive.file` scope for maximum user privacy while maintaining full functionality for app-created files.
*   *2026-03-07*: T9.3 - Credentials generated and stored. Note: Client Secret was provided manually due to environment CLI restrictions.
