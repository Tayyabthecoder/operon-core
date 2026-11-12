import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { STACKS, applyInit, detectStacks, planInit, ruleStack } from '../lib/bootstrap.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cli = path.join(sourceRoot, 'bin', 'operon.mjs');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'operon-'));
}

function write(dir, name, content) {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), content);
}

test('ruleStack separates core rules from language rules', () => {
  assert.equal(ruleStack('security.md'), null);
  assert.equal(ruleStack('testing.md'), null);
  assert.equal(ruleStack('python-testing.md'), 'python');
  assert.equal(ruleStack('python-fastapi.md'), 'python');
  assert.equal(ruleStack('react-native-hooks.md'), 'react-native');
  assert.equal(ruleStack('react-hooks.md'), 'react');
  assert.equal(ruleStack('web-design-quality.md'), 'web');
});

test('every rule in the source config is either core or belongs to a known stack', () => {
  const config = JSON.parse(fs.readFileSync(path.join(sourceRoot, '.agents', 'framework.config.json'), 'utf8'));
  const core = config.rules.filter((rule) => ruleStack(rule) === null);
  assert.equal(core.length, 15, `core rules: ${core.join(', ')}`);
  for (const rule of config.rules) {
    const stack = ruleStack(rule);
    assert.ok(stack === null || STACKS.includes(stack), rule);
  }
});

test('detectStacks reads marker files and package dependencies', () => {
  const dir = tempDir();
  try {
    assert.deepEqual(detectStacks(dir), []);
    write(dir, 'package.json', JSON.stringify({ dependencies: { react: '18.0.0' }, devDependencies: { typescript: '5.0.0' } }));
    write(dir, 'go.mod', 'module example.com/x\n');
    write(dir, 'build.gradle.kts', '');
    assert.deepEqual(detectStacks(dir), ['golang', 'kotlin', 'react', 'typescript', 'web']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('planInit refuses the source itself, a missing directory, an existing install, and unknown stacks', () => {
  assert.match(planInit({ sourceRoot, targetDir: sourceRoot }).error, /source itself/);
  assert.match(planInit({ sourceRoot, targetDir: path.join(os.tmpdir(), 'operon-does-not-exist-xyz') }).error, /does not exist/);
  const dir = tempDir();
  try {
    assert.match(planInit({ sourceRoot, targetDir: dir, stacks: ['cobol'] }).error, /unknown stack/);
    fs.mkdirSync(path.join(dir, '.agents'));
    assert.match(planInit({ sourceRoot, targetDir: dir }).error, /never overwrites/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('init installs core and selected language rules, keeps existing files, and passes the validator', () => {
  const dir = tempDir();
  try {
    write(dir, 'package.json', JSON.stringify({ dependencies: { react: '18.0.0' }, devDependencies: { typescript: '5.0.0' } }));
    write(dir, 'README.md', '# Demo\n\nNo framework badge here.\n');
    write(dir, 'AGENTS.md', '# My own notes\n');

    const plan = planInit({ sourceRoot, targetDir: dir, stacks: 'auto' });
    assert.equal(plan.ok, true, plan.error);
    assert.deepEqual(plan.stacks, ['react', 'typescript', 'web']);
    applyInit(plan);

    assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), '# My own notes\n');
    assert.equal(fs.readFileSync(path.join(dir, 'README.md'), 'utf8'), '# Demo\n\nNo framework badge here.\n');
    assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n');

    const rules = fs.readdirSync(path.join(dir, '.agents', 'rules'));
    assert.ok(rules.includes('security.md') && rules.includes('react-hooks.md') && rules.includes('typescript-testing.md'));
    assert.ok(!rules.includes('python-testing.md') && !rules.includes('react-native-hooks.md'));

    const config = JSON.parse(fs.readFileSync(path.join(dir, '.agents', 'framework.config.json'), 'utf8'));
    assert.equal(config.version, undefined);
    assert.deepEqual(config.hosts, [], 'a new install keeps no generated host files until the owner opts in');
    assert.equal(config.expectedCounts.rules, rules.length);
    assert.equal(config.rules.length, rules.length);

    assert.equal(fs.existsSync(path.join(dir, '.agents', 'scripts', 'tests')), false);
    assert.equal(fs.existsSync(path.join(dir, '.agents', 'scratch')), false);
    const log = fs.readFileSync(path.join(dir, '.agents', 'memory', 'decision-log.md'), 'utf8');
    assert.ok(!/^- \d{4}-/m.test(log), 'the framework repository\'s own decisions must not be copied');
    const meta = JSON.parse(fs.readFileSync(path.join(dir, '.agents', '.operon.json'), 'utf8'));
    assert.deepEqual(meta.stacks, ['react', 'typescript', 'web']);

    const validator = spawnSync(process.execPath, [path.join(dir, '.agents', 'scripts', 'validate-framework.mjs')], { cwd: dir, encoding: 'utf8' });
    assert.equal(validator.status, 0, `${validator.stdout}\n${validator.stderr}`);

    // A second run must not touch the install.
    assert.match(planInit({ sourceRoot, targetDir: dir }).error, /never overwrites/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI supports --dry-run and rejects bad usage', () => {
  const dir = tempDir();
  try {
    const dry = spawnSync(process.execPath, [cli, 'init', dir, '--stack', 'python', '--dry-run'], { encoding: 'utf8' });
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /Dry run: nothing was written/);
    assert.equal(fs.existsSync(path.join(dir, '.agents')), false);

    const bad = spawnSync(process.execPath, [cli, 'init', dir, '--stack', 'cobol'], { encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /unknown stack/);

    assert.equal(spawnSync(process.execPath, [cli, 'nope'], { encoding: 'utf8' }).status, 2);
    assert.equal(spawnSync(process.execPath, [cli, 'init', '--bogus'], { encoding: 'utf8' }).status, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
