import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveDefaultArtifactDir } from '../lib/artifact-dir.mjs';
import { CORE_SKILLS, PLUGIN_DIR, PLUGIN_NAME, buildPlugin, checkPlugin, keepShippedSkills, writePlugin } from '../lib/plugin-build.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const builder = path.join(projectRoot, '.agents', 'scripts', 'build-plugin.mjs');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'operon-plugin-'));
}

/** A minimal copy of the framework sources the builder reads. */
function miniSource() {
  const root = tempDir();
  const agents = path.join(root, '.agents');
  fs.mkdirSync(agents, { recursive: true });
  fs.copyFileSync(path.join(projectRoot, '.agents', 'framework.config.json'), path.join(agents, 'framework.config.json'));
  fs.cpSync(path.join(projectRoot, '.agents', 'agents'), path.join(agents, 'agents'), { recursive: true });
  fs.cpSync(path.join(projectRoot, '.agents', 'scripts'), path.join(agents, 'scripts'), { recursive: true, filter: (src) => !src.includes(`${path.sep}tests`) });
  for (const skill of CORE_SKILLS) fs.cpSync(path.join(projectRoot, '.agents', 'skills', skill), path.join(agents, 'skills', skill), { recursive: true });
  return root;
}

test('the manifest, hooks, skills, and agents are built from the sources', () => {
  const files = buildPlugin(projectRoot);
  const config = JSON.parse(fs.readFileSync(path.join(projectRoot, '.agents', 'framework.config.json'), 'utf8'));

  const manifest = JSON.parse(files.get(`${PLUGIN_DIR}/.claude-plugin/plugin.json`));
  assert.equal(manifest.name, PLUGIN_NAME);
  assert.equal(manifest.version, config.version);
  assert.match(manifest.name, /^[a-z0-9-]+$/);

  const hooks = JSON.parse(files.get(`${PLUGIN_DIR}/hooks/hooks.json`)).hooks;
  assert.deepEqual(Object.keys(hooks).sort(), ['PostToolUse', 'PreToolUse', 'SessionStart']);
  for (const event of Object.values(hooks)) {
    for (const entry of event) for (const hook of entry.hooks) assert.match(hook.command, /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/adapters\/claude-code\.mjs/);
  }
  assert.match(hooks.PreToolUse[0].matcher, /mcp__\.\*/, 'MCP calls are governed');

  for (const skill of CORE_SKILLS) assert.ok(files.has(`${PLUGIN_DIR}/skills/${skill}/SKILL.md`), skill);
  const agentFiles = [...files.keys()].filter((f) => f.startsWith(`${PLUGIN_DIR}/agents/`));
  assert.equal(agentFiles.length, config.subagents.length);

  for (const file of agentFiles) {
    const text = files.get(file);
    const tools = /^tools: (.*)$/m.exec(text)[1];
    if (!file.endsWith('code-implementer.md')) assert.equal(tools, 'Read, Grep, Glob', `${file} stays read-only`);
    const bound = [...(/^skills:\r?\n((?:  - .+\r?\n?)+)/m.exec(text)?.[1] || '').matchAll(/  - (.+)/g)].map((m) => m[1].trim());
    for (const skill of bound) assert.ok(CORE_SKILLS.includes(skill), `${file} binds a skill the plugin does not ship: ${skill}`);
  }
});

test('nothing outside the plugin folder is referenced, and rules, workflows, and the Stop gate are not shipped', () => {
  const files = buildPlugin(projectRoot);
  for (const rel of files.keys()) {
    if (rel === '.claude-plugin/marketplace.json') continue;
    assert.ok(rel.startsWith(`${PLUGIN_DIR}/`), rel);
  }
  assert.ok(![...files.keys()].some((f) => /\/(rules|commands|workflows)\//.test(f)));
  const hooks = files.get(`${PLUGIN_DIR}/hooks/hooks.json`);
  assert.ok(!hooks.includes('"Stop"'), 'the Stop hook is not registered');

  const marketplace = JSON.parse(files.get('.claude-plugin/marketplace.json'));
  assert.equal(marketplace.plugins[0].name, PLUGIN_NAME);
  assert.equal(marketplace.plugins[0].source, `./${PLUGIN_DIR}`);
});

test('keepShippedSkills drops skills the plugin lacks and removes an emptied block', () => {
  const text = '---\nname: x\nskills:\n  - code-review\n  - cpp-review\n---\nBody\n';
  assert.match(keepShippedSkills(text, ['code-review']), /skills:\n {2}- code-review\n---/);
  assert.ok(!keepShippedSkills(text, ['code-review']).includes('cpp-review'));
  assert.ok(!keepShippedSkills(text, []).includes('skills:'));
  assert.equal(keepShippedSkills('---\nname: x\n---\nBody\n', ['a']), '---\nname: x\n---\nBody\n');
});

test('the committed plugin matches the sources', () => {
  assert.deepEqual(checkPlugin(projectRoot), { missing: [], changed: [], extra: [] });
});

test('checkPlugin reports missing, changed, and unexpected files, and writePlugin repairs them', () => {
  const root = miniSource();
  try {
    writePlugin(root);
    assert.deepEqual(checkPlugin(root), { missing: [], changed: [], extra: [] });

    const hooksFile = path.join(root, PLUGIN_DIR, 'hooks', 'hooks.json');
    fs.writeFileSync(hooksFile, '{}');
    fs.rmSync(path.join(root, PLUGIN_DIR, 'README.md'));
    fs.writeFileSync(path.join(root, PLUGIN_DIR, 'stray.md'), 'x');
    const drift = checkPlugin(root);
    assert.deepEqual(drift.changed, [`${PLUGIN_DIR}/hooks/hooks.json`]);
    assert.deepEqual(drift.missing, [`${PLUGIN_DIR}/README.md`]);
    assert.deepEqual(drift.extra, [`${PLUGIN_DIR}/stray.md`]);

    const cli = spawnSync(process.execPath, [builder, '--root', root, '--check'], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /out of date/);

    const repaired = writePlugin(root);
    assert.deepEqual(repaired.removed, [`${PLUGIN_DIR}/stray.md`]);
    assert.equal(spawnSync(process.execPath, [builder, '--root', root, '--check'], { encoding: 'utf8' }).status, 0);

    // Windows may convert line endings in a checkout; that is not drift.
    const manifest = path.join(root, PLUGIN_DIR, '.claude-plugin', 'plugin.json');
    fs.writeFileSync(manifest, fs.readFileSync(manifest, 'utf8').replace(/\n/g, '\r\n'));
    assert.deepEqual(checkPlugin(root).changed, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the plugin hooks work from the plugin folder in a project that has no .agents directory', () => {
  const ws = tempDir();
  const artifactDir = resolveDefaultArtifactDir(ws);
  const adapter = path.join(projectRoot, PLUGIN_DIR, 'scripts', 'adapters', 'claude-code.mjs');
  const run = (event, payload) => {
    const res = spawnSync(process.execPath, [adapter, event], {
      input: JSON.stringify({ cwd: ws, ...payload }),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: ws },
    });
    assert.equal(res.status, 0, res.stderr);
    return res.stdout.trim() ? JSON.parse(res.stdout.trim()) : null;
  };
  try {
    fs.mkdirSync(path.join(ws, 'src'));
    fs.writeFileSync(path.join(ws, 'src', 'app.js'), 'v1');

    assert.match(run('session-start', { session_id: 't' }).hookSpecificOutput.additionalContext, /Session baseline established/);
    assert.equal(run('pre-tool-use', { tool_name: 'Edit', tool_input: { file_path: path.join(ws, 'src', 'app.js'), new_string: 'v2' } }), null);
    assert.equal(run('pre-tool-use', { tool_name: 'Bash', tool_input: { command: 'git clean -fdx' } }).hookSpecificOutput.permissionDecision, 'deny');
    assert.equal(run('pre-tool-use', { tool_name: 'Bash', tool_input: { command: 'ls; ls' } }).hookSpecificOutput.permissionDecision, 'deny');
    assert.equal(run('pre-tool-use', { tool_name: 'Write', tool_input: { file_path: path.join(os.tmpdir(), 'operon-outside.txt'), content: 'x' } }).hookSpecificOutput.permissionDecision, 'deny');
    assert.equal(run('pre-tool-use', { tool_name: 'Write', tool_input: { file_path: path.join(ws, 'AGENTS.md'), content: 'x' } }).hookSpecificOutput.permissionDecision, 'ask');
    assert.equal(run('post-tool-use', { tool_name: 'Edit', tool_input: {} }), null);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
    fs.rmSync(artifactDir, { recursive: true, force: true });
  }
});
