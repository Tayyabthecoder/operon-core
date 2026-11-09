---
trigger: glob
globs: "**/*.cs,**/*.csx,**/*.csproj,**/*.sln,**/Directory.Build.props,**/Directory.Build.targets"
description: "C# Hooks (applies to **/*.cs, **/*.csx, **/*.csproj, **/*.sln, **/Directory.Build.props, **/Directory.Build.targets)"
paths:
  - "**/*.cs"
  - "**/*.csx"
  - "**/*.csproj"
  - "**/*.sln"
  - "**/Directory.Build.props"
  - "**/Directory.Build.targets"
source: ecc-universal@2.2.3
---
# C# Hooks

> This file extends the host hook configuration (`.agents/hooks.json`, or `.claude/settings.json` under Claude Code) with C#-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **dotnet format**: Auto-format edited C# files and apply analyzer fixes
- **dotnet build**: Verify the solution or project still compiles after edits
- **dotnet test --no-build**: Re-run the nearest relevant test project after behavior changes

## Stop Hooks

- Run a final `dotnet build` before ending a session with broad C# changes
- Warn on modified `appsettings*.json` files so secrets do not get committed
