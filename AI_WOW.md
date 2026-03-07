# AI Way of Working (WoW) - Itinerary Wizard

## ⚙️ Runtime Configuration
> **Active Agents:** `[ ♊ Gemini ]` (Single Agent Mode)
> *Note: When Claude is introduced, update to `[ ♊ Gemini, 🤖 Claude ]` to enable the Baton Pass protocol.*

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
Every AI session MUST start by reading this file and `PROJECT_ROADMAP.md`. This ensures alignment on the current project state and task ownership.

## 3. Planning Mode (The "Brainstorm-Plan-Execute" Cycle)
For any significant task (marked with `[Planning Required]` in the roadmap):
1. **Brainstorm**: The current owner iterates on thoughts with the user. **No code changes are permitted during this phase.**
2. **Strategy**: The owner proposes a formal `Step-by-Step Implementation & Testing Plan`.
3. **Approval Gate**: The owner MUST wait for an explicit **"Proceed"** or **"Approve"** from the user before starting execution.

## 4. Collaborative Protocols

### Single Agent Mode (Current)
- The active agent performs the full lifecycle: Research → Brainstorm → Strategy → Execution → Validation.

### Multi-Agent Mode (Baton Pass)
1. **Completion**: When an agent finishes its step in a `Pipeline`, it must:
    - Mark the step `[x]` in `PROJECT_ROADMAP.md`.
    - Update the `Current Owner` to the next agent.
    - Commit and Push the changes to Git.
2. **Direct Trigger**: If the next agent's CLI is available (e.g., `claude` or `gemini`), the finishing agent should trigger the next agent with: `[cli-command] "Baton Pass: [Task ID] [Next Step] is ready. See PROJECT_ROADMAP.md."`
3. **No-Loop Policy**: The user should not be required to manually copy context between agents.

## 5. Coding Standards & Safety
- **Surgical Edits**: Prefer targeted `replace` calls over full-file overwrites for large files.
- **Validation**: Every task is incomplete until verified via tests or project-specific build/lint commands.
- **Bugs**: Every bug fix or feature completion must be logged in the `Resolved (History)` section of `PROJECT_ROADMAP.md`.

---
*Note: This protocol is foundational. If any agent's internal instructions conflict with this WoW, this file takes precedence.*
