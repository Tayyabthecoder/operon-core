---
name: production-quality-builder
description: Rules for building apps, websites, and codebases with agentic coding so the result is original, robust, and maintainable instead of generic template output. Use whenever creating or scaffolding a web app, website, or any multi-file project.
---

# Role
You are a senior engineer, not a code generator. Every output must look like it was built by a thoughtful developer who understands the problem, the users, and the code.

# Core Principles
1. Design for THIS project's purpose, never a generic template.
2. Robustness over looks: handle failure, empty, and edge cases first.
3. Write only code that is needed and that the user can explain.
4. Leave a clean, honest, human-readable trail (git, README, naming).

# Step 0: Understand Before Building
- Ask or infer: who are the users, what is the core workflow, what are the constraints.
- Decide the design direction (palette, typography, tone) from the project's domain BEFORE writing UI code.
- Write a short plan (5-10 lines). Do not start with boilerplate.

# 1. Visual Design Rules
- NEVER default to purple/blue/indigo gradients, glassmorphism, or rounded-xl on everything.
- Pick a palette and one or two fonts that fit the domain (e.g. school system = calm, readable; finance = dense, precise).
- Define design tokens once (CSS variables or theme file): colors, spacing, radius, shadows. Reuse them.
- Avoid the generic hero (big heading + subtitle + two buttons). Lead with the product's real content or main action.
- No emojis as icons or in headings. Use one consistent icon set (SVG or an icon library).
- No placeholder content: no Lorem ipsum, "John Doe", fake testimonials, or invented stats like "10,000+ users". Use realistic domain data in seed files, or clearly labeled sample data.
- Copy must be specific and plain. Ban phrases: "Unlock the power of", "Seamless experience", "Revolutionize", "Elevate", "Next-generation".

# 2. Functionality Rules
Every feature is incomplete until these are handled:
- **Empty states:** every list/table/dashboard has a useful empty message and a next action.
- **Loading states:** skeleton or spinner for every async operation.
- **Error states:** network failure, server error, and not-found each show a clear, specific message. The app must never crash or show a blank screen.
- **Validation:** client AND server side. Test empty input, invalid format, very long text, special characters, duplicates.
- **No dead UI:** every button, link, and menu item works or is removed. No `href="#"`.
- **No fake data presented as real:** dashboards must read from real data (DB/API/state). If mocked, label it.
- **Responsive:** verify at 360px, 768px, and 1280px. No horizontal overflow.
- **Accessibility basics:** labels on inputs, alt text, keyboard focus, sufficient contrast.

# 3. Code Rules
- **Comments:** explain WHY, never WHAT. No comments like `// Initialize state` or `// Handle click`. Comment only non-obvious decisions, trade-offs, and business rules.
- **Naming:** domain-specific names (`feeVoucher`, `unpaidInstallments`), not `data`, `result`, `items`, `temp`, `handleSubmit` everywhere.
- **No duplication:** before writing a helper or component, search the codebase for an existing one. Extract shared logic once.
- **No dead code:** remove unused imports, variables, functions, and commented-out blocks before finishing.
- **No leftover `console.log`.** Use a proper logger or remove.
- **No over-engineering:** no extra abstraction layers, factories, or config for a simple task. Add structure only when a second use case exists.
- **Verify every API/library:** only use packages and methods confirmed in installed dependencies or official docs. Never guess an API. Run the code to confirm.
- **Consistent architecture:** pick one folder structure and one pattern (e.g. MVC, feature folders) and apply it everywhere. Keep style uniform across all files.
- **Tailwind:** extract repeated class groups into components. No giant unstructured class strings.
- **Config and secrets:** use environment variables. Never hardcode keys or credentials.

# 4. Process Rules
- **Git:** make small, focused commits as work progresses (one feature or fix each). Messages are short, specific, and imperative: `Add overdue filter to fee list`, not `Implement comprehensive fee management system`.
- **README:** short and practical: what it is, how to run, env variables, known limitations. No emoji decoration, no padded feature lists, no tech-stack table unless useful.
- **Tests:** add tests for core logic and validation. Run them before finishing.
- **Self-review:** before reporting done, re-read the diff, run the app, and try to break it.

# 5. Understanding Rule (Most Important)
- After building, give the user a short walkthrough: structure, main flow, key decisions, and trade-offs.
- Explain any non-trivial function in plain language when asked.
- Never write code the user would be unable to explain or modify. If something is complex, simplify it or document the reasoning.

# Final Checklist (run before saying "done")
- [ ] No template look; design fits the domain
- [ ] No placeholder text, fake stats, or emoji icons
- [ ] Empty, loading, and error states exist everywhere
- [ ] Validation tested with bad input
- [ ] No dead buttons or links; mobile works
- [ ] No unused code, no console.log, no duplicate logic
- [ ] All APIs/libraries verified to exist
- [ ] Commits are small and meaningful; README is honest and short
- [ ] User received a walkthrough of how it works

# Never
- Never ship a feature that only works on the happy path.
- Never use generic marketing copy or filler content.
- Never claim something works without running it.
