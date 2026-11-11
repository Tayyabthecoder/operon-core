import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkDestructiveCommands,
  evaluateCommandSafety,
  isValidCommandPattern,
  matchesCommandPattern,
} from '../hooks/pre-tool-safety.mjs';
import { evaluateFileSafety, validateScopeBoundary } from '../hooks/pre-file-safety.mjs';
import { canonicalCase, extractCanonicalWorkspaceRoot } from '../lib/hook-common.mjs';
import { withRuleReminders } from '../adapters/claude-code.mjs';
import { findRuleReminders, loadRuleReminders } from '../lib/rule-reminders.mjs';
import { summarizeLogs, formatSummary } from '../summarize-hook-logs.mjs';
import { analyzeSkill, auditSkills, formatAudit } from '../skill-audit.mjs';
import { buildDriftReport, collectStamps, compareBodies, noticesVersion, stampOf } from '../ecc-drift.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function tempWorkspace(config) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'roadmap1-')));
  fs.mkdirSync(path.join(dir, '.agents'), { recursive: true });
  if (config !== undefined) fs.writeFileSync(path.join(dir, '.agents', 'framework.config.json'), JSON.stringify(config), 'utf8');
  return dir;
}

function decide(dir, commandLine) {
  return evaluateCommandSafety({
    toolCall: { name: 'run_command', args: { CommandLine: commandLine, toolSummary: 'test', WaitMsBeforeAsync: 5000, Cwd: dir } },
    workspacePaths: [dir],
  }).decision;
}

describe('R1-5: command patterns', () => {
  test('* matches one token and a trailing ** matches the rest', () => {
    assert.ok(matchesCommandPattern('npm run *', 'npm run build'));
    assert.ok(!matchesCommandPattern('npm run *', 'npm run build extra'));
    assert.ok(!matchesCommandPattern('npm run *', 'npm run'));
    assert.ok(matchesCommandPattern('git log **', 'git log'));
    assert.ok(matchesCommandPattern('git log **', 'git log -n 3 --oneline'));
    assert.ok(!matchesCommandPattern('git log **', 'git show HEAD'));
    assert.ok(!matchesCommandPattern('npm test', 'npm test --watch'));
  });

  test('over-broad patterns are invalid: wildcard program, wrappers, deletion, mid-pattern **, bare interpreters', () => {
    for (const bad of ['* **', '*', 'bash **', 'sudo npm test', 'cmd /c *', 'rm -rf *', 'npm ** run', 'node *', 'node', 'python **', 'n*de test']) {
      assert.equal(isValidCommandPattern(bad), false, `"${bad}" should be rejected`);
      assert.equal(matchesCommandPattern(bad, 'npm run x'), false);
    }
    for (const good of ['npm run *', 'node --test **', 'git log **', 'pytest **']) {
      assert.equal(isValidCommandPattern(good), true, `"${good}" should be accepted`);
    }
  });

  test('interpreter patterns never match inline-evaluation flags', () => {
    assert.ok(matchesCommandPattern('node --test **', 'node --test tests/a.mjs'));
    assert.equal(matchesCommandPattern('node --test **', 'node --test -e process.exit()'), false);
    assert.equal(matchesCommandPattern('python -m **', 'python -m pytest -c conf.ini'), false);
  });

  test('allowedPatterns allow matching commands but a denial or a non-match still applies', () => {
    const dir = tempWorkspace({ commandPolicy: { allowedPatterns: ['npm run *', 'echo **', 'bash **', 'find **'] } });
    try {
      assert.equal(decide(dir, 'npm run build'), 'allow');
      assert.equal(decide(dir, 'npm run build extra'), 'force_ask', 'one * is one token');
      assert.equal(decide(dir, 'npm publish'), 'force_ask');
      assert.equal(decide(dir, 'echo hello world'), 'allow');
      assert.equal(decide(dir, 'echo hi; rm -rf x'), 'deny', 'chaining is denied before patterns');
      assert.equal(decide(dir, 'bash script.sh'), 'force_ask', 'wrapper patterns are ignored');
      assert.equal(decide(dir, 'find . -name x'), 'allow');
      assert.equal(decide(dir, 'find . -delete'), 'deny', 'destructive check beats a matching pattern');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('missing or malformed allowedPatterns fall back to the built-in allowlist', () => {
    const dir = tempWorkspace({ commandPolicy: { allowedPatterns: 'npm run *' } });
    try {
      assert.equal(decide(dir, 'npm run build'), 'force_ask');
      assert.equal(decide(dir, 'git status'), 'allow');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('unknown deletion launchers are denied: find -delete, find -exec rm, rimraf, shred, unlink', () => {
    for (const cmd of ['find . -name x -delete', 'find . -exec rm {} +', 'find . -execdir rimraf {} +', 'rimraf dist', 'shred secret.txt', 'unlink a.txt']) {
      assert.ok(checkDestructiveCommands(cmd), `"${cmd}" should be denied`);
    }
    for (const cmd of ['find . -name "*.mjs"', 'git log --grep=delete', 'echo rimraf']) {
      assert.equal(checkDestructiveCommands(cmd), null, `"${cmd}" should not be denied`);
    }
  });
});

describe('R1-3: on-demand rule reminders', () => {
  const reminders = [
    { id: 'git', rule: '.agents/rules/git-workflow.md', reason: 'Covers commits.', command: { program: 'git', subcommands: ['commit', 'push'] } },
    { id: 'arch', rule: '.agents/rules/architecture.md', pathGlobs: ['docs/architecture/**'] },
  ];
  const run = (CommandLine) => ({ name: 'run_command', args: { CommandLine } });

  test('commands match by program and subcommand, including git -C and wrapper-free paths', () => {
    assert.equal(findRuleReminders(run('git commit -m x'), reminders, '/p').length, 1);
    assert.equal(findRuleReminders(run('git -C repo commit -m x'), reminders, '/p').length, 1);
    assert.equal(findRuleReminders(run('C:\\tools\\git\\git.exe push'), reminders, '/p').length, 1);
    assert.equal(findRuleReminders(run('git status'), reminders, '/p').length, 0);
    assert.equal(findRuleReminders(run('npm test'), reminders, '/p').length, 0);
  });

  test('file edits match by path glob relative to the project and ignore paths outside it', () => {
    const root = path.resolve('/proj');
    const edit = (p) => ({ name: 'edit_file', args: { Path: p } });
    assert.equal(findRuleReminders(edit(path.join(root, 'docs', 'architecture', 'overview.md')), reminders, root).length, 1);
    assert.equal(findRuleReminders(edit('docs/architecture/x.md'), reminders, root).length, 1);
    assert.equal(findRuleReminders(edit(path.join(root, 'src', 'a.js')), reminders, root).length, 0);
    assert.equal(findRuleReminders(edit(path.resolve('/elsewhere/docs/architecture/x.md')), reminders, root).length, 0);
  });

  test('the reminder names the rule and never changes the decision', () => {
    const evaluated = { toolCall: run('git commit -m x'), result: { decision: 'force_ask' } };
    const asked = withRuleReminders({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask' } }, evaluated, tempWorkspaceWith(reminders));
    assert.equal(asked.hookSpecificOutput.permissionDecision, 'ask');
    assert.match(asked.hookSpecificOutput.additionalContext, /git-workflow\.md/);

    const allowed = withRuleReminders(null, { toolCall: run('git commit -m x'), result: { decision: 'allow' } }, tempWorkspaceWith(reminders));
    assert.equal(allowed.hookSpecificOutput.permissionDecision, undefined);
    assert.match(allowed.hookSpecificOutput.additionalContext, /read the on-demand rule/);

    const denied = { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny' } };
    assert.equal(withRuleReminders(denied, { toolCall: run('git commit'), result: { decision: 'deny' } }, tempWorkspaceWith(reminders)), denied);
    assert.equal(withRuleReminders(null, { toolCall: run('git status'), result: { decision: 'allow' } }, tempWorkspaceWith(reminders)), null);
  });

  test('loadRuleReminders drops malformed entries and tolerates a missing or broken config', () => {
    const dir = tempWorkspace({ ruleReminders: [{ id: 'ok', rule: 'a.md', command: { program: 'git' } }, { id: 'no-rule', command: {} }, { rule: 'b.md', command: {} }, 'junk'] });
    try {
      assert.deepEqual(loadRuleReminders(dir).map((r) => r.id), ['ok']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    assert.deepEqual(loadRuleReminders(path.join(os.tmpdir(), 'no-such-project-dir-xyz')), []);
    const broken = tempWorkspace();
    try {
      fs.writeFileSync(path.join(broken, '.agents', 'framework.config.json'), '{ not json', 'utf8');
      assert.deepEqual(loadRuleReminders(broken), []);
    } finally {
      fs.rmSync(broken, { recursive: true, force: true });
    }
  });

  test('the project config reminds for git commits and architecture docs', () => {
    const real = loadRuleReminders(projectRoot);
    assert.ok(real.length >= 2, 'framework.config.json declares ruleReminders');
    assert.equal(findRuleReminders(run('git commit -m x'), real, projectRoot).length, 1);
    for (const entry of real) assert.ok(fs.existsSync(path.join(projectRoot, entry.rule)), `${entry.rule} exists`);
  });
});

function tempWorkspaceWith(reminders) {
  return tempWorkspace({ ruleReminders: reminders });
}

describe('R1-6: log insights', () => {
  const ask = (commandHead) => ({ timestamp: '2026-11-11T00:00:00Z', input: { tool: 'run_command', commandHead }, decision: { decision: 'force_ask', reason: 'Command profile not in pre-approved allowlist: "…". Interactive confirmation required.' } });
  const deny = (reason) => ({ timestamp: '2026-11-11T00:00:01Z', input: { tool: 'run_command' }, decision: { decision: 'deny', reason } });

  test('programs asked about repeatedly become allowlist candidates; one-offs do not', () => {
    const summary = summarizeLogs({ hookEvents: [ask('npm'), ask('npm'), ask('npm'), ask('pytest'), ask('pytest'), ask('make')] });
    assert.deepEqual(summary.insights.allowlistCandidates, [{ program: 'npm', count: 3 }]);
    assert.match(formatSummary(summary), /3 x npm/);
  });

  test('repeated identical denials are surfaced with arguments redacted', () => {
    const reason = 'Direct filesystem deletion commands are strictly prohibited for "secret-arg".';
    const summary = summarizeLogs({ hookEvents: [deny(reason), deny(reason), deny(reason), deny('Something else.')] });
    assert.equal(summary.insights.repeatedDenials.length, 1);
    assert.equal(summary.insights.repeatedDenials[0].count, 3);
    assert.ok(!JSON.stringify(summary).includes('secret-arg'));
  });

  test('entries without a command head or with other tools produce no candidates', () => {
    const summary = summarizeLogs({ hookEvents: [ask(undefined), ask(undefined), ask(undefined), { input: { tool: 'edit_file' }, decision: { decision: 'force_ask' } }] });
    assert.deepEqual(summary.insights.allowlistCandidates, []);
    assert.doesNotMatch(formatSummary(summary), /Allowlist candidates/);
  });
});

describe('R1-1: case-sensitive file systems', () => {
  test('canonicalCase lowercases only where the file system is case-insensitive', () => {
    const insensitive = process.platform === 'win32' || process.platform === 'darwin';
    assert.equal(canonicalCase('/Work/MixedCase'), insensitive ? '/work/mixedcase' : '/Work/MixedCase');
  });

  test('a workspace path containing capitals still resolves for reads and search scopes', () => {
    const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'CaseTest-')));
    try {
      fs.mkdirSync(path.join(base, 'Src'));
      fs.writeFileSync(path.join(base, 'Src', 'App.js'), 'x', 'utf8');
      const read = evaluateFileSafety({ toolCall: { name: 'read_file', args: { Path: 'Src/App.js' } }, workspacePaths: [base] });
      assert.equal(read.decision, 'allow', read.reason);
      const root = extractCanonicalWorkspaceRoot({ workspacePaths: [base] });
      assert.equal(validateScopeBoundary('Src', root).safe, true);
      const escape = evaluateFileSafety({ toolCall: { name: 'read_file', args: { Path: path.join(path.dirname(base), 'other.txt') } }, workspacePaths: [base] });
      assert.equal(escape.decision, 'deny');
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('R1-8: skill audit', () => {
  const GOOD = '---\nname: good\ndescription: Does a thing. Use when you need it.\n---\n# Good\n\n## 1. When to Use This Skill\n\nWhen needed.\n\n### When NOT to Use\n\nOtherwise.\n\n## 2. Workflow\n\nStep one. Verify the result.\n';
  const WEAK = '---\nname: weak\ndescription: Does a thing.\n---\n# Weak\n\n## Empty\n\n## Parent\n\n### Child\n\nText with a TODO inside.\n\n```bash\n# comment is not a heading\n```\n';

  test('analyzeSkill reads sections, description, placeholders, and empty sections', () => {
    const good = analyzeSkill(GOOD);
    assert.equal(good.hasWhenToUse, true);
    assert.equal(good.hasWhenNotToUse, true);
    assert.equal(good.hasWorkflow, true);
    assert.equal(good.descriptionHasUseWhen, true);
    assert.equal(good.emptySections, 0);

    const weak = analyzeSkill(WEAK);
    assert.equal(weak.descriptionHasUseWhen, false);
    assert.equal(weak.hasWhenToUse, false);
    assert.equal(weak.placeholders, 1);
    assert.equal(weak.emptySections, 1, 'only "Empty" is empty; a parent heading and fenced # lines are not');
  });

  test('auditSkills lists the weak skill and finds boilerplate repeated across skills', () => {
    const shared = 'This sentence is boilerplate that appears in many skills and is long enough to count.';
    const texts = { good: GOOD, weak: WEAK };
    for (let i = 0; i < 5; i++) texts[`copy${i}`] = `${GOOD}\n${shared}\n`;
    const audit = auditSkills(texts);
    assert.equal(audit.skills, 7);
    assert.deepEqual(audit.descriptionWithoutUseWhen, ['weak']);
    assert.deepEqual(audit.missingWhenToUse, ['weak']);
    assert.equal(audit.sharedLines.count, 1);
    assert.match(formatAudit(audit), /Missing a "When to Use" section \(1\): weak/);
  });

  test('every skill in the repository can be analyzed', () => {
    const skillsDir = path.join(projectRoot, '.agents', 'skills');
    const texts = {};
    for (const name of fs.readdirSync(skillsDir)) {
      const file = path.join(skillsDir, name, 'SKILL.md');
      if (fs.existsSync(file)) texts[name] = fs.readFileSync(file, 'utf8');
    }
    const audit = auditSkills(texts);
    assert.equal(audit.skills, 81);
    assert.deepEqual(audit.emptySections, []);
  });
});

describe('R1-7: ECC drift', () => {
  const STAMPED = (extra = '') => `---\ntrigger: glob\nsource: ecc-universal@2.2.3\n---\n# T\n\n> This file extends [x.md](x.md) with more.\n\nBody line one.\nBody   line two.\n${extra}`;
  const UPSTREAM = '---\npaths:\n  - "**/*.py"\n---\n# T\n\n> This file extends [common/x.md](common-x.md) with more.\n\nBody line one.\nBody line two.\n';

  test('stampOf reads the version from frontmatter only', () => {
    assert.equal(stampOf(STAMPED()), '2.2.3');
    assert.equal(stampOf('---\ntrigger: glob\n---\nsource: ecc-universal@9.9.9\n'), null);
    assert.equal(stampOf('no frontmatter'), null);
  });

  test('compareBodies ignores frontmatter, the extends line, and whitespace but reports content changes', () => {
    assert.deepEqual(compareBodies(STAMPED(), UPSTREAM), { status: 'unchanged', addedLines: 0, removedLines: 0 });
    const modified = compareBodies(STAMPED('Local addition.\n'), UPSTREAM);
    assert.equal(modified.status, 'modified');
    assert.equal(modified.addedLines, 1);
    assert.equal(compareBodies(STAMPED(), UPSTREAM + 'Upstream only.\n').removedLines, 1);
  });

  test('buildDriftReport flags stamps that differ from the notices version and compares against a local copy', () => {
    const root = tempWorkspace();
    try {
      fs.writeFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), '- **Package**: `ecc-universal` v2.2.3 (npm)\n', 'utf8');
      fs.mkdirSync(path.join(root, '.agents', 'rules'));
      fs.writeFileSync(path.join(root, '.agents', 'rules', 'same.md'), STAMPED(), 'utf8');
      fs.writeFileSync(path.join(root, '.agents', 'rules', 'changed.md'), STAMPED('Extra.\n'), 'utf8');
      fs.writeFileSync(path.join(root, '.agents', 'rules', 'gone.md'), STAMPED(), 'utf8');
      fs.writeFileSync(path.join(root, '.agents', 'rules', 'old.md'), STAMPED().replace('2.2.3', '2.1.0'), 'utf8');
      fs.writeFileSync(path.join(root, '.agents', 'rules', 'native.md'), '---\ntrigger: always_on\n---\n# Own\n', 'utf8');
      const ecc = path.join(root, 'upstream');
      fs.mkdirSync(path.join(ecc, 'rules'), { recursive: true });
      for (const name of ['same', 'changed', 'old']) fs.writeFileSync(path.join(ecc, 'rules', `${name}.md`), UPSTREAM, 'utf8');

      assert.equal(noticesVersion(root), '2.2.3');
      assert.equal(collectStamps(root).length, 4);

      const report = buildDriftReport(root, ecc);
      assert.deepEqual(report.mismatched.map((m) => m.file), ['old.md']);
      assert.deepEqual(report.upstream.unchanged, ['old.md', 'same.md']);
      assert.deepEqual(report.upstream.modified.map((m) => m.file), ['changed.md']);
      assert.deepEqual(report.upstream.missingUpstream, ['gone.md']);

      assert.equal(buildDriftReport(root, path.join(root, 'absent')).upstream, null);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('every stamped file in the repository matches the notices version', () => {
    const report = buildDriftReport(projectRoot, null);
    assert.ok(report.expectedVersion);
    assert.ok(report.stamped >= 100);
    assert.deepEqual(report.mismatched, []);
  });
});
