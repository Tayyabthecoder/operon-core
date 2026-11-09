---
name: short-commit
description: Writes a short, meaningful Git commit message from the staged changes. Use whenever about to run git commit, or when asked to commit, save, or push changes.
---

# Short Commit Skill

Use this skill whenever preparing to commit, save, or push changes to Git. Before writing any long commit description of your own, write a concise, meaningful Git commit message derived from the staged changes.

## Workflow & Rules

1. **Inspect Staged Changes First:**
   - Run `git diff --staged` to inspect the exact modifications staged for commit.
   - If nothing is staged, run `git status` and `git diff`, and ask the user what changes to stage.

2. **Compose the Subject Line:**
   - **Length:** 50 characters or fewer.
   - **Mood:** Imperative mood ("Fix login redirect", not "Fixed" or "Fixes").
   - **Punctuation:** No trailing period.
   - **Focus:** Say why the change matters or what problem it solves, not which files were edited.

3. **Use Conventional Commits Prefix:**
   - Prepend an appropriate type: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
   - Example: `fix: stop duplicate emails on retry`

4. **Optional Body:**
   - Add a body only if the context or rationale is not obvious from the subject line.
   - Limit the body to 1-3 lines, wrapped at 72 characters per line.

5. **Strict Prohibitions:**
   - Do **not** list every file or function changed.
   - Do **not** use vague filler like "This commit updates...", "Misc changes", or "Various improvements".
   - Do **not** mention that an AI or assistant wrote it, unless explicitly requested.
   - Do **not** write more than one paragraph.

6. **Approval Gate:**
   - Always present the proposed commit message to the user first.
   - Wait for explicit user confirmation before executing `git commit`.

---

## Examples

### Good Commit Messages

- `fix: prevent duplicate invoices on webhook retry`
- `feat: add tenant isolation check to export route`
- `refactor: simplify token refresh queue handling`

### Bad Commit Messages

- `fixed stuff in auth.ts and user model.`  
  *Reason: Uses past tense, trailing period, mentions file names, and lacks a conventional commit prefix.*
- `chore: This commit updates various backend files and improves performance across several services`  
  *Reason: Exceeds 50 characters, includes wordy filler ("This commit updates..."), and is too vague.*
- `fix: bug fixes`  
  *Reason: Lacks specificity and fails to describe what actually broke or why the change matters.*
