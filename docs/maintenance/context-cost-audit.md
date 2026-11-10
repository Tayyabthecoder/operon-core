# Context Cost Audit

Measures how much framework instruction text can enter an agent's context in Claude Code, and when. Produced for tracker item P3-3 in the [Framework Improvement Tracker](framework-improvement-tracker.md).

**Status:** Measured on 2026-11-10 with `node .agents/scripts/context-cost.mjs`. Options A and B (below) were applied the same day, after the first measurement. Re-run the script after adding or editing rules and skills; the numbers will drift.

## Method

- Sizes are UTF-8 bytes of the Markdown files. Token figures are `bytes / 4`, a rough estimate and not a tokenizer measurement.
- Rule loading is classified from frontmatter (see `claudeCodeRuleLoading` in `.agents/scripts/lib/rule-metadata.mjs`):
  - **session start**: no `paths:` key and not `trigger: model_decision`;
  - **conditional**: has `paths:`; Claude Code loads it when matching files are touched;
  - **on demand**: `trigger: model_decision` without `paths:`; not copied into `.claude/rules`, reached through the link list in `AGENTS.md`.
- Skill descriptions are counted as session start (they are listed in context so the agent can pick a skill); skill bodies load only when a skill is invoked.

## Before and After

| What | Before (files, est. tokens) | After (files, est. tokens) | Loaded |
|---|---|---|---|
| Rules at session start | 15, ~51,171 | 3, ~7,776 | Session start |
| Skill descriptions | 81, ~7,328 | 81, ~7,328 | Session start |
| `AGENTS.md` and `CLAUDE.md` | 2, ~583 | 2, ~832 | Session start |
| Rules with `paths:` | 111, ~73,120 | 119, ~103,416 | When matching files are touched |
| On-demand rules | 0 | 4, ~13,331 | When the agent reads them |
| Skill bodies | 81, ~341,255 | 81, ~341,255 | On skill invocation |
| Subagent definitions | 6, ~11,262 | 6, ~11,262 | On delegation |

Net effect on the session-start rules: about 43,400 estimated tokens fewer, offset by about 250 for the longer `AGENTS.md`. The "Before" column is the first measurement, when `.claude/rules` linked the whole `.agents/rules` folder.

## What Changed

1. **Option B: file patterns for domain rules.** Eight rules gained a `paths:` list and keep `trigger: model_decision` for Antigravity:

   | Rule | Patterns (summary) |
   |---|---|
   | `frontend.md` | `.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, `.css`, `.scss` |
   | `accessibility.md` | `.tsx`, `.jsx`, `.vue`, `.svelte`, `.html` |
   | `backend.md` | `routes/`, `controllers/`, `services/`, `middleware/`, `repositories/` |
   | `api-design.md` | `api/`, `routes/`, `controllers/`, OpenAPI and Swagger files |
   | `database.md` | `.sql`, `.prisma`, `migrations/` |
   | `deployment.md` | Dockerfiles, Compose files, `.github/workflows/`, Terraform, `k8s/`, `helm/`, `vercel.json` |
   | `testing.md` | `*.test.*`, `*.spec.*`, `tests/`, `test/`, `__tests__/`, `*_test.go`, `test_*.py` |
   | `documentation.md` | `docs/`, `README.md`, `CHANGELOG.md` |

2. **Option A: on-demand rules stay out of `.claude/rules`.** `architecture.md`, `coding-standards.md`, `git-workflow.md`, and `performance-optimization.md` have no natural file pattern. `setup-claude-code.mjs` now generates `.claude/rules/` as copies instead of linking the whole folder, skips these four, and rewrites links to them so they still resolve. `AGENTS.md` has an "On-Demand Rules" section linking each with a one-line "read when" hint. Re-run the setup script after changing rules.

3. **`security.md` kept at session start.** It was first made on demand along with the others, then switched to `trigger: always_on` at the user's request because it is the rule most worth always having (about 3,900 estimated tokens). The three session-start rules are `core-workflow.md`, `change-safety.md`, and `security.md`.

4. **Guard tests.** A test asserts exactly these three rules load at session start, exactly these four are on demand, every `trigger: glob` rule has `paths:`, and every on-demand rule is linked from `AGENTS.md`.

## Observations

- **Conditional loading worked in two observed cases.** While making these changes, editing `README.md` caused the full text of `documentation.md` to be added to the session context (its `paths:` includes `**/README.md`), and editing the test file caused `testing.md` to be added (`**/tests/**`). These are two observations, not a systematic test of all patterns.
- **Skill descriptions are small** (about 7,300 estimated tokens for 81 skills). Skill bodies are large but load only on invocation.

## Trade-offs and How to Adjust

- **Switching a rule's loading is one line.** Set `trigger: always_on` (session start) or `trigger: model_decision` (on demand, or conditional if it has `paths:`) in the rule's frontmatter and re-run `node .agents/scripts/adapters/setup-claude-code.mjs`. Update the `AGENTS.md` on-demand list and the guard test to match.
- **On-demand rules depend on the agent opening them.** Nothing forces a read before, for example, a structural refactor (`architecture.md`) or a commit (`git-workflow.md`).
- **Patterns are approximations.** A rule loads when matching files are touched, so work that never touches a matching file (for example a frontend change described only in prose) will not load it.

## Not Verified

- Actual token counts (estimates only).
- Whether the other `paths:` patterns load their rules as intended (only `documentation.md` and `testing.md` were observed). Brace-free glob lists were used on purpose, to avoid depending on brace expansion.
- Whether the agent reliably reads the on-demand rules from the `AGENTS.md` list when it should.
- Whether the `@[...]` imports in `AGENTS.md` resolve; the two core rules reach the context through `.claude/rules`.
- Any effect on agent behavior or cost.
