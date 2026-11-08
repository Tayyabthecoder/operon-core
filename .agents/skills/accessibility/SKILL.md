---
name: accessibility
description: Designs and implements accessible user interfaces, components, forms, navigation, dialogs, and interaction patterns. Covers semantic HTML, keyboard operation, focus management, screen-reader support, contrast, accessible feedback, responsive behavior, motion preferences, and inclusive interaction design. Use when building, modifying, or fixing application UI and interactive components. For auditing an existing UI against WCAG without building changes, use accessibility-audit instead.
---

# Accessibility and Inclusive Interface Implementation Skill

Design, build, modify, and verify accessible user interfaces, interactive components, responsive layouts, forms, and design systems across web and client applications, treating accessibility as a fundamental engineering requirement rather than a post-launch cosmetic patch.

## 1. Purpose, Core Principles, and Accessible Engineering Mindset

The governing mandate of accessible engineering is:
**Build interfaces that people with different abilities can perceive, understand, navigate, and operate. Prefer semantic, native, and maintainable solutions, and verify important behavior instead of assuming that an interface is accessible because it looks correct.**

Core principles:
- **Perceivable, Operable, Understandable, Robust (POUR)**: Interface controls must be presentable across diverse sensory modalities, input methods, and assistive APIs.
- **Native Semantics First**: Prioritize native browser elements over custom scripted containers whenever possible.
- **Universal Keyboard Access**: Every interactive action must be fully operable via keyboard without exception.
- **Visible, Predictable Focus**: Keep focus visible, stable, and managed across dynamic DOM lifecycles.
- **Honest Verification**: Distinguish empirical human verification from automated lint checks; never claim unverified compliance.
- **Continuous Discipline**: *Understand* $\rightarrow$ *Structure* $\rightarrow$ *Label* $\rightarrow$ *Keyboard* $\rightarrow$ *Style* $\rightarrow$ *Test* $\rightarrow$ *Verify*.

## 2. Target File, Scope, Boundaries, and Skill File Standards

This skill governs practical interface authoring and component engineering throughout application development:
- **Component Development**: Buttons, links, navigation bars, dropdowns, dialogs, tabs, accordions, and data tables.
- **Form Engineering**: Input fields, validation states, error summaries, instructions, and submission handling.
- **Visual Presentation**: Color contrast, typographic readability, responsive reflow, and theme consistency.
- **Assistive Technologies**: Accessible naming, ARIA states, live announcements, and landmark hierarchy.
- **Boundaries**: Coordinate evaluation with [accessibility-audit](../accessibility-audit/SKILL.md), design tokens with [ui-ux-design](../ui-ux-design/SKILL.md), client architecture with [frontend-development](../frontend-development/SKILL.md), and automated test suites with [testing-qa](../testing-qa/SKILL.md).

## 3. Defining Skill Purpose: Implementation vs. Accessibility Audits

Distinguish daily accessible UI implementation from formal accessibility auditing:

| Engineering Dimension | Implementation Skill (`accessibility`) | Audit Skill (`accessibility-audit`) |
| :--- | :--- | :--- |
| **Primary Focus** | Proactive design, authoring, and accessible component building | Formal inspection, barrier discovery, and compliance evaluation |
| **Lifecycle Phase** | Active development, feature implementation, UI refactoring | Pre-release gates, regression audits, accessibility remediation |
| **Artifact Output** | Accessible component code, templates, styling, and DOM structure | Prioritized audit findings, severity ratings, violation evidence |
| **Verification Scope** | In-process developer checks, unit tests, keyboard manual checks | Systematic multi-screen review, screen-reader matrix, WCAG mapping |

*Principle*: When building features, apply this skill. When performing a comprehensive assessment of existing software, invoke [accessibility-audit](../accessibility-audit/SKILL.md).

## 4. Applying Accessibility Standards: WCAG Principles and Conformance Targets

Anchor UI implementation in the Web Content Accessibility Guidelines (WCAG):
- **Four Principles**: Ensure all content is Perceivable, Operable, Understandable, and Robust.
- **Target Conformance**: Target WCAG 2.2 Level AA as the practical engineering baseline for web interfaces.
- **Exceptions & Honesty**: Respect criterion-specific exceptions; never claim compliance without test evidence.

## 5. Preferring Native Semantic HTML Over Custom Abstractions

Rely on native browser elements to provide built-in keyboard support and roles:
- **Buttons vs. Links**: Use `<button>` for direct actions; use `<a href>` exclusively for navigation.
- **Structure & Landmarks**: Structure documents with `<main>`, `<nav>`, `<header>`, and `<footer>`.
- **Form Controls & Containers**: Use native form tags; never attach click listeners to `<div>` or `<span>`.

## 6. Authoring ARIA Correctly: Roles, States, Properties, and Live Regions

Apply WAI-ARIA only when native HTML semantics cannot convey required states:
- **First Rule of ARIA**: If a native HTML element provides the required behavior, use it instead of ARIA.
- **State Synchronization**: Keep `aria-expanded`, `aria-selected`, and `aria-checked` synchronized with state.
- **No Keyboard Substitute**: Assigning ARIA roles does not implement keyboard handling; verify IDs exist.

## 7. Universal Keyboard Navigation and Interaction Patterns

Ensure every interactive feature is completely operable using standard keyboard controls:
- **Standard Navigation**: Support Tab/Shift+Tab for focus traversal; Enter and Space for activation.
- **Composite Widgets**: Implement Arrow key navigation for tablists, menus, and custom listboxes.
- **Escape Dismissal & Tabindex**: Support Escape dismissal; use `tabindex="0"` or `-1`, never positive numbers.

## 8. Focus Management: Lifecycles, Traps, Restoration, and Visibility

Manage keyboard focus explicitly across component opening, closing, and transitions:
- **Modal Lifecycle**: Shift focus into modals on open, constrain Tab cycling, and restore on close.
- **Route & Error Focus**: Focus the main container on route transitions; focus errors on failed submissions.
- **Visible Outlines**: Ensure focus indicators remain clearly visible and never obscured by sticky headers.

## 9. Accessible Names, Labels, Descriptions, and Instructions

Provide clear accessible names so assistive technologies accurately convey control intent:
- **Descriptive Action Labels**: Ensure button labels describe the exact action ("Save Draft") clearly.
- **Associated Form Labels**: Pair every form field with an explicit `<label for="id">` or wrapping `<label>`.
- **Icon Controls & No Placeholder**: Provide `aria-label` for icon buttons; never rely on placeholder text.

## 10. Accessible Forms, Error Association, and Inline Validation

Construct accessible forms that guide users through data entry, validation, and recovery:
- **Input Types & Autocomplete**: Use `type="email"`, `type="tel"`, and appropriate `autocomplete` attributes.
- **Error Association**: Connect field error messages to inputs using `aria-describedby` and `aria-invalid="true"`.
- **Clear Guidance & Input Preservation**: State actionable corrections clearly; never wipe user input on error.

## 11. Color Contrast, Palette Tokens, and Non-Color State Indicators

Maintain legible visual boundaries and never rely on color alone to communicate state:
- **Contrast Ratios**: Maintain $\ge 4.5:1$ for normal text, $\ge 3:1$ for large text, and $\ge 3:1$ for UI controls.
- **Palette Tokens & Themes**: Guarantee compliant contrast across light and dark themes using tokens.
- **Non-Color Indicators**: Combine color with icons, text badges, underlines, or distinct patterns to convey alerts and states.

## 12. Typography, Spacing, Content Readability, and Text Resizing

Format textual content for clarity, reading comfort, and resilience under user sizing:
- **Fluid Typography**: Use relative units (`rem`, `em`) for typography so text scales gracefully with zoom.
- **Spacing & Zoom Resilience**: Maintain line height $\ge 1.5$; ensure layouts survive 200% text zoom.
- **Plain Language**: Write concise, direct headings, error messages, and operational instructions.

## 13. Responsive Design, Viewport Zoom, Reflow, and Touch Targets

Adapt interfaces smoothly across screen dimensions, orientations, and touch surfaces:
- **Never Disable Zoom**: Never set `maximum-scale=1.0` or `user-scalable=no` in viewport metadata tags.
- **Reflow Support**: Support 320px viewport width without content clipping or horizontal scrolling.
- **Touch Target Dimensions**: Maintain touch targets of at least $24 \times 24$ CSS px (WCAG 2.2 AA) with adequate spacing, or $44 \times 44$ px for comfortable touch operation.

## 14. Buttons, Links, Actions vs. Navigation, and Sizing Standards

Differentiate navigation from actions to set correct user expectations:
- **Semantic Separation**: Links navigate between URLs; buttons perform actions or toggle states.
- **Self-Describing Context**: Provide descriptive link text; avoid generic phrases like "Click here".
- **No Hover Exclusivity**: Ensure interactive options are actionable via keyboard and touch without hover.

## 15. Modals, Dialogs, Menus, Tabs, Accordions, and Tooltips

Implement complex composite widgets according to standardized WAI-ARIA authoring practices:
- **Modal Dialogs**: Apply `role="dialog"`, `aria-modal="true"`, trap Tab focus, and restore focus on close.
- **Tabs & Menus**: Structure tabs with `tablist` and `tabpanel`; reserve `role="menu"` for desktop menus.
- **Accordions & Tooltips**: Toggle headers with `aria-expanded`; ensure tooltip content is dismissible via Escape.

## 16. Screen-Reader and Assistive-Technology Architecture

Expose an accurate, predictable representation of interface structure to accessibility APIs:
- **Landmark Organization**: Use `<main>`, `<nav>`, `<header>`, and `<aside>` to structure screen-reader navigation.
- **Heading Outline**: Maintain an unbroken heading hierarchy (`h1` through `h6`) reflecting document structure.
- **Titles & Concealment**: Update document `<title>` on route changes; use `aria-hidden="true"` only on decorative items.

## 17. Images, Icons, SVG Assets, and Alternative Text Standards

Equip visual assets with text descriptions tailored to their functional role:
- **Informative Images**: Provide concise, context-aware `alt` text conveying the visual information.
- **Decorative Assets**: Set `alt=""` or `aria-hidden="true"` on decorative icons to avoid vocal clutter.
- **Functional Icons & No File Names**: Provide names for icon controls; never use filenames or "image of" in alt.

## 18. Charts, Data Visualizations, Dashboards, and Data Tables

Make complex graphical insights and tabular data interpretable without visual perception:
- **Chart Descriptions**: Accompany data visualizations with text summaries explaining trends and key points.
- **Accessible Data Tables**: Provide accessible data table alternatives for complex charts and diagrams.
- **Semantic Table Controls**: Use `<table>`, `<caption>`, `<th>` scopes, and ensure column sorting is keyboard-operable.

## 19. Loading States, Progress Indicators, and Dynamic Feedback

Communicate asynchronous background operations and dynamic content changes politely:
- **Live Regions**: Use `aria-live="polite"` for non-urgent feedback; reserve `aria-live="assertive"` for alerts.
- **Progress Indicators**: Equip progress bars with `role="progressbar"`, `aria-valuenow`, and min/max bounds.
- **Non-Visual Signals**: Announce loading completion clearly; never indicate status solely through color shifts.

## 20. Motion Preferences, Animations, Flashing Safety, and Time Limits

Respect user sensory constraints, motion sensitivities, and cognitive processing time:
- **Reduced Motion**: Respect `prefers-reduced-motion: reduce` by disabling non-essential transitions, large zooms, and autoplaying loops.
- **Flashing Safety**: Never exceed 3 flashes per second to avoid triggering photosensitive reactions.
- **Time Limits**: Provide options to adjust, extend, or disable session timeouts and form constraints.

## 21. Accessible Error Prevention, Confirmation, and Mistake Recovery

Assist users in avoiding, identifying, and recovering from errors during sensitive interactions:
- **Action Confirmation**: Provide explicit confirmation steps for irreversible or destructive operations.
- **Reversibility & Retention**: Allow users to review and modify data submissions; retain inputs on failure.
- **Actionable Guidance**: Pair every error notice with actionable instructions on how to resolve the issue.

## 22. Accessible Authentication, MFA, and Critical Workflow Security

Deliver accessible identity verification while preserving robust application security:
- **Credential Fields**: Support password managers with appropriate `autocomplete` attributes.
- **Password Visibility**: Provide accessible toggle buttons to reveal and mask password text.
- **Accessible MFA & Privacy**: Support accessible MFA alternatives; never output secrets to live regions.

## 23. Framework-Specific Accessibility: Components, Props, and SPAs

Architect accessible UI component libraries within modern frontend framework lifecycles:
- **Prop Forwarding**: Ensure custom component wrappers forward necessary HTML attributes, refs, and ARIA props.
- **Deterministic IDs**: Generate unique, collision-free element IDs for label and error associations.
- **Lifecycle & Routing**: Clean up event listeners on unmount; announce route changes and focus new views.

## 24. CSS Architecture, Focus Outlines, Tokens, and Theme Consistency

Translate accessibility requirements into robust, maintainable stylesheet architectures:
- **Preserve Focus Visible**: Style `:focus-visible` with high-contrast outlines; never write `outline: none` without an equally visible focus style.
- **Contrast Tokens**: Maintain color tokens that guarantee compliant contrast ratios in light and dark modes.
- **Resilient Layouts**: Avoid fragile positioning that breaks under text resize; use rem-based padding.

## 25. Localization, Internationalization, RTL Layouts, and Directionality

Support multi-language users, diverse writing directions, and localized interface conventions:
- **Language Tags**: Declare `lang` on root `<html>`; mark language shifts inline using `<span lang="...">`.
- **Bidirectional Support**: Support right-to-left (RTL) reading directions using logical CSS properties.
- **Directional Icons & Labels**: Mirror directional icons in RTL; ensure translated labels remain descriptive.

## 26. In-Process Accessibility Testing: Manual Checks and Automated Linters

Integrate continuous accessibility checks into routine developer workflows:
- **Keyboard Walkthrough**: Verify every interactive flow using only Tab, Shift+Tab, Enter, Space, and Escape.
- **Automated Linters**: Run automated accessibility tests (axe-core, eslint-plugin-jsx-a11y) as supporting checks.
- **Limitation Transparency**: Acknowledge that automated scans catch only ~30–40% of potential barriers.

## 27. Definition of Done (DoD) for Accessible Interface Implementation

Complete accessible implementation tasks only when all applicable criteria pass:
- [ ] 1. **Semantic HTML**: Native tags used for buttons, links, landmarks, headings, and lists.
- [ ] 2. **Accessible Names**: All interactive controls, icon buttons, and inputs have clear names.
- [ ] 3. **Keyboard Operation**: Features operable via Tab, Enter, Space, Arrows, and Escape.
- [ ] 4. **Focus Management**: Visible focus indicator present; focus restored on overlay close.
- [ ] 5. **ARIA Synchronized**: States match UI reality; native elements preferred over ARIA.
- [ ] 6. **Forms Accessible**: Labels paired; errors linked via `aria-describedby`; inputs preserved.
- [ ] 7. **Color Contrast**: Meets $\ge 4.5:1$ text and $\ge 3:1$ UI boundaries across all themes.
- [ ] 8. **Non-Color Indicators**: Status communicated via text, icons, or patterns alongside color.
- [ ] 9. **Responsive & Zoom**: Layout reflows cleanly at 320px; zoom functions up to 200%.
- [ ] 10. **Touch Targets**: Minimum target dimensions ($24\times 24$ px or $44\times 44$ px) respected.
- [ ] 11. **Alternative Text**: Informative graphics described; decorative assets hidden cleanly.
- [ ] 12. **Motion Preferences**: Non-essential transitions disabled under reduced-motion mode.
- [ ] 13. **Dynamic Feedback**: Asynchronous updates announced politely via live regions.
- [ ] 14. **Regression Safety**: Existing component functionality and unit tests remain intact.
- [ ] 15. **Limitations Documented**: Untested screen-reader pairings and audit needs disclosed.

## 28. Standardized Accessibility Implementation Completion Report Template

Document final implementation results using this structured report format:

```markdown
# Accessibility Implementation Report: [Component / Feature Name]
### 1. Accessibility Improvements
- [Accessible interactions, semantic elements, and markup updates implemented]

### 2. Components and Files Changed
- [Modified component files, templates, styles, and test suites]

### 3. Keyboard and Focus Behavior
- [Tab order, shortcut keys, Escape dismissal, and focus management details]

### 4. Semantics and Assistive Technology
- [Accessible names, ARIA states, live announcements, and landmark structure]

### 5. Verification Results
| Verification Check | Method | Target / Standard | Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| Keyboard Navigation | Manual | Full keyboard operability | Tab/Enter/Space/Esc work | PASS |
| Visible Focus | Manual | High-contrast outline | `:focus-visible` distinct | PASS |
| Color Contrast | Automated/Inspector | WCAG 2.2 AA ($\ge 4.5:1$) | Measured 5.8:1 | PASS |
| Form Error Association | Manual/DOM | `aria-describedby` linked | Error linked to input | PASS |
| Automated Scan | axe-core / linter | Zero high-severity issues | 0 violations found | PASS |

### 6. Remaining Limitations & Audit Scope
- [Untested screen reader pairings or complex flows requiring a formal audit]
```

## 29. Avoiding Common Accessibility Anti-Patterns and Implementation Mistakes

Avoid these frequent accessibility regressions and anti-patterns during development:
- **Clickable Divs**: Adding click listeners to `<div>` or `<span>` instead of native `<button>` or `<a>`.
- **Outline Suppression**: Setting `outline: none` in CSS without providing an equally visible focus style.
- **Placeholder as Label**: Omitting persistent form labels and relying on input placeholder text alone.
- **Color-Only States**: Using red and green text or borders as the sole indicators of error or success.
- **ARIA as Magic Bullet**: Adding ARIA attributes expecting them to implement keyboard handlers.
- **Positive Tabindex**: Forcing custom tab navigation order using `tabindex="1"` or higher numbers.
- **Disabled Zooming**: Adding `user-scalable=no` to viewport meta tags to prevent layout reflow.
- **Redundant Alt Text**: Writing "Image of..." or "Graphic showing..." in alternative text fields.
- **Unannounced Errors**: Displaying visual validation banners without linking them to inputs.
- **Automated Hubris**: Claiming 100% WCAG compliance solely because an automated scan passed.

## 30. Avoiding Duplication with Existing Skills and Repository Rules Alignment

Coordinate accessibility implementation with related capabilities:
- [accessibility-audit](../accessibility-audit/SKILL.md): Formal audits and compliance evaluation.
- [ui-ux-design](../ui-ux-design/SKILL.md): Design tokens, palettes, and wireframes.
- [frontend-development](../frontend-development/SKILL.md): Client component architecture and patterns.
- [testing-qa](../testing-qa/SKILL.md): Automated regression testing and test suites.
- [end-to-end-testing](../end-to-end-testing/SKILL.md): Browser-driven workflow verification.
- [security-review](../security-review/SKILL.md): Authentication security and secret hygiene.
- [feature-implementation](../feature-implementation/SKILL.md): End-to-end feature authoring and integration.
- [code-review](../code-review/SKILL.md): Peer inspection and quality gates.
- [documentation](../documentation/SKILL.md): Component documentation and runbooks.
- [api-development](../api-development/SKILL.md): Server validation schemas and error contracts.
- [performance-optimization](../performance-optimization/SKILL.md): Rendering efficiency and bundle sizing.
- [authentication-authorization](../authentication-authorization/SKILL.md): Identity management and session flows.

Repository rules alignment:
- [accessibility.md](../../rules/accessibility.md): Mandatory accessibility engineering standards.
- [frontend.md](../../rules/frontend.md): Client component architecture and styling.
- [coding-standards.md](../../rules/coding-standards.md): Code clarity and formatting conventions.
- [testing.md](../../rules/testing.md): Automated testing standards and determinism.
- [security.md](../../rules/security.md): Client credential protection and data handling.
- [change-safety.md](../../rules/change-safety.md): Non-destructive modification and safety.
- [architecture.md](../../rules/architecture.md): Modular component decoupling and boundaries.
- [core-workflow.md](../../rules/core-workflow.md): Plan, execute, verify, and report workflow.

## 31. 10-Point Pre-Flight Accessibility Validation Checklist

Verify all 10 criteria before finalizing any UI implementation or component modification:
- [ ] 1. **Native Semantics**: Proper semantic tags used for buttons, links, headings, and landmarks.
- [ ] 2. **Accessible Names**: All interactive controls have meaningful, unique, and accessible names.
- [ ] 3. **Keyboard Navigable**: Complete feature workflow operable via Tab, Enter, Space, and Arrows.
- [ ] 4. **Visible Focus**: Every focusable element displays an unambiguous, high-contrast focus indicator.
- [ ] 5. **Focus Lifecycle Managed**: Focus trapped in modals, restored on close, and set on route changes.
- [ ] 6. **Forms & Errors Linked**: Form inputs have associated labels and errors connected via `aria-describedby`.
- [ ] 7. **Color Contrast Verified**: Text and controls meet WCAG 2.2 AA contrast in light and dark modes.
- [ ] 8. **Non-Color Indicators**: Errors, alerts, and states conveyed through text or icons alongside color.
- [ ] 9. **Responsive & Zoom Safe**: Content reflows cleanly at 320px width without horizontal scrollbars.
- [ ] 10. **Limitations Disclosed**: Implementation report notes any untested assistive tech or needed audits.