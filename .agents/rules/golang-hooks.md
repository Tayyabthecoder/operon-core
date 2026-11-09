---
trigger: glob
globs: "**/*.go,**/go.mod,**/go.sum"
description: "Go Hooks (applies to **/*.go, **/go.mod, **/go.sum)"
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
source: ecc-universal@2.2.3
---
# Go Hooks

> This file extends the host hook configuration (`.agents/hooks.json`, or `.claude/settings.json` under Claude Code) with Go specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **gofmt/goimports**: Auto-format `.go` files after edit
- **go vet**: Run static analysis after editing `.go` files
- **staticcheck**: Run extended static checks on modified packages
