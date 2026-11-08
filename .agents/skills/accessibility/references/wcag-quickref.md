# WCAG 2.1 AA Quick Reference & ARIA Checklist

This reference summarizes WCAG 2.1 Level AA conformance requirements and common accessibility audit patterns for web components.

---

## 1. Perceivable

- **1.1.1 Non-text Content**: All images, icons, and non-text elements have meaningful `alt` text or `aria-hidden="true"` if purely decorative.
- **1.3.1 Info and Relationships**: Semantic HTML tags (`<nav>`, `<header>`, `<main>`, `<footer>`, `<aside>`, `<h1>`-`<h6>`) reflect structure. Do not use generic `<div>` for interactive components.
- **1.4.3 Contrast (Minimum)**: Text contrast ratio of at least 4.5:1 for regular text, and 3:1 for large text (18pt / 24px regular or 14pt / 18.5px bold).
- **1.4.11 Non-text Contrast**: Visual boundaries of UI components and graphical objects must meet at least 3:1 contrast against adjacent background colors.

---

## 2. Operable

- **2.1.1 Keyboard Accessible**: Every interactive control must be navigable and actionable using only the keyboard (`Tab`, `Shift+Tab`, `Enter`, `Space`, arrow keys).
- **2.1.2 No Keyboard Trap**: Focus must never become trapped within modal dialogs, date pickers, or third-party widgets.
- **2.4.3 Focus Order**: Logical navigation sequence that preserves meaning and operability.
- **2.4.7 Focus Visible**: Never suppress outline styling (`outline: none` without replacement). Custom focus indicators must achieve at least 3:1 contrast.

---

## 3. Understandable

- **3.1.1 Language of Page**: Top-level `<html>` tag declares a valid ISO language attribute (e.g., `<html lang="en">`).
- **3.3.1 Error Identification**: Form errors are explicitly announced via ARIA live regions (`aria-live="polite"`) or associated with inputs via `aria-describedby`.
- **3.3.2 Labels or Instructions**: All input fields have explicit `<label for="...">` associations.

---

## 4. Robust

- **4.1.2 Name, Role, Value**: Custom interactive widgets declare appropriate ARIA roles (`role="dialog"`, `role="combobox"`, `role="tab"`), state attributes (`aria-expanded`, `aria-selected`, `aria-checked`), and accessible names.
