# UI/UX & Design Documentation

This directory contains design tokens, component specifications, style guides, and accessibility conventions for the project's user interfaces.

---

## 1. Purpose & Scope
The artifacts stored in this directory define:
- **Design Tokens**: Canonical colors, typography scales, spacing units, border radii, and elevation values, matching the frontend code.
- **Component Guidelines**: Usage, configurable props, interactive states (default, hover, focus-visible, disabled, loading, empty, error), and responsive behavior of reusable components.
- **Accessibility Conventions**: Verified keyboard shortcuts, focus behavior, required ARIA properties, contrast requirements, and known limitations.
- **Visual Identity**: Established branding and layout conventions that new screens must respect.

---

## 2. Expected Artifacts & Hierarchy
- **Design Token Reference**: Authored as `design-tokens.md`, kept consistent with the actual CSS variables or theme files.
- **Component Specifications**: One document per shared component or pattern, authored as `component-[name].md`.
- **Accessibility Notes**: Verified keyboard and screen-reader behavior per component, authored as `accessibility-[topic].md`. Distinguish automated scan results from manual checks.

---

## 3. Authoring Workflow & Life-cycle
1. **Inspect the Existing UI**: Review current pages, components, and stylesheets before documenting; document what exists and label proposals as `Proposed`.
2. **Use the Design Skills**: Leverage [ui-ux-design](../../.agents/skills/ui-ux-design/SKILL.md) for design decisions and [accessibility](../../.agents/skills/accessibility/SKILL.md) for accessible patterns. Audits belong to [accessibility-audit](../../.agents/skills/accessibility-audit/SKILL.md).
3. **Implementation Alignment**: Keep documented tokens and component behavior synchronized with [frontend-development](../../.agents/skills/frontend-development/SKILL.md) work.
4. **Synchronous Documentation**: When tokens or shared components change, update the matching document in the same change.

---

## 4. Standards & Canonical References
- **Frontend Rule**: [`.agents/rules/frontend.md`](../../.agents/rules/frontend.md)
- **Accessibility Rule**: [`.agents/rules/accessibility.md`](../../.agents/rules/accessibility.md)
- **Documentation Standards**: [`.agents/rules/documentation.md`](../../.agents/rules/documentation.md)

No design-specific template exists yet; follow the structure of the sibling guides in this documentation tree.

---

## 5. Review Checklist
- [ ] Tokens and component behavior described here match the code.
- [ ] Every interactive component documents its keyboard interaction and focus behavior.
- [ ] Contrast ratios are recorded for text and interactive boundaries, with the method used.
- [ ] Known accessibility limitations are stated rather than omitted.
- [ ] Proposed designs are labeled as such and kept separate from implemented ones.
