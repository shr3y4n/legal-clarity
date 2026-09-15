# Legal Clarity - Accessibility Guide (WCAG AA)

## Accessibility Commitment

Legal Clarity is built to meet **WCAG 2.1 Level AA** standards. Legal documents can be dense and intimidating; the interface is designed to maximize readability, tactile keyboard navigation, and screen reader comprehension.

---

## 1. Semantic Structure & Landmarks

The layout is built using semantic HTML5 landmark elements:
- `<header role="banner">`: Application navigation, active document metadata, verification status.
- `<nav role="tablist">`: ARIA-accessible tab switcher (`Understand`, `Review`, `Ask`, `Compare`, `Checklist`, `Lawyer Prep`).
- `<aside>` (Left): Document outline, page jumps, and clause navigation.
- `<main>` (Center): Document canvas containing `<article>` elements for each physical page, and `<section>` elements for identified legal clauses.
- `<aside>` (Right): Contextual analysis and evidence inspection panels.

---

## 2. Keyboard Navigation & Focus Indicators

- All interactive controls (tabs, upload zones, clause anchors, source evidence buttons) are fully keyboard navigable using standard `Tab`, `Enter`, and `Space` keys.
- **Visible Focus Rings**: Every focusable element utilizes high-contrast focus rings:
  ```css
  *:focus-visible {
    outline: 2px solid var(--accent-navy);
    outline-offset: 2px;
  }
  ```
- **Escape Key Behavior**: Modals and evidence inspection dialogs close cleanly on `Escape`.
- **Keyboard Drag & Drop**: The document upload zone supports keyboard activation via `Enter` or `Space`, triggering standard OS file pickers for users unable to drag and drop.

---

## 3. Color Contrast & Non-Color Dependent Statuses

- High contrast text tokens: Primary text `#191919` on paper `#FFFFFF` provides a contrast ratio exceeding **12:1** (well above WCAG AA's 4.5:1 requirement).
- **No Color-Only Indicators**: Attention levels never rely on color alone:
  - `IMPORTANT TO REVIEW`: Red badge combines distinct uppercase text, warning border, and contextual explanation.
  - `REVIEW`: Amber badge combines distinct uppercase text and notice border.
  - `ROUTINE`: Green badge combines distinct uppercase text and checkmark icon.

---

## 4. Screen Reader Compatibility & Live Regions

- Asynchronous operations (document parsing, Q&A generation, comparison diffs) announce progress via `aria-live="polite"` regions.
- Buttons and interactive anchors provide descriptive `aria-label` attributes (e.g. `aria-label="View excerpt on page 2"`).
- Dialogs utilize `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` attributes pointing to dialog headers.
