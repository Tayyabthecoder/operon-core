---
description: "Review how the framework behaved recently: summarize the hook logs, run the policy evals, check ECC drift and skill structure, and turn the findings into proposed changes to the allowlist, rule reminders, eval scenarios, and rules. Proposals only; control-plane files are changed after the user approves."
argument-hint: "[focus, e.g. allowlist | denials | evals | docs, blank for everything]"
---

# Framework Retrospective

> **Framework gate**: This workflow reads logs and reports, and writes one retrospective document. It does not edit `.agents/framework.config.json`, rules, agents, hooks, or scenarios; those are control-plane files, and each change needs the user's approval first (`change-safety.md`). Logs hold redacted data only, but never quote a command's arguments or a secret.

**Input**: `$ARGUMENTS` — optional focus. Blank means all phases.

---

## Phase 1 — COLLECT

Run, synchronously, one at a time, and record exit codes:

```bash
node .agents/scripts/summarize-hook-logs.mjs
node .agents/scripts/eval-runner.mjs --no-history
node .agents/scripts/ecc-drift.mjs
node .agents/scripts/skill-audit.mjs
node .agents/scripts/verify-runner.mjs --profile framework-validator
```

`ecc-drift.mjs` needs a local copy of the upstream package in `ECC-framework/`; if absent, it checks version stamps only. If the hook logs do not exist yet, say so and skip Phase 2.

## Phase 2 — HOOK LOGS

From the summary, look at:

| Signal | Meaning | Candidate action |
|---|---|---|
| Programs listed under allowlist candidates | Confirmation requested 3 or more times | Propose a `commandPolicy.allowedPatterns` entry, tied to the project's real commands |
| Repeated identical denials | The agent keeps retrying a blocked action, or the rule is too strict for this project | Check the denial reason; propose a clearer rule text or a documented exception, never silently loosening it |
| High `force_ask` on a tool | Policy friction | Check whether the files involved belong in a documented exception |
| Stop-gate blocks | Work ended without verification | Check whether the agent knows the right verification profile |

Only the program name is logged, not arguments, so a candidate says "npm", not which command. Ask the user for the exact commands before proposing a pattern.

## Phase 3 — EVALS

If any scenario fails, treat it as a regression: identify the change that caused it using `git log`, and report; do not edit the scenario to make it pass. Then ask whether recent hook findings suggest **new** scenarios (for example an action that was denied unexpectedly, or one that should have been). List each as `id`, category, tool, input, expected decision.

## Phase 4 — DRIFT AND STRUCTURE

- ECC: list stamps that differ from `THIRD_PARTY_NOTICES.md` and rules whose bodies differ from upstream; say whether the difference looks deliberate (adaptation) or accidental.
- Skills: report the audit's top items (descriptions without "Use when", very large skills). These are structure findings, not proof that advice is wrong.

## Phase 5 — PROPOSALS

Produce a short ranked list. For each proposal give: the file to change, the exact change, the evidence from Phases 2 to 4, the risk of making it, and how to verify it (validator, tests, eval run). Also list **decision-log candidates**: a lesson, convention, or decision from this review that a future session should know (for example "a recurring denial was resolved by documenting an exception"). Propose each as one line for `node .agents/scripts/decision-log.mjs add --tag <tag> "<text>"` and add it only after the user approves; never record secrets or personal data. Mark each as `Safe` (docs, new eval scenario) or `Needs approval` (anything in `.agents/framework.config.json`, `.agents/rules/`, `.agents/agents/`, `.agents/hooks.json`, or the scripts).

## Phase 6 — WRITE THE RETROSPECTIVE

Write `docs/maintenance/retro-<YYYY-MM-DD>.md`:

```markdown
# Framework Retrospective — <date>

**Period covered**: <from log timestamps, or "no logs">   **Commit**: <short hash>

## Signals
| Source | Result |
|---|---|
| Hook log summary | |
| Policy evals | <passed>/<total> |
| ECC drift | |
| Skill audit | |
| Validator | <checks>, <errors> |

## Findings
## Proposals
| # | Change | Evidence | Risk | Approval needed |
|---|---|---|---|---|

## Not Examined
```

Be explicit about what you did not examine.

## Output

```
Retro <date>: evals <passed>/<total>, validator <errors> errors, drift <n> stamps off
Proposals: <n> (<n> safe, <n> need approval)
File: docs/maintenance/retro-<date>.md
Nothing in control-plane files was changed.
```

---

## Edge Cases

- **No logs**: Run Phases 3 to 6 only and say the log-based sections are empty.
- **Everything is green**: Say so briefly; do not invent proposals.
- **A script fails**: Report its exit code and output; do not skip it silently.
