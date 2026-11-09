---
trigger: glob
globs: "**/*.swift,**/Package.swift"
description: "Swift Hooks (applies to **/*.swift, **/Package.swift)"
paths:
  - "**/*.swift"
  - "**/Package.swift"
source: ecc-universal@2.2.3
---
# Swift Hooks

> This file extends the host hook configuration (`.agents/hooks.json`, or `.claude/settings.json` under Claude Code) with Swift specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **SwiftFormat**: Auto-format `.swift` files after edit
- **SwiftLint**: Run lint checks after editing `.swift` files
- **swift build**: Type-check modified packages after edit

## Warning

Flag `print()` statements — use `os.Logger` or structured logging instead for production code.
