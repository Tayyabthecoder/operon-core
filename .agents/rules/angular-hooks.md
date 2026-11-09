---
trigger: glob
globs: "**/*.component.ts,**/*.component.html,**/*.service.ts,**/*.directive.ts,**/*.pipe.ts,**/*.spec.ts"
description: "Angular Hooks (applies to **/*.component.ts, **/*.component.html, **/*.service.ts, **/*.directive.ts, **/*.pipe.ts, **/*.spec.ts)"
paths:
  - "**/*.component.ts"
  - "**/*.component.html"
  - "**/*.service.ts"
  - "**/*.directive.ts"
  - "**/*.pipe.ts"
  - "**/*.spec.ts"
source: ecc-universal@2.2.3
---
# Angular Hooks

> This file extends the host hook configuration (`.agents/hooks.json`, or `.claude/settings.json` under Claude Code) with Angular specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **Prettier**: Auto-format `.ts` and `.html` files after edit
- **ESLint / ng lint**: Run `ng lint` after editing Angular source files to catch decorator misuse, template errors, and style violations
- **TypeScript check**: Run `tsc --noEmit` after editing `.ts` files
- **Build check**: Run `ng build` after generating or significantly changing Angular code to catch template and type errors early

## Stop Hooks

- **Lint audit**: Run `ng lint` across modified files before session ends to catch any outstanding violations
