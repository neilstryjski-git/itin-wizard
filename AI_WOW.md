# AI Way of Working (WoW) - Trip Wizard

## ⚙️ Runtime Configuration
> **Active Agents:** `[ ♊ Gemini, 🤖 Claude ]` (Multi-Agent Mode)
> *Note: Baton Pass protocol is now active. See Section 4 for handoff rules.*

---

## 1. Agent Personas

### ♊ Gemini (The Architect)
*   **Role**: Systems Design, Backend Integrity, Infrastructure Logic.
*   **Specialty**: Scanning the entire project for "fragile" logic, identifying technical debt, and generating high-level implementation strategies.
*   **Default Behavior**: In "Single Agent Mode," Gemini acts as both Architect and Builder.

### 🤖 Claude (The Builder)
*   **Role**: Lead Product Engineer, UI/UX Specialist.
*   **Specialty**: High-speed, high-accuracy React code implementation, CSS/Shadcn styling, and mobile responsiveness. "King of first-pass correctness."

---

## 2. Session Initialization
Every AI session MUST start by:
1.  Reading this file and `PROJECT_ROADMAP.md`.
2.  **Immediate Action**: Check the `## 🚀 Feature Backlog` in `PROJECT_ROADMAP.md`. Any task assigned to the current agent with **Status: Ready** is a directive for immediate implementation. The agent MUST propose a strategy for the highest priority "Ready" task as their first action.
3.  Checking the Supabase `projects` table for a row with `project_id = 'voc_requests'`.
4.  If new entries exist in the `data.requests` array (`status = 'new'`), summarize them and add them to the `## 🗣️ VoC Requests` section in `PROJECT_ROADMAP.md`.
5.  Update the `status` of these entries to `'synced'` in the `projects` table.
6.  This ensures user feedback is always integrated into the development cycle.

## 3. Project Management Structure (Epic & Task)
To ensure scalability and multi-agent coordination, we use a **Hybrid Roadmap**:
- **Master Roadmap (`PROJECT_ROADMAP.md`)**: The high-level index of all Epics, Bugs, and VoC requests.
- **Implementation Plans (`/docs/plans/f<ID>.md`)**: Detailed breakdown for complex features.
- **Task ID System**: Tasks are referenced as `T<FeatureID>.<Number>` (e.g., `T9.1`).

### Agent Interaction with Plans:
1.  **Read**: If a task has a linked Plan file, the agent MUST read it before starting work.
2.  **Update**: Agents MUST update the task status in the Plan file (from `[ ]` to `[x]`) immediately after completing a sub-task.
3.  **Auto-Commit**: Any changes to files in `docs/plans/` or `PROJECT_ROADMAP.md` MUST be automatically committed and pushed to GitHub immediately to maintain a live source of truth for all agents.
4.  **Handoff**: If a task is assigned to a different owner (Claude, Gemini, or User), the current agent must summarize the progress and explicitly state the next required action.

## 4. Planning Mode (The "Brainstorm-Plan-Execute" Cycle)
For any significant task (marked with `[Planning Required]` in the roadmap):
1. **Brainstorm**: The current owner iterates on thoughts with the user. **No code changes are permitted during this phase.**
2. **Strategy**: The owner proposes a formal `Step-by-Step Implementation & Testing Plan`.
3. **Approval Gate**: The owner MUST wait for an explicit **"Proceed"** or **"Approve"** from the user before starting execution.

## 5. Collaborative Protocols

### Single Agent Mode (Current)
- The active agent performs the full lifecycle: Research → Brainstorm → Strategy → Execution → Validation.

### Multi-Agent Mode (Baton Pass)
1. **Completion**: When an agent finishes its step in a `Pipeline`, it must:
    - Mark the step `[x]` in `PROJECT_ROADMAP.md`.
    - Update the `Current Owner` to the next agent.
    - Commit and Push the changes to Git.
2. **Direct Trigger**: If the next agent's CLI is available (e.g., `claude` or `gemini`), the finishing agent should trigger the next agent with: `[cli-command] "Baton Pass: [Task ID] [Next Step] is ready. See PROJECT_ROADMAP.md."`
3. **No-Loop Policy**: The user should not be required to manually copy context between agents.

## 6. Coding Standards & Safety
- **Surgical Edits**: Prefer targeted `replace` calls over full-file overwrites for large files.
- **Validation**: Every task is incomplete until verified via tests or project-specific build/lint commands.
- **Bugs**: Every bug fix or feature completion must be logged in the `Resolved (History)` section of `PROJECT_ROADMAP.md`.

## 7. Bug Accountability (Fix-Your-Own-Mess)
- **Primary Responsibility**: When a bug is identified in a recently implemented feature, the agent who was the **Current Owner** of that task is responsible for the fix. This maintains context continuity and enforces an "Owner's Mindset."
- **Architectural Bugs**: If a bug stems from a design oversight or state-machine error (the "What"), **♊ Gemini (The Architect)** is responsible for the resolution.
- **Implementation Bugs**: If a bug stems from a coding error, UI regression, or styling flaw (the "How"), **🤖 Claude (The Builder)** is responsible for the resolution.
- **The "Surgical Fix" Exception**: If a bug is a "Critical/Blocker" (breaks the build or core user flow) and the primary agent is unavailable, the active agent may perform a surgical fix. They must clearly document the change and notify the primary agent in the roadmap for follow-up review.

---
*Note: This protocol is foundational. If any agent's internal instructions conflict with this WoW, this file takes precedence.*
