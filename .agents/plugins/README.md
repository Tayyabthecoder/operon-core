# Plugins Directory

This directory is reserved for plugin extensions, custom MCP tool adapters, and prototype plugins for the AI Agent Engineering Framework.

---

## 1. Current Status

> [!NOTE]
> No plugins are currently shipped. Earlier drafts of this README named prototype directories (`probe-knowledge/`, `probe-plugin-one/`, `probe-plugin-two/`), but none exist in the repository. The framework validator checks that any plugin directory listed in section 2 actually exists.

## 2. Plugin Directories

None.

## 3. Proposed Plugin Structure

When a plugin is added, list its directory in section 2 and use this layout:

```plaintext
plugin-name/
├── plugin.json         # Plugin metadata, permissions, and tool declarations
├── skills/             # Plugin-specific specialized skills
├── tools/              # MCP or JavaScript tool execution handlers
└── README.md           # Plugin installation, usage, and configuration guide
```

This layout is a proposal, not a specification enforced by the framework.

## 4. Security and Isolation Guidelines

- **Sandboxed Execution**: Plugins operate within sandbox constraints by default (`commandExecutionPolicy: sandbox`).
- **Zero Hardcoded Secrets**: Authentication tokens or API credentials must be passed via environment variables or the platform account broker.
- **Verification**: Any custom tool provided by a plugin must declare explicit argument schemas and pass validation tests before inclusion in production subagents.
