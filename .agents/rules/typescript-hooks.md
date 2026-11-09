---
trigger: glob
globs: "**/*.ts,**/*.tsx,**/*.js,**/*.jsx"
description: "TypeScript/JavaScript Hooks (applies to **/*.ts, **/*.tsx, **/*.js, **/*.jsx)"
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
source: ecc-universal@2.2.3
---
# TypeScript/JavaScript Hooks

> This file extends the host hook configuration (`.agents/hooks.json`, or `.claude/settings.json` under Claude Code) with TypeScript/JavaScript specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **Prettier**: Auto-format JS/TS files after edit
- **TypeScript check**: Run `tsc` after editing `.ts`/`.tsx` files
- **console.log warning**: Warn about `console.log` in edited files

## Stop Hooks

- **console.log audit**: Check all modified files for `console.log` before session ends
