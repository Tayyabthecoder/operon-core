import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  HOSTS, MARKER, buildHostFiles, checkHostFiles, parseAgent, toCodexAgent, toCursorRule, toGeminiCommand, writeHostFiles,
} from '../lib/host-adapters.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cli = path.join(projectRoot, '.agents', 'scripts', 'setup-hosts.mjs');
const read = (rel) => fs.readFileSync(path.join(projectRoot, rel), 'utf8');

/** A copy of the sources the generator reads: config, rules, agents, workflows. */
function miniSource() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'operon-hosts-'));
  fs.mkdirSync(path.join(root, '.agents'));
  fs.copyFileSync(path.join(projectRoot, '.agents', 'framework.config.json'), path.join(root, '.agents', 'framework.config.json'));
  for (const dir of ['rules', 'agents', 'workflows']) fs.cpSync(path.join(projectRoot, '.agents', dir), path.join(root, '.agents', dir), { recursive: true });
  return root;
}

test('the committed host files match the sources', () => {
  assert.deepEqual(checkHostFiles(projectRoot, HOSTS), { missing: [], changed: [], stale: [], conflicts: [] });
});

test('the repository config lists the hosts it keeps in sync', () => {
  const config = JSON.parse(read('.agents/framework.config.json'));
  assert.deepEqual(config.hosts, [...HOSTS]);
});

test('Cursor rules map the loading mode to alwaysApply and globs', () => {
  const always = read('.cursor/rules/core-workflow.mdc');
  assert.match(always, /^alwaysApply: true$/m);
  assert.doesNotMatch(always, /^globs:/m);

  const conditional = read('.cursor/rules/frontend.mdc');
  assert.match(conditional, /^globs: \*\*\/\*\.tsx, \*\*\/\*\.jsx/m);
  assert.match(conditional, /^alwaysApply: false$/m);

  const onDemand = read('.cursor/rules/architecture.mdc');
  assert.match(onDemand, /^alwaysApply: false$/m);
  assert.doesNotMatch(onDemand, /^globs:/m);
  assert.match(onDemand, /^description: ".+"$/m);

  for (const file of ['core-workflow', 'frontend', 'architecture']) assert.ok(read(`.cursor/rules/${file}.mdc`).includes(MARKER));
});

test('links between rules point at the .mdc copies', () => {
  const source = '---\ntrigger: model_decision\ndescription: "d"\n---\nSee [testing](testing.md#part) and [other](./security.md) and [docs](../../docs/x.md).\n';
  const out = toCursorRule(source, '.agents/rules/x.md', ['testing', 'security']);
  assert.match(out, /\]\(testing\.mdc#part\)/);
  assert.match(out, /\]\(security\.mdc\)/);
  assert.match(out, /\]\(\.\.\/\.\.\/docs\/x\.md\)/, 'links to other files are left alone');
});

test('read-only roles stay read-only where the host can express it, and say so where it cannot', () => {
  const qa = '.agents/agents/qa-reviewer.md';
  const impl = '.agents/agents/code-implementer.md';
  assert.equal(parseAgent(read(qa), qa).readOnly, true);
  assert.equal(parseAgent(read(impl), impl).readOnly, false);

  assert.match(read('.cursor/agents/qa-reviewer.md'), /^readonly: true$/m);
  assert.match(read('.cursor/agents/code-implementer.md'), /^readonly: false$/m);

  const geminiQa = read('.gemini/agents/qa-reviewer.md');
  assert.match(geminiQa, /^tools:\n {2}- read_file\n {2}- list_directory\n {2}- glob\n {2}- grep_search\n---/m);
  assert.doesNotMatch(read('.gemini/agents/code-implementer.md'), /^tools:/m, 'the mutating agent inherits the parent tools');

  const codexQa = read('.codex/agents/qa-reviewer.toml');
  assert.match(codexQa, /read-only role/);
  assert.match(codexQa, /not an enforced limit/);
  assert.doesNotMatch(read('.codex/agents/code-implementer.toml'), /read-only role/);
});

test('every read-only agent is read-only in all three outputs', () => {
  const config = JSON.parse(read('.agents/framework.config.json'));
  for (const file of config.subagents.filter((f) => f !== 'code-implementer.md')) {
    assert.match(read(`.cursor/agents/${file}`), /^readonly: true$/m, file);
    assert.match(read(`.gemini/agents/${file}`), /^tools:\n {2}- read_file/m, file);
    assert.match(read(`.codex/agents/${file.replace(/\.md$/, '.toml')}`), /read-only role/, file);
  }
});

test('Gemini commands use {{args}}, keep the description, and never carry shell or file injection', () => {
  const config = JSON.parse(read('.agents/framework.config.json'));
  for (const workflow of config.workflows) {
    const toml = read(`.gemini/commands/${workflow.replace(/\.md$/, '.toml')}`);
    assert.doesNotMatch(toml, /\$ARGUMENTS/, workflow);
    assert.doesNotMatch(toml, /!\{|@\{/, workflow);
    assert.match(toml, /^description = ".+"$/m, workflow);
    assert.match(toml, /^prompt = '''\n/m, workflow);
    assert.equal((toml.match(/'''/g) || []).length, 2, `${workflow}: exactly one literal string`);
  }
  assert.match(read('.gemini/commands/retro.toml'), /\{\{args\}\}/);
});

test('the converters refuse input the target host would execute or cannot represent', () => {
  const wf = (body) => `---\ndescription: "d"\n---\n${body}\n`;
  assert.throws(() => toGeminiCommand(wf('Run !{rm -rf x}'), 'w.md'), /would run or expand/);
  assert.throws(() => toGeminiCommand(wf('Read @{secret.txt}'), 'w.md'), /would run or expand/);
  assert.throws(() => toGeminiCommand(wf("It's '''x'''"), 'w.md'), /TOML literal/);
  const agent = '---\nname: a\ndescription: "d"\ntools:\n  - read_file\n---\nBody with \'\'\' quotes\n';
  assert.throws(() => toCodexAgent(agent, 'a.md'), /TOML literal/);
  assert.throws(() => parseAgent('---\nname: a\n---\nx', 'a.md'), /Missing name or description/);
});

test('GEMINI.md imports exactly the session-start rules, and every imported file exists', () => {
  const text = read('GEMINI.md');
  const imports = [...text.matchAll(/^@\.\/(.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ['.agents/rules/change-safety.md', '.agents/rules/core-workflow.md', '.agents/rules/security.md']);
  for (const file of imports) assert.ok(fs.existsSync(path.join(projectRoot, file)), file);
  assert.match(text, /Not enforced here/, 'the missing hook enforcement is stated in the file itself');
});

test('writing repairs drift, removes stale generated files, and never touches files the framework did not write', () => {
  const root = miniSource();
  try {
    const first = writeHostFiles(root, HOSTS);
    assert.equal(first.written, buildHostFiles(root, HOSTS).size);
    assert.deepEqual(checkHostFiles(root, HOSTS), { missing: [], changed: [], stale: [], conflicts: [] });

    // Drift: a changed file, a missing file, and a stale generated file.
    fs.appendFileSync(path.join(root, '.cursor/rules/security.mdc'), '\nextra\n');
    fs.rmSync(path.join(root, '.codex/agents/qa-reviewer.toml'));
    fs.writeFileSync(path.join(root, '.cursor/rules/old-rule.mdc'), `---\n---\n<!-- ${MARKER} from x -->\n`);
    // A user's own files: an unrelated Cursor rule, and a GEMINI.md they wrote themselves.
    fs.writeFileSync(path.join(root, '.cursor/rules/mine.mdc'), '---\nalwaysApply: false\n---\nMy rule\n');
    fs.rmSync(path.join(root, 'GEMINI.md'));
    fs.writeFileSync(path.join(root, 'GEMINI.md'), 'my own notes\n');

    const drift = checkHostFiles(root, HOSTS);
    assert.deepEqual(drift.changed, ['.cursor/rules/security.mdc']);
    assert.deepEqual(drift.missing, ['.codex/agents/qa-reviewer.toml']);
    assert.deepEqual(drift.stale, ['.cursor/rules/old-rule.mdc']);
    assert.deepEqual(drift.conflicts, ['GEMINI.md']);

    const fixed = writeHostFiles(root, HOSTS);
    assert.deepEqual(fixed.removed, ['.cursor/rules/old-rule.mdc']);
    assert.deepEqual(fixed.conflicts, ['GEMINI.md']);
    assert.equal(fs.readFileSync(path.join(root, 'GEMINI.md'), 'utf8'), 'my own notes\n', 'a file the framework did not write is kept');
    assert.ok(fs.existsSync(path.join(root, '.cursor/rules/mine.mdc')), 'a user rule is kept');
    assert.ok(fs.existsSync(path.join(root, '.codex/agents/qa-reviewer.toml')));

    // Line-ending conversion by a checkout is not drift.
    const rule = path.join(root, '.cursor/rules/testing.mdc');
    fs.writeFileSync(rule, fs.readFileSync(rule, 'utf8').replace(/\r?\n/g, '\r\n'));
    assert.deepEqual(checkHostFiles(root, HOSTS).changed, []);

    // Only the requested hosts are built.
    assert.ok([...buildHostFiles(root, ['codex']).keys()].every((f) => f.startsWith('.codex/')));
    assert.throws(() => buildHostFiles(root, ['vim']), /unknown host/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the CLI writes, checks, and reports drift with exit codes', () => {
  const root = miniSource();
  try {
    const run = (...args) => spawnSync(process.execPath, [cli, '--root', root, ...args], { encoding: 'utf8' });
    const written = run('--host', 'codex');
    assert.equal(written.status, 0, written.stderr);
    assert.equal(run('--host', 'codex', '--check').status, 0);

    fs.rmSync(path.join(root, '.codex/agents/docs-auditor.toml'));
    const drift = run('--host', 'codex', '--check');
    assert.equal(drift.status, 1);
    assert.match(drift.stderr, /missing: \.codex\/agents\/docs-auditor\.toml/);
    assert.equal(run('--host', 'vim').status, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
