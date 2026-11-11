---
description: "Plan a database schema or data migration safely: inspect the current schema and migration history, design reversible expand-and-contract steps, check backups and the target database, and write a migration plan. Applying a migration needs the user's explicit instruction naming the target database."
argument-hint: "<what should change, e.g. add a nullable email column to users>"
---

# Database Migration Plan

> **Framework gate**: This workflow plans and reviews. Applying a migration, restoring a backup, or running any statement that drops, truncates, or rewrites data requires the user's explicit instruction that names the target database (`database.md`, `change-safety.md` section 7). Never run destructive statements to make a test pass, and never run against a database whose identity you have not verified.

**Input**: `$ARGUMENTS` — the change to make. If it is ambiguous, ask what the data should look like afterwards.

Use the `database-migration` and `database-design` skills. Delegate the plan review to the read-only `architect-planner`; you (the Primary Agent) run any command.

---

## Phase 1 — INSPECT

Find and read, without modifying anything:
- Migration directory and tool (for example Prisma, Alembic, Flyway, Knex, Django, EF).
- The most recent migrations and the current schema or models.
- Code that reads or writes the affected tables or columns (search for each name).
- Existing backup and restore notes in `docs/database/` and `docs/deployment/`.

Record the database engine, the environment you are targeting, and how the connection is configured. Do not print connection strings or passwords; write `[REDACTED_SECRET: TYPE]`.

If no migration tool is found, stop and ask how schema changes are applied today.

## Phase 2 — CLASSIFY

| Change | Risk | Approach |
|---|---|---|
| Add nullable column, new table, new index | Low | Single step |
| Add `NOT NULL` or a default to a populated table | Medium | Add nullable, backfill, then constrain |
| Rename or change type | High | Expand and contract over several releases |
| Drop column or table, truncate, delete data | Destructive | Needs explicit approval and a verified backup |
| Large index on a big table | Medium | Online or concurrent build where supported |

## Phase 3 — DESIGN THE STEPS

Write ordered, individually reversible steps in expand-and-contract form:

1. **Expand**: add the new structure; the old application version must still work.
2. **Migrate**: backfill data in batches, idempotently.
3. **Switch**: deploy code that uses the new structure.
4. **Contract**: remove the old structure in a later, separately approved release.

For each step give the exact migration, the rollback (or `NOT REVERSIBLE` with the reason), the lock or downtime risk, and how to verify it.

Send the plan to `architect-planner` and ask it to find ordering mistakes, missing rollbacks, and compatibility gaps between the running code and the new schema. Re-check what it reports.

## Phase 4 — PRECONDITIONS FOR APPLYING

List what must be true before anyone applies it:
- The target database is named and verified (host, name, environment).
- A recent backup exists and a restore has been tested, or the risk is accepted in writing by the user.
- The plan was applied and rolled back successfully on a disposable copy.
- Application code is compatible with both the old and new schema during the rollout.

## Phase 5 — WRITE THE PLAN

Save `docs/database/migration-plans/<YYYY-MM-DD>-<slug>.md`:

```markdown
# Migration Plan: <title>

**Status**: Proposed   **Environment**: <target>   **Engine**: <engine>

## Goal
## Current Schema (relevant part)
## Steps
| # | Change | Rollback | Risk | Verification |
|---|---|---|---|---|
## Preconditions
## Application Compatibility
## Destructive Operations (need explicit approval)
## Open Questions
```

Mark the status `Proposed` until the user approves it, and `Implemented` only after it was applied and verified.

## Phase 6 — APPLY (only on explicit instruction)

If the user asks you to apply a step: restate the target database and the exact command, wait for a clear yes, run that one step, then verify with a read-only query and report the result. Do not chain steps.

## Output

```
Migration plan: <title>
Risk: <low | medium | high | destructive>
Steps: <n>, reversible: <n>
Plan file: docs/database/migration-plans/<file>
Needs your decision: <approvals, backup confirmation, target database>
```

---

## Edge Cases

- **Production target**: Treat as high impact; require explicit user authorization and a backup check.
- **No rollback possible**: Say `NOT REVERSIBLE` and require the user to accept that explicitly.
- **Failing tests**: Fix the code or the plan; never reset or drop a database to force a pass.
