---
trigger: glob
globs: "**/*.py,**/*.pyi"
description: "Python Hooks (applies to **/*.py, **/*.pyi)"
paths:
  - "**/*.py"
  - "**/*.pyi"
source: ecc-universal@2.2.3
---
# Python Hooks

> This file extends the host hook configuration (`.agents/hooks.json`, or `.claude/settings.json` under Claude Code) with Python specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **black/ruff**: Auto-format `.py` files after edit
- **mypy/pyright**: Run type checking after editing `.py` files

## Warnings

- Warn about `print()` statements in edited files (use `logging` module instead)
