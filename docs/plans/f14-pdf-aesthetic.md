# Epic: F14 - Minimalist PDF Template
**Status**: 🏃 In Progress (Ready for Claude)
**Owner**: 🤖 Claude (Builder)

## 🎯 Objective
Refine the PDF export aesthetic to a "Minimalist Line Art" style (Option C), moving away from vibrant background colors to a more understated, professional, and clean layout.

## 🎨 Design Direction: Option C
- **Headers**: Remove solid background fills from table headers (`fillColor`).
- **Borders**: Use 0.2pt or 0.5pt bottom borders for sections and table headers.
- **Accents**: Keep small 2-3mm vertical color "pips" next to event titles, but use muted/desaturated tones.
- **Typography**: Slightly increase spacing between lines and sections for a "boutique" feel.
- **Ink-Friendly**: Ensure the document looks excellent even when printed in grayscale.

## 📋 Task Board

### Phase 1: Styling Refactor
- [x] **T14.1: Selection**
  - **Assignee**: 👤 User
  - **Result**: Option C (Minimalist Line Art) selected.
- [x] **T14.2: Implement PDF Aesthetic**
  - **Assignee**: 🤖 Claude
  - **Task**: Modify `src/pages/ExportPreview.tsx` to remove header fills and add line-based styling.
  - **Status**: **Done** — theme switched to `plain`, header fills removed, coloured bottom-border drawn via `didDrawCell`, pips narrowed to 2mm, cover page uses left-rule for summary, all colours desaturated to muted palette.

### Phase 2: Validation
- [x] **T14.3: User Review**
  - **Assignee**: 👤 User
  - **Task**: Generate a PDF from the app and confirm the new look.
  - **Result**: Approved. Three follow-up fixes confirmed resolved: blurry hyperlinked text (didParseCell), notes column link visibility (blue text), and event block page splits (pre-render height estimate).

---

## 📓 Decision Log / Notes
*   *2026-03-07*: Epic initialized. Option C selected by user to replace current vibrant style.
