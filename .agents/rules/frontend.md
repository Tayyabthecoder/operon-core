---
trigger: model_decision
description: Apply frontend engineering standards when designing, implementing, reviewing, or refactoring UI components, pages, layouts, styling, forms, navigation, client-side state, accessibility, and frontend performance.
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.html"
  - "**/*.css"
  - "**/*.scss"
---

# Frontend Engineering and User Interface Standards

This rule establishes standards for creating polished, accessible, responsive, performant, and maintainable user interfaces across any frontend framework or styling architecture. Apply these guidelines when implementing or refactoring UI components, pages, layouts, client state, and design systems.

## 1. Understand the Existing UI

- **Inspect Established Patterns**: Review existing pages, layouts, components, design tokens, and stylesheets before proposing UI changes.
- **Identify Visual Conventions**: Identify established typography, color schemes, spacing scales, border radii, shadows, icon libraries, and interaction behaviors.
- **Reuse Existing Components**: Maximize reuse of existing design system primitives (buttons, inputs, dialogs, dropdowns, tables, cards, navigation bars) rather than building bespoke duplicates.
- **Asset Verification**: Inspect existing icon sets and image assets before importing new graphics or SVGs.
- **Respect Brand Identity**: Preserve existing visual styling and branding unless the user explicitly requests an aesthetic redesign.
- **Localized Blast Radius**: Never modify unrelated screens or redesign global application navigation for a localized feature request.

## 2. Follow the Design System

- **Adhere to Design Tokens**: Use existing design tokens or CSS variables for colors, typography, spacing, border radii, and shadows rather than arbitrary hardcoded values.
- **Consistent Scaling**: Maintain uniform spacing increments and typographic scales matching project conventions.
- **Proportional Greenfield Conventions**: If no design system exists, establish the minimal coherent conventions necessary for the feature without adding unprompted heavy UI frameworks.
- **Theme Consistency**: Ensure components seamlessly support both light and dark themes if supported by the project, maintaining appropriate contrast ratios across modes.
- **No Unwarranted Libraries**: Do not introduce a new component library or CSS framework without explicit justification and alignment.

## 3. Build Reusable Components

- **High Cohesion, Clear Purpose**: Design components around single, well-defined responsibilities. Separate generic, reusable UI primitives from domain-specific page orchestrations.
- **Explicit Interfaces**: Define clear, typed component props/inputs with sensible defaults and predictable event contracts.
- **Configurable Yet Simple**: Provide flexible customization through props, slots, or composition without adding excessive configuration layers.
- **Avoid Extremes**: Avoid monolithic multi-hundred-line components, but avoid creating microscopic wrapper components that provide no isolation or reuse benefit.
- **Backward Compatibility**: Preserve existing component props and behaviors when refactoring shared components to prevent breaking consuming pages.

## 4. Maintain Separation of Concerns

- **Decouple Logic from Presentation**: Separate rendering templates/JSX from complex business logic, data fetching, and state management by leveraging hooks, composables, stores, or service classes.
- **No Domain Logic in Views**: Avoid placing complex business computations, data parsing, or raw API calls directly inside UI presentation components.
- **Framework Idioms**: Follow the architectural idioms of the project's chosen framework (React, Vue, Svelte, Angular, Solid) rather than imposing foreign patterns.
- **Acyclic Imports**: Avoid circular dependencies and inappropriate cross-imports between unrelated feature modules.

## 5. Responsive Design

- **Multi-Device Adaptability**: Design interfaces that adapt cleanly across mobile (phone), tablet, laptop, and wide desktop viewports.
- **Established Breakpoints**: Use the project's established responsive breakpoints rather than introducing arbitrary media queries.
- **Fluid Layouts**: Prefer flexible grid and flexbox structures over rigid, fixed-pixel dimensions.
- **Prevent Overflow**: Guard against horizontal overflow, clipped content, overlapping text, and unclickable controls on small screens.
- **Touch-Friendly Targets**: Ensure interactive touch targets meet accessibility standards (minimum 44x44 CSS pixels on touch devices).
- **Responsive Data Presentation**: For dense data tables on mobile devices, use horizontal scroll containers, card list transformations, or column prioritization rather than unreadable scaled text.

## 6. Visual Quality and UI Polish

- **Cohesive Interface**: Deliver complete, refined UI layouts where spacing, typography, and visual weights align naturally.
- **Clear Visual Hierarchy**: Establish clear visual contrast between headings, body text, primary actions, secondary controls, and metadata.
- **Intentional Whitespace**: Use whitespace deliberately to group related content and prevent visual clutter.
- **Subtle Styling**: Avoid excessive decorative effects (gratuitous gradients, heavy drop shadows, neon accents, or glassmorphism) unless they match the established visual identity.
- **Consistent Iconography**: Maintain uniform icon sizing, stroke widths, and styling across related controls.

## 7. UI States and Interactions

- **Complete State Lifecycle**: Implement every relevant component state: default, hover, active, focus-visible, disabled, loading/skeleton, empty, and error.
- **Immediate Feedback**: Provide visible feedback for user interactions (loading spinners, progress bars, disabled submission states, toast notifications).
- **Prevent Duplicate Submissions**: Disable submission triggers and show pending indicators while asynchronous requests are in flight.
- **Preserve User Input**: Never wipe user-entered form data when a submission or validation fails.
- **Functional Controls**: Never present placeholder buttons or nonfunctional links as completed features.
- **Proportional Confirmations**: Use confirmation modals for irreversible or destructive actions, but avoid interrupting routine, harmless tasks.

## 8. Forms and Client-Side Validation

- **Accessible Labeling**: Explicitly associate every input with an accessible `<label>` or descriptive `aria-label`; never rely on placeholder text as a label substitute.
- **Contextual Inline Errors**: Display clear, actionable validation error messages immediately adjacent to the offending input field.
- **Standardized Form Handling**: Follow the project's established form and validation library (e.g., React Hook Form, Formik, Zod, Yup, VeeValidate).
- **Client Validation as UX Only**: Treat client-side validation purely as an interactive UX convenience; enforce all data validation and authorization on the server (see `security.md`).
- **Protect Sensitive Data**: Mask passwords and prevent sensitive information from being exposed in client logs or unmasked DOM attributes.

## 9. State Management

- **Localize State**: Keep state as close to where it is used as possible. Use local component state for UI toggles, lifted state for sibling coordination, and global stores only for genuinely shared state.
- **Single Source of Truth**: Avoid duplicating or caching derived state that can be computed on the fly.
- **Handle Asynchronous Race Conditions**: Cancel or ignore stale asynchronous responses when rapid user interactions trigger overlapping requests.
- **URL as State**: Synchronize filter parameters, search queries, active tabs, and pagination with URL search params where bookmarking or sharing improves UX.
- **No Client Security Secrets**: Never store sensitive credentials, secrets, or raw authorization decisions in client-side state as a security boundary.

## 10. Routing and Navigation

- **Consistent Routing**: Adhere to the project's routing architecture (file-based or configuration-based).
- **Handle Edge States**: Implement graceful fallback views for 404 Not Found, 403 Forbidden, route loading, and network error states.
- **Deep Linking Integrity**: Ensure dynamic route parameters, query strings, and scroll positions are properly handled and preserved during navigation.
- **Server-Backed Guards**: Ensure frontend route guards mirror and rely upon server-side authorization enforcement.

## 11. API Integration and Data Presentation

- **Centralized Data Fetching**: Use the project's established HTTP client, query caching library (TanStack Query, RTK Query, SWR), or service modules.
- **Loading & Empty States**: Provide clear loading states (preferring content skeletons over blank screens) and informative empty states when no data exists.
- **Graceful Error Recovery**: Handle network drops and server errors gracefully with clear user messages and retry options.
- **No Fake Hardcoded Data**: Avoid hardcoding static mock data to simulate completed features unless explicitly developing mock prototypes.

## 12. Accessibility (a11y)

- **Semantic HTML**: Use native semantic elements (`<button>`, `<nav>`, `<header>`, `<main>`, `<section>`, `<dialog>`, `<table>`) rather than clickable `<div>` elements.
- **Keyboard Navigation**: Ensure all interactive controls are fully operable via keyboard (Tab, Shift+Tab, Enter, Space, Escape, Arrow keys).
- **Visible Focus Indicators**: Ensure all focusable elements have a clear `:focus-visible` indicator; never disable focus outlines without providing an accessible alternative.
- **Accessible Names**: Provide descriptive `aria-label` or screen-reader text for icon-only buttons and graphical controls.
- **Color Contrast**: Ensure text and interactive controls meet WCAG 2.1 AA contrast standards (minimum 4.5:1 for normal text, 3:1 for large text and UI components).
- **Focus Management**: Trap keyboard focus inside active modal dialogs, and restore focus to the triggering element when the modal closes.
- **Respect Reduced Motion**: Honor `@media (prefers-reduced-motion: reduce)` by disabling or minimizing non-essential animations.

## 13. Frontend Security

- **Zero Client-Side Secrets**: Never embed private API keys, backend database credentials, or secret tokens in frontend source code or client environment variables.
- **Mitigate XSS**: Avoid dangerous HTML injection primitives (`innerHTML`, `dangerouslySetInnerHTML`, `v-html`). Rely on framework automatic escaping and sanitization.
- **Sanitize Dynamic Links**: Validate dynamic URLs in `href` and `src` attributes to prevent `javascript:` URI injection.
- **Cross-Reference Security Rules**: Refer to `security.md` for comprehensive application security guidelines.

## 14. Frontend Performance

- **Minimize Re-Renders**: Prevent unnecessary component re-renders through proper component decomposition and judicious memoization (`useMemo`, `useCallback`, computed values).
- **Code Splitting & Lazy Loading**: Lazy-load heavy components, non-critical routes, and third-party visualization libraries.
- **Asset Optimization**: Optimize image dimensions, utilize modern formats (WebP/AVIF), and specify explicit width/height attributes to prevent layout shift (CLS).
- **Virtualization**: Use list virtualization or pagination for large data collections containing hundreds or thousands of DOM nodes.
- **Bundle Discipline**: Avoid importing large monolithic libraries when lightweight alternatives or native standard features suffice.

## 15. Styling and CSS Quality

- **Project Styling Consistency**: Strictly follow the established styling architecture (Tailwind CSS, CSS Modules, Styled Components, Emotion, SCSS, or Vanilla CSS).
- **Avoid Global Pollution**: Prevent style leakage across pages; use scoped styles, CSS modules, or atomic utility classes.
- **Avoid Specificity Wars**: Avoid using `!important` as a workaround for poorly structured CSS cascade issues.
- **No Inline Styles**: Avoid excessive inline styling when the project provides a structured styling or utility system.
- **No Unsolicited Framework Additions**: Do not introduce Tailwind, Bootstrap, or new CSS-in-JS libraries into a project that uses a different styling convention.

## 16. Animation and Motion

- **Purposeful Motion**: Use transitions to communicate state changes, spatial navigation, or user feedback; avoid gratuitous, distracting animations.
- **Performant Properties**: Animate only hardware-accelerated properties (`transform` and `opacity`) to maintain smooth 60fps frame rates.
- **Brief Durations**: Keep transition durations concise (typically 150ms–300ms) to ensure the interface feels snappy.

## 17. UI Testing and Verification

- **Behavior-Driven Testing**: Test user-visible behaviors, form submissions, validation messages, and state transitions using the project's testing tools (e.g., Testing Library, Vitest, Playwright, Cypress).
- **Visual & Responsive Verification**: Verify layouts across mobile, tablet, and desktop viewports; check for text clipping, alignment breaks, and overflow.
- **Accessibility Checks**: Verify keyboard navigation and screen-reader accessibility before declaring features complete.
- **Transparent Reporting**: Report all UI verification checks performed and clearly disclose any untested screen sizes or interaction flows.

## 18. Design and Implementation Decision Principles

When implementing frontend features:
1. **User Experience & Accessibility First**: Usability, clear feedback, and accessible navigation supersede aesthetic novelty or complex visual effects.
2. **Respect Existing UI & Design Systems**: Build upon existing design tokens, components, and styling conventions rather than introducing divergent styles.
3. **Simplicity Over Cleverness**: Choose straightforward, maintainable component structures over speculative, heavily abstracted UI frameworks.
4. **Resilience Across Devices**: Ensure every interface is robust across diverse screen dimensions, input types (mouse, keyboard, touch), and network conditions.
