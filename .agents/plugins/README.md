# Plugins Directory & Catalog

This directory houses plugin extensions, custom MCP tool adapters, and prototype plugins for the AI Agent Engineering Framework.

---

## 1. Overview & Prototype Status
The directories within this folder are **experimental prototypes** designed to explore custom tool extensions, external knowledge probes, and MCP server integrations:
- `probe-knowledge/`: Prototype knowledge retrieval plugin exploring private documentation indexing and hybrid search.
- `probe-plugin-one/`: Generic tool extension prototype one evaluating tool registration contracts.
- `probe-plugin-two/`: Tool extension prototype two evaluating multi-agent broker compatibility.

> [!NOTE]
> These plugins are in prototype status and are not currently active in production agent workflows.

---

## 2. Plugin Architecture & Structure
Standard framework plugins adhere to the Antigravity Plugin specification:
```plaintext
plugin-name/
├── plugin.json         # Plugin metadata, permissions, and tool declarations
├── skills/             # Plugin-specific specialized skills
├── tools/              # MCP or JavaScript tool execution handlers
└── README.md           # Plugin installation, usage, and configuration guide
```

---

## 3. Security & Isolation Guidelines
- **Sandboxed Execution**: Plugins operate within sandbox constraints by default (`commandExecutionPolicy: sandbox`).
- **Zero Hardcoded Secrets**: Authentication tokens or API credentials must be passed via environment variables or the platform account broker.
- **Verification**: Any custom tool provided by a plugin must declare explicit argument schemas and pass validation tests before inclusion in production subagents.
