---
trigger: glob
globs: "**/*.pl,**/*.pm,**/*.t,**/*.psgi,**/*.cgi"
description: "Perl Hooks (applies to **/*.pl, **/*.pm, **/*.t, **/*.psgi, **/*.cgi)"
paths:
  - "**/*.pl"
  - "**/*.pm"
  - "**/*.t"
  - "**/*.psgi"
  - "**/*.cgi"
source: ecc-universal@2.2.3
---
# Perl Hooks

> This file extends the host hook configuration (`.agents/hooks.json`, or `.claude/settings.json` under Claude Code) with Perl-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **perltidy**: Auto-format `.pl` and `.pm` files after edit
- **perlcritic**: Run lint check after editing `.pm` files

## Warnings

- Warn about `print` in non-script `.pm` files — use `say` or a logging module (e.g., `Log::Any`)
