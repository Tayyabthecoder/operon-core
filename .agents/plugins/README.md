# Plugins Directory

This directory is reserved for plugin extensions, custom MCP tool adapters, and prototype plugins for the AI Agent Engineering Framework.

---

## 1. Current Status

> [!NOTE]
> One plugin is shipped: `operon-safety`, a Claude Code plugin generated from the framework sources. The framework validator checks that every plugin directory listed in section 2 exists, and that the generated plugin still matches its sources.

## 2. Plugin Directories

- `operon-safety/`: Claude Code plugin with the safety hooks, 7 core skills, and the 9 subagents. Do not edit it by hand: run `node .agents/scripts/build-plugin.mjs` after changing the framework (`--check` reports drift). What it leaves out, and why, is in its own `README.md`.

## 3. Installing the Plugin

The repository root has a marketplace file (`.claude-plugin/marketplace.json`) that points at `operon-safety/`. Try it without installing, from a clone:

```bash
claude --plugin-dir .agents/plugins/operon-safety
```

Or add the clone as a local marketplace and install from it:

```bash
claude plugin marketplace add .
claude plugin install operon-safety@operon
```

Check the plugin and marketplace files with `claude plugin validate . --strict`. Nothing here publishes the plugin anywhere.

## 4. Security and Isolation Guidelines

- **Sandboxed Execution**: Plugins operate within sandbox constraints by default (`commandExecutionPolicy: sandbox`).
- **Zero Hardcoded Secrets**: Authentication tokens or API credentials must be passed via environment variables or the platform account broker.
- **Verification**: Any custom tool provided by a plugin must declare explicit argument schemas and pass validation tests before inclusion in production subagents.
