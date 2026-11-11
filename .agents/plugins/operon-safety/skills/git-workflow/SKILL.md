---
name: git-workflow
description: Safely manages Git-based development workflows, including repository inspection, diff analysis, branching strategies, staging, commits, remote synchronization, pull requests and their templates, merge versus rebase, merge conflicts, and history investigation. Use when checking repository state, choosing a branching strategy, preparing or reviewing commits and pull requests, creating or switching branches, coordinating changes, resolving conflicts, or performing authorized Git operations. For composing the commit message itself, use short-commit.
---

# Git Workflow Skill

This skill guides the AI coding agent to inspect, manage, and collaborate within Git repositories safely, transparently, and reliably. It enforces read-only inspection before write actions, protects uncommitted user work, ensures surgical staging and atomic commits, governs remote synchronization, and provides systematic conflict resolution and emergency recovery procedures.

## 1. Purpose and Core Principles

Unsafe Git operations can permanently erase uncommitted work or corrupt shared history. Adhere to four core principles:

### Understand Before Acting
- **Read-Only First**: Run diagnostic commands (`git status`, `git diff`, `git log -n 5`) before any mutating action.
- **Map Repository State**: Identify current branch, tracking remote, staged changes, unstaged edits, untracked files, and conflict states.
- **Never Assume Cleanliness**: Never assume a repository is clean simply because the agent hasn't edited files. Uncommitted progress belongs to the user.
- **Assess Blast Radius**: Determine whether an action alters the index, rewrites working files, changes local branch heads, or publishes commits remotely.

### Preserve User Work
- **Uncommitted Work is Sacred**: Treat all existing staged, unstaged, and untracked files as valuable user work.
- **Zero Silent Discards**: Never run destructive commands that discard uncommitted modifications (`git reset --hard`, `git checkout .`, `git clean -fd`, `git restore .`) without explicit user authorization.
- **No Blanket Staging**: Never run `git add .` or `git add -A` when unrelated user files exist in the tree.
- **Protect Commit History**: Never rewrite published history (`rebase`, `commit --amend`, `push --force`) on shared branches without verified understanding and explicit permission.
- **Halt on Ambiguity**: When an operation risks overwriting local modifications, halt immediately and present safe alternatives.

### Minimize Unnecessary Operations
- **Smallest Viable Operation**: Execute the minimum Git action necessary for the specific task.
- **Avoid Gratuitous Branching**: Do not create or switch branches unless requested or required by repository workflow.
- **Accurate Telemetry**: Verify command exit codes and repository status after every write operation; never assume success without confirmation.

### Respect Project Conventions
- **Follow Established Patterns**: Adhere to branch naming conventions (`feature/*`, `bugfix/*`), commit format (e.g., Conventional Commits), PR templates, and protected branch policies.
- **Recommend When Missing**: If no convention exists, recommend a clean, standard pattern rather than imposing arbitrary workflows.

*Scope Boundary*: Focuses strictly on Git and version-control workflows. For reviewing code quality, use [code-review](../code-review/SKILL.md); for investigating functional defects, use [debugging](../debugging/SKILL.md); for structural improvements, use [refactoring](../refactoring/SKILL.md); for release deployments, refer to [deployment.md](../../rules/deployment.md).

## 2. When to Use This Skill

### Trigger Scenarios
Activate this skill whenever:
- **Inspecting Repository Status**: Checking active branch, unstaged/staged diffs, untracked files, or recent commits.
- **Preparing & Authorizing Commits**: Auditing staged changes, authoring descriptive commit messages, and creating atomic commits upon user request.
- **Branch Management**: Creating, switching, listing, or safely deleting development branches.
- **Synchronizing with Remotes**: Fetching upstream changes, pulling remote branches, or pushing authorized commits.
- **Investigating Diffs & History**: Auditing commit history with `git log`, comparing revisions with `git diff`, or tracking origin of changes with `git blame`.
- **Resolving Conflicts**: Systematically resolving merge and rebase conflicts while preserving the intent of both branches.
- **Safeguarding Temporary Work**: Preserving working-tree modifications using targeted `git stash` operations.
- **Preparing Pull Requests**: Auditing branches, summarizing change sets, and ensuring test compliance before PR creation.

### When NOT to Use This Skill
Do not use this skill for:
- Writing or refactoring application code (use [backend-development](../backend-development/SKILL.md), [frontend-development](../frontend-development/SKILL.md), or [refactoring](../refactoring/SKILL.md)).
- Running test suites or QA validations (use [testing-qa](../testing-qa/SKILL.md)).
- Running automated deployment pipelines or infrastructure provisioning (use [deployment.md](../../rules/deployment.md)).
- Cosmetic formatting of files unrelated to the current task.

## 3. Systematic Repository Inspection Workflow

Before executing any mutating Git command, execute this 10-step inspection flow:

1. **Verify Git Root**: Confirm repository root (`git rev-parse --show-toplevel`).
2. **Check Current Branch**: Confirm active branch (`git branch --show-current`).
3. **Inspect Working Tree**: Review compact status (`git status -sb`).
4. **Differentiate Diffs**: Check unstaged (`git diff`) and staged (`git diff --cached`) changes.
5. **Audit Untracked Files**: Distinguish intentional assets from build outputs or temp files.
6. **Check Conflict Markers**: Scan for unmerged paths (`git diff --check`).
7. **Inspect Recent Log**: Review recent commits (`git log --oneline -n 5`).
8. **Verify Remotes**: Check configured targets (`git remote -v`).
9. **Safety Gate**: Evaluate uncommitted user work and branch restrictions.
10. **Select Action**: Proceed with targeted command, ask user, or halt on risk.

### Non-Git Environments
If a command returns `fatal: not a git repository`, **never run `git init` automatically**. Explain that the current directory is not a Git repository, check whether a parent folder contains `.git`, and await user instructions.

### Credential Protection
Never expose personal access tokens (PATs), SSH private keys, embedded HTTP authentication (`https://token@github.com/...`), or internal URLs in command logs, commit messages, or task reports.

## 4. Working with Diffs and Change Hygiene

A clean, intentional diff is essential for safe version control:
- **Differentiate Staged vs. Unstaged**: Review `git diff` for working-tree changes and `git diff --cached` for staged changes before committing.
- **Relevance Filtering**: Verify that every modified file is required for the assigned task. Discard accidental whitespace churn.
- **Scan for Unintended Inclusions**:
  - Hardcoded secrets, API tokens, passwords, private keys.
  - Debug statements (`console.log`, `print()`, `debugger;`).
  - Temporary scratch files, backup files (`.bak`, `.orig`), or OS clutter (`.DS_Store`, `Thumbs.db`).
  - Accidental local configuration overrides (`.env`, `launch.json`).
- **Legitimate Lockfiles & Migrations**: Preserve legitimate changes to package lockfiles (`package-lock.json`, `pnpm-lock.yaml`) and database migration scripts when dependencies or schema changes were requested. Do not discard them as noise.
- **No Speculative Reformatting**: Do not reformat adjacent functions or unrelated files in the same diff as functional changes.

*Handoff*: When qualitative analysis of code changes is required, invoke [code-review](../code-review/SKILL.md).

## 5. Branch Management

Branches isolate feature development and defect fixes:
- **Branch Naming**: Follow repository standards (`feature/<short-desc>`, `bugfix/<ticket>-<desc>`, `hotfix/<issue>`, `chore/<task>`).
- **Creating Branches**: Ensure working tree is clean or local changes belong to the new branch before creating (`git switch -c <branch-name>`). Check existing branches first (`git branch --list`).
- **Switching Branches**: Run `git status` first. Never force a switch if local uncommitted files would be overwritten. Do not stash or discard user changes automatically just to force a switch; explain the conflict and ask the user.
- **Deleting Branches**: Requires explicit user authorization. Prefer safe delete `git branch -d <branch>` (fails if unmerged). Never use force delete `git branch -D` without explicit direction. Never delete protected branches (`main`, `master`, `develop`, `release/*`).

### Choosing a Branching Strategy

Follow the strategy the repository already uses. When the user asks for one, recommend by team size and release cadence:

| Strategy | Shape | Team Size | Release Cadence | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **GitHub Flow** | `main` always deployable; feature branches merge to `main` through PRs after review and CI | Any | Continuous | SaaS, web apps, small teams |
| **Trunk-Based** | Everyone merges to `main` within 1-2 days; feature flags hide unfinished work | 5+ experienced | Multiple per day | High-velocity teams with strong CI |
| **GitFlow** | `develop` integrates features; `release/*` and `hotfix/*` merge to both `main` and `develop` | 10+ | Scheduled | Enterprise and regulated releases |

## 6. Staging and Committing

Commits create permanent milestones in repository history. Do not treat a request to write code as authorization to commit it.

### Selective Staging Protocol
- **Explicit File Staging**: Stage specific files by path (`git add src/services/loan.service.ts`).
- **Avoid Indiscriminate Staging**: Avoid `git add .` or `git add -A` when untracked or unrelated files exist.
- **Verify Staged Diff**: Always execute `git diff --cached` immediately before committing.
- **Preserve Unrelated Work**: Leave unrequested user modifications unstaged in the working tree.

### Commit Authorization Gate
Only execute `git commit` when explicitly requested by the user or required by an approved milestone plan.

### Commit Message Standards
Follow repository conventions. When Conventional Commits are used, format as:
`<type>(<optional scope>): <imperative summary>` (e.g., `feat(loan): enforce renewal limits`).
Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Include an optional body that explains why (not what) and an issue reference footer (`Closes #123`) when relevant. Use the [short-commit](../short-commit/SKILL.md) skill to compose the message from the staged diff.

### Prohibited Commit Actions
- **Never Amend Shared Commits**: Never use `git commit --amend` if the commit has already been pushed to a shared remote.
- **Never Bypass Verification**: Never use `--no-verify` to bypass pre-commit linters or test hooks without explicit user instruction and verified justification.
- **Zero Secrets**: Ensure `.env`, credentials, and private keys are never staged or committed.

## 7. Remote Synchronization

Remote operations interact with shared repositories and CI/CD pipelines:
- **Fetching**: `git fetch <remote>` updates remote tracking branches (`origin/main`) safely without modifying local files or branches. Inspect divergence with `git log HEAD..origin/main --oneline`.
- **Pulling**: Check `git status` before pulling. Ensure local work is committed or safely isolated. Adhere to project sync strategy: merge commit (`git pull --no-rebase`) or linear rebase (`git pull --rebase`). Ask user if ambiguous.
- **Pushing Gates**:
  - **Explicit User Consent**: Only push when explicitly requested by the user.
  - **Pre-Push Verification**: Verify target remote and branch (`git branch -vv`), inspect outgoing commits (`git log origin/<branch>..HEAD --oneline`), verify zero secrets, and ensure tests pass locally.
  - **Force-Pushing Rules**: Never execute `git push --force` by default. Never force-push to `main`, `master`, `develop`, or shared collaboration branches. When force-pushing a personal topic branch is explicitly authorized, use `git push --force-with-lease`.

## 8. Merge, Rebase, and Conflict Resolution

Integrating code from divergent branches requires disciplined conflict management:
- **Merge** (`git merge <branch>`): Preserves historical timeline with a merge commit. Non-destructive, ideal for integrating completed topic branches into main/develop.
- **Rebase** (`git rebase <base>`): Replays local commits linearly on top of upstream. Rewrites commit SHAs. Strictly prohibited on shared or published branches.

### 10-Step Conflict Resolution Workflow
1. **Identify Files**: Check `git status` and `git diff --name-only --diff-filter=U`.
2. **Inspect Markers**: Check `<<<<<<< HEAD`, `=======`, `>>>>>>> <branch>`.
3. **Understand Intents**: Review commit messages and logic on both branches.
4. **Synthesize Solution**: Combine functional goals cleanly; never blindly pick one side.
5. **Clean Markers**: Remove all conflict marker lines completely.
6. **Verify Syntax & Types**: Run compiler and static checks (`tsc --noEmit`, linters).
7. **Run Tests**: Execute automated tests to confirm resolved functionality.
8. **Stage Resolved Files**: `git add <resolved-file>` explicitly for each file.
9. **Verify Staged Diff**: `git diff --cached` to confirm resolution accuracy.
10. **Finalize Integration**: Run `git commit` (merge) or `git rebase --continue`.

*Golden Rules*: Never use `git checkout --ours` or `--theirs` across entire files for application logic. Escalate domain ambiguities to the user. Abort cleanly via `git merge --abort` or `git rebase --abort` if directed.

### When Not to Rebase
Never rebase a branch that has been pushed to a shared remote, that others have based work on, that is protected (`main`, `develop`), or that is already merged. Rebasing rewrites history and breaks other people's work; use a merge or `git revert` instead.

### Conflict Prevention
- Keep feature branches small and short-lived (days, not weeks).
- Integrate the target branch frequently (`git fetch` then merge or rebase a personal branch per project convention).
- Coordinate with the team before touching widely shared files.
- Prefer feature flags over long-lived branches, and review and merge PRs promptly.

## 9. Dangerous Commands, History Rewriting, and Safe Recovery

Certain Git commands can destroy uncommitted files or rewrite committed history:

### Dangerous Commands Catalog
| Command | Primary Consequence | Safety Protocol |
| :--- | :--- | :--- |
| `git reset --hard` | Discards uncommitted edits and resets HEAD. | Forbidden without consent and clean tree verification. |
| `git clean -fdx` | Permanently deletes untracked/ignored files. | Always run `git clean -ndx` (dry run) first. |
| `git checkout .` / `git restore .` | Discards uncommitted edits in tracked files. | Use targeted file restore only; verify diff first. |
| `git branch -D <name>` | Force deletes branch even if unmerged. | Verify merge status with `git branch --merged`. |
| `git push --force` | Overwrites remote branch history. | Prohibited on shared branches; use `--force-with-lease` on personal branches. |
| `git stash clear` / `drop` | Permanently deletes stashed changes. | Inspect contents with `git stash show -p` before dropping. |

### Emergency Recovery Protocol
If an accidental deletion or bad merge occurs:
1. **Halt Immediately**: Stop issuing mutating commands. Do not cover up errors with further destructive actions.
2. **Consult `git reflog`**: Git retains disconnected commit references in local reflog (`git reflog -n 20`).
3. **Restore to Safe Reference**: Point a new recovery branch to the last known good commit:
   ```bash
   git switch -c recovery/safe-state <commit-sha>
   ```
4. **Transparent Communication**: Inform the user immediately, explaining the state and recovery path.

## 10. Work Preservation with Git Stash

When working-tree modifications must be temporarily set aside:
- **Inspect Before Stashing**: Check `git status` and `git diff` to confirm what is being stashed.
- **Name Stashes Clearly**: Include a descriptive message (`git stash push -m "WIP: description"`).
- **Untracked Files**: If new untracked files must be included, use `-u` (`--include-untracked`).
- **Inspect Stash Contents**: View stash diff before restoring: `git stash show -p stash@{0}`.
- **Prefer `apply` with Verification**: Use `git stash apply` to keep the stash as a backup until verified, or `git stash pop` if clean removal is preferred.
- **Handle Stash Conflicts**: If `git stash pop` conflicts, the stash is retained. Resolve conflicts, run tests, and only then run `git stash drop stash@{0}`.

## 11. Tags, Releases, and Repository Automation

Tags mark specific points in repository history, typically for releases:
- **Semantic Versioning**: Follow SemVer (`vMAJOR.MINOR.PATCH`, e.g., `v1.4.0`).
- **Annotated vs. Lightweight**: Prefer annotated tags for releases (`git tag -a v1.4.0 -m "Release v1.4.0"`). Lightweight tags (`git tag v1.4.0`) are purely local pointers.
- **Explicit Authorization**: Creating or pushing tags can trigger automated release deployments. Never create or push tags without explicit user authorization. Never repoint published tags (`git tag -f`).
- **Git Hooks & CI Integrity**: Respect pre-commit hooks and linters. Fix underlying code issues rather than using `--no-verify`. Distinguish local check results from remote CI pipeline status.
- **Proposing Repository Hooks**: When asked to add Git hooks, a typical `pre-commit` runs lint and fast tests and rejects staged diffs matching secret patterns (`password`, `api_key`, `secret`); a typical `pre-push` runs the full suite and rejects leftover debug output. Installing or changing hooks alters every contributor's workflow, so present the script and get approval first.

## 12. Pull Requests and Collaborative Reviews

When authorized to prepare pull requests via platform CLIs (`gh`, `glab`):
- **PR Preparation Checklist**:
  - [ ] Topic branch is rebased/merged cleanly with upstream target.
  - [ ] All unit, integration, and type checks pass locally.
  - [ ] Diff contains zero secrets, debug logs, or accidental churn.
  - [ ] PR title is concise and follows conventions (e.g., `feat(loan): add renewal limit enforcement`).
  - [ ] PR description covers summary, motivation, test verification, and linked issues.
  - [ ] Respect repository templates, review policies, and branch protection.
  - [ ] PR is focused on one feature or fix and reasonably small (under ~500 changed lines is ideal).

### PR Description Template
When the repository has no template of its own, structure the description as:

```markdown
## What
Brief description of what this PR does.

## Why
Motivation and context.

## How
Key implementation details worth highlighting.

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Tests pass locally
- [ ] Related issues linked (Closes #123)
```

### Reviewer Checklist
- [ ] Does the code solve the stated problem, including edge cases?
- [ ] Is it readable and maintainable, with sufficient tests?
- [ ] Are there security concerns?
- [ ] Is the commit history clean (squashed if the project expects it)?

## 13. History Investigation and Root-Cause Tracking

Read-only Git tools help investigate regressions and understand architectural decisions:
- `git log --grep="keyword" --oneline`: Search commit messages for keywords.
- `git log -p -n 5 -- <path>`: View diff history of a specific file.
- `git show <commit-sha>`: Inspect detailed commit payload.
- `git blame -L 40,65 <path>`: Line-by-line authorship analysis (use `-w` to ignore whitespace).
- `git bisect`: Binary search to pinpoint defect-introducing commits (`git bisect start`, `git bisect bad`, `git bisect good`).

*Ethics & Scope*: Use `git blame` to understand original design intent, not to assign personal fault. Coordinate with [debugging](../debugging/SKILL.md) for root-cause analysis.

## 14. Practical Git Decision Guide

| Situation | Primary Action | Safety Precaution |
| :--- | :--- | :--- |
| **Inspect Status** | Run `git status -sb` and `git diff --stat`. | Read-only. Never modify files or stage unprompted. |
| **Commit Changes** | Inspect diff, stage explicit files, check `git diff --cached`, commit. | Requires explicit consent; check for secrets/debug logs first. |
| **Push to Remote** | Verify tracking branch, run `git fetch`, check outgoing commits, push. | Requires explicit consent; verify target branch; never force-push. |
| **Switch Branches** | Check `git status`. If clean, run `git switch <branch>`. | If dirty, halt and ask user; never overwrite uncommitted work. |
| **Sync Upstream** | Run `git fetch`. Inspect divergence with `git log HEAD..origin/<branch>`. | Follow repo sync strategy (merge vs rebase); halt on conflict. |
| **Merge Conflicts** | Inspect conflicted files, synthesize logic, run tests, stage resolved files. | Never blindly choose `--ours`/`--theirs`; eliminate all markers. |
| **Undo Commit** | If local: `git reset --soft HEAD~1`. If published: `git revert <sha>`. | Never use `reset --hard` without consent. Prefer `git revert` on remotes. |
| **Clean Repo** | Run `git clean -ndx` (dry-run). Review candidates before removal. | Never run `clean -fdx` without prior dry-run and explicit approval. |
| **Git Failure** | Inspect exact error telemetry. Diagnose root cause before retrying. | Never escalate to destructive commands (`--force`, `reset --hard`). |
| **Not a Git Repo** | Report status to user. Inquire if `git init` is requested. | Do not initialize a repository unprompted. |

### Common Anti-Patterns
| Avoid | Prefer |
| :--- | :--- |
| Committing directly to `main` | Feature branches and pull requests |
| Committing `.env` or other secrets | `.gitignore` plus environment variables |
| Giant PRs (1000+ lines) | Small, focused PRs |
| Messages like `update` or `fix` | Descriptive Conventional Commit messages |
| Force-pushing public history | `git revert` on shared branches |
| Long-lived feature branches | Short branches integrated frequently |
| Committing generated files (`dist/`, `node_modules/`) | Ignoring build output and dependencies |

## 15. Command Execution and Verification

When executing Git commands:
1. **Targeted Paths**: Specify explicit file paths rather than wildcard arguments (`git add src/index.ts` instead of `git add .`).
2. **Avoid Chained Destructive Commands**: Never execute combined shell commands containing destructive actions (`git reset --hard && git clean -fd`).
3. **Audit Exit Codes**: Confirm command exit status. Do not assume a command succeeded because it produced no console output.
4. **Post-Mutation Verification**: After every mutating operation, execute a read-only verification command:
   - Branch creation: `git branch --show-current`
   - Commit: `git log -1 --stat`
   - Conflict resolution: `git status --short` and `git diff --check`
   - Push: verify remote tracking status
5. **Truthful Reporting**: Report exact commit hashes and branch names. Never invent or hallucinate Git telemetry.

## 16. Expected Git Workflow Report Format

When executing substantive Git operations, provide a structured report covering:

- **Objective**: Requested Git operation (e.g., "Stage and commit loan service validation enhancements").
- **Initial State**: Active branch, working tree state (modified, untracked, staged counts), and upstream status.
- **Actions Taken**: Chronological list of exact operations executed.
- **Verification**: Resulting commit SHA, message summary, post-operation status, and check results.
- **Risks or Blockers**: Unresolved conflicts, upstream divergence, or branch restrictions.
- **Next Step**: Immediate next action (e.g., ready for authorized push or PR creation).

## 17. Alignment with Existing Rules and Skills

This skill operates in direct alignment with project rules and complementary skills:

- [git-workflow.md](../../rules/git-workflow.md): Standing Git rules, protected branch policies, and safety constraints.
- [change-safety.md](../../rules/change-safety.md): Blast radius containment, surgical edits, and preserving user work.
- [core-workflow.md](../../rules/core-workflow.md): Inspect-plan-execute-verify cycle.
- [coding-standards.md](../../rules/coding-standards.md): Naming conventions, formatting, and diff cleanliness.
- [code-review](../code-review/SKILL.md): In-depth code reviews before commits or pull requests.
- [debugging](../debugging/SKILL.md): Root-cause investigation via history and git bisect.
- [refactoring](../refactoring/SKILL.md): Behavior-preserving refactors with isolated commits.
- [testing-qa](../testing-qa/SKILL.md): Test suite verification before staging, committing, or pushing.
- [project-planning](../project-planning/SKILL.md): Branching strategy and delivery roadmaps.
- [deployment.md](../../rules/deployment.md): Release tagging and deployment-triggering pushes.
- [short-commit](../short-commit/SKILL.md): Composing short, meaningful commit messages from the staged diff.

Branching strategies, the PR description template, rebase limits, conflict prevention, and the anti-pattern table are adapted from ECC (`ecc-universal` v2.2.3, MIT); see [THIRD_PARTY_NOTICES.md](../../../THIRD_PARTY_NOTICES.md).

## 18. Final Validation Checklist

Before concluding any Git workflow activity, verify each requirement:

- [ ] **Read-Only First**: Inspected state with read-only commands before mutating.
- [ ] **User Work Preserved**: Uncommitted user files and modifications remain intact.
- [ ] **Zero Destructive Discards**: Avoided `reset --hard` or `clean -fd` without consent.
- [ ] **Surgical Staging**: Staged only task-relevant files (no `git add .`).
- [ ] **Zero Secrets & Debug Clutter**: Verified zero credentials or debug logs in `git diff --cached`.
- [ ] **Commit Authorization**: Commit explicitly requested or authorized by plan.
- [ ] **Convention Adherence**: Followed branch naming and Conventional Commit standards.
- [ ] **Remote Safety**: Push authorized; force-push on shared branches prohibited.
- [ ] **Synthesized Resolution**: Merge conflicts resolved with all markers removed.
- [ ] **Accurate Telemetry**: Verified exit codes, commit SHAs, and branch states.
