# Agent Guidelines and Project Conventions

This repository follows a structured organization for AI-assisted engineering and automated development tasks.

## Directory Overview

- `.agents/agents/`: 6 subagent definitions declaring model policies, tool privileges, and skill bindings (`architect-planner`, `code-implementer`, `diagnostic-debugger`, `qa-reviewer`, `security-auditor`, `accessibility-auditor`).
- `.agents/hooks.json`: Lifecycle hook registrations enforcing session safety (SessionStart, PreToolUse, PostToolUse, Stop).
- `.agents/rules/`: Reusable project rules and coding standards (126 rules: 15 core domain and operational rules plus 111 language-specific rules adapted from ECC).
- `.agents/scripts/`: Framework verification, integrity auditing, and safety enforcement scripts (`validate-framework.mjs`, `verify-runner.mjs`, lifecycle hooks).
- `.agents/skills/`: Specialized task instructions and engineering procedures (81 skills: 52 core, 16 language review and 11 language build-fix skills adapted from ECC, plus the user skills `short-commit` and `production-quality-builder`).
- `.agents/templates/`: Reusable specification, architecture, database, requirements, and planning templates (11 templates).
- `.agents/workflows/`: 9 slash-command workflows adapted from ECC (`plan`, `plan-prd`, `feature-dev`, `code-review`, `pr`, `build-fix`, `test-coverage`, `refactor-clean`, `update-docs`).
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
