---
trigger: glob
globs: "**/*.kt,**/*.kts,**/build.gradle.kts"
description: "Kotlin Hooks (applies to **/*.kt, **/*.kts, **/build.gradle.kts)"
paths:
  - "**/*.kt"
  - "**/*.kts"
  - "**/build.gradle.kts"
source: ecc-universal@2.2.3
---
# Kotlin Hooks

> This file extends the host hook configuration (`.agents/hooks.json`, or `.claude/settings.json` under Claude Code) with Kotlin-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **ktfmt/ktlint**: Auto-format `.kt` and `.kts` files after edit
- **detekt**: Run static analysis after editing Kotlin files
- **./gradlew build**: Verify compilation after changes
