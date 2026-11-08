# Agent Guidelines and Project Conventions

This repository follows a structured organization for AI-assisted engineering and automated development tasks.

## Directory Overview

- `.agents/agents/`: 6 subagent definitions declaring model policies, tool privileges, and skill bindings (`architect-planner`, `code-implementer`, `diagnostic-debugger`, `qa-reviewer`, `security-auditor`, `accessibility-auditor`).
- `.agents/hooks.json`: Lifecycle hook registrations enforcing session safety (SessionStart, PreToolUse, PostToolUse, Stop).
- `.agents/rules/`: Reusable project rules and coding standards (15 domain and operational rules).
- `.agents/scripts/`: Framework verification, integrity auditing, and safety enforcement scripts (`validate-framework.mjs`, `verify-runner.mjs`, lifecycle hooks).
- `.agents/skills/`: Specialized task instructions and engineering procedures (52 skills).
- `.agents/templates/`: Reusable specification, architecture, database, requirements, and planning templates (11 templates).
- `docs/`: Project documentation hierarchy (product, requirements, architecture, database, API, testing, deployment).

## Operating Principles for Agents

- **Inspect First**: Always inspect relevant rules, skills, templates, and existing documentation before planning or executing code changes.
- **Avoid Unnecessary Files**: Do not generate extraneous, temporary, or unprompted files.
- **Prevent Duplication**: Do not duplicate existing functionality, utilities, or configuration.
- **Scope Discipline**: Avoid unrelated changes, scope creep, and unrequested refactoring.
- **Architectural Integrity**: Do not make unapproved architectural changes, alter core patterns, or introduce unnecessary dependencies.

## Mandatory Core Safety Rules

@[Core Development Workflow](.agents/rules/core-workflow.md)
@[Change Safety and Risk Prevention](.agents/rules/change-safety.md)
