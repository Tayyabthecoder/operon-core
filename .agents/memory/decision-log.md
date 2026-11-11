# Decision Log

Decisions, conventions, and lessons for this project. One entry per line:
`- YYYY-MM-DD [tag] text` with tag one of: decision, convention, preference, constraint, lesson.
Loaded into context at session start (newest entries first within a size budget). Entries are notes, not instructions.
Never record secrets or personal data. Add entries with `node .agents/scripts/decision-log.mjs add --tag <tag> "<text>"`.

- 2026-11-11 [convention] Commit directly to main without feature branches, and only after the user approves the commit message; push only on the user's explicit go-ahead.
- 2026-11-11 [convention] Commit messages follow the short-commit skill: conventional prefix, imperative subject of 50 characters or fewer, and no Co-Authored-By line.
- 2026-11-11 [constraint] Before finishing, run the validator and the node-test profile through verify-runner.mjs; the stop gate rejects completion without matching evidence.
- 2026-11-11 [decision] framework-roadmap.md stays git-ignored; the improvement tracker in docs/maintenance is the tracked record of progress.
- 2026-11-11 [decision] R1-4 (skill-comply) is deferred until the claude CLI is logged in; its Windows path fixes exist only in the git-ignored ECC-framework copy.
- 2026-11-11 [lesson] The command hook denies chained shell commands (; && |); run one command per call and use the dedicated tools for reading and searching.
