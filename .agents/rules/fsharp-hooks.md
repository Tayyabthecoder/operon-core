---
trigger: glob
globs: "**/*.fs,**/*.fsx,**/*.fsproj,**/*.sln,**/*.slnx,**/Directory.Build.props,**/Directory.Build.targets"
description: "F# Hooks (applies to **/*.fs, **/*.fsx, **/*.fsproj, **/*.sln, **/*.slnx, **/Directory.Build.props, **/Directory.Build.targets)"
paths:
  - "**/*.fs"
  - "**/*.fsx"
  - "**/*.fsproj"
  - "**/*.sln"
  - "**/*.slnx"
  - "**/Directory.Build.props"
  - "**/Directory.Build.targets"
source: ecc-universal@2.2.3
---
# F# Hooks

> This file extends the host hook configuration (`.agents/hooks.json`, or `.claude/settings.json` under Claude Code) with F#-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **fantomas**: Auto-format edited F# files
- **dotnet build**: Verify the solution or project still compiles after edits
- **dotnet test --no-build**: Re-run the nearest relevant test project after behavior changes

## Stop Hooks

- Run a final `dotnet build` before ending a session with broad F# changes
- Warn on modified `appsettings*.json` files so secrets do not get committed
