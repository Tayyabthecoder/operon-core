---
trigger: glob
globs: "**/*.rs,**/Cargo.toml"
description: "Rust Hooks (applies to **/*.rs, **/Cargo.toml)"
paths:
  - "**/*.rs"
  - "**/Cargo.toml"
source: ecc-universal@2.2.3
---
# Rust Hooks

> This file extends the host hook configuration (`.agents/hooks.json`, or `.claude/settings.json` under Claude Code) with Rust-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **cargo fmt**: Auto-format `.rs` files after edit
- **cargo clippy**: Run lint checks after editing Rust files
- **cargo check**: Verify compilation after changes (faster than `cargo build`)
