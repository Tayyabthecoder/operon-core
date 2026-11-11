import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  evaluateMcpCall,
  grantsForAgent,
  loadMcpPolicy,
  normalizeMcpPolicy,
  parseMcpToolName,
  validateMcpPolicy,
} from '../lib/mcp-policy.mjs';
import { evaluateClaudePreToolDecision } from '../adapters/claude-code.mjs';
import { setupClaudeCode, toClaudeAgent } from '../adapters/setup-claude-code.mjs';
import { resolveDefaultArtifactDir } from '../lib/artifact-dir.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const adapterScript = path.join(projectRoot, '.agents', 'scripts', 'adapters', 'claude-code.mjs');

const POLICY = {
  defaultDecision: 'ask',
  servers: {
    docs: {
      tools: { 'get_*': 'allow', 'get_secret*': 'deny', 'delete_*': 'deny', '*': 'ask', get_page: 'allow' },
      readOnlyTools: ['get_page'],
    },
    open: { tools: { '*': 'allow' } },
  },
  agentGrants: { 'docs-auditor': ['mcp__docs__get_page'] },
};

function workspaceWithPolicy(mcpPolicy) {
  const ws = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-')));
  fs.mkdirSync(path.join(ws, '.agents'), { recursive: true });
  fs.writeFileSync(path.join(ws, '.agents', 'framework.config.json'), JSON.stringify(mcpPolicy === undefined ? {} : { mcpPolicy }), 'utf8');
  return ws;
}

const decide = (tool, policy = normalizeMcpPolicy(POLICY)) => evaluateMcpCall(tool, policy);

describe('MCP policy (R2-2)', () => {
  test('parseMcpToolName splits server and tool and rejects other names', () => {
    assert.deepEqual(parseMcpToolName('mcp__docs__get_page'), { server: 'docs', tool: 'get_page' });
    assert.deepEqual(parseMcpToolName('mcp__claude-in-chrome__read_page'), { server: 'claude-in-chrome', tool: 'read_page' });
    assert.deepEqual(parseMcpToolName('mcp__a__b__c'), { server: 'a', tool: 'b__c' });
    for (const bad of ['Bash', 'mcp__docs', 'mcp__docs__', 'mcp____tool', 'mcp_docs__x', '', null, undefined, 42]) {
      assert.equal(parseMcpToolName(bad), null, String(bad));
    }
  });

  test('exact beats prefix beats catch-all, and a matching deny always wins', () => {
    assert.equal(decide('mcp__docs__get_page').decision, 'allow');
    assert.equal(decide('mcp__docs__get_anything').decision, 'allow');
    assert.equal(decide('mcp__docs__update_page').decision, 'ask');
    assert.equal(decide('mcp__docs__delete_page').decision, 'deny');
    assert.equal(decide('mcp__docs__get_secret_key').decision, 'deny', 'deny beats the broader get_* allow');
    assert.match(decide('mcp__docs__delete_page').reason, /denied by mcpPolicy\.servers\.docs/);
    assert.match(decide('mcp__docs__update_page').reason, /requires confirmation/);
  });

  test('servers without rules follow defaultDecision, and non-MCP names are not this policy\'s business', () => {
    assert.equal(decide('mcp__unknown__tool').decision, 'ask');
    assert.match(decide('mcp__unknown__tool').reason, /defaultDecision/);
    assert.equal(decide('mcp__open__anything').decision, 'allow');
    assert.equal(decide('Bash').decision, 'allow');
    assert.equal(evaluateMcpCall('mcp__x__y', normalizeMcpPolicy(undefined)).decision, 'allow', 'no policy keeps today\'s behavior');
    assert.equal(evaluateMcpCall('mcp__x__y', normalizeMcpPolicy({ defaultDecision: 'deny' })).decision, 'deny');
  });

  test('normalizing drops invalid entries instead of widening access', () => {
    const policy = normalizeMcpPolicy({
      defaultDecision: 'maybe',
      servers: { s: { tools: { a: 'allow', b: 'permit', c: 7 }, readOnlyTools: ['x', 5] }, bad: 'nope' },
      agentGrants: { agent: ['mcp__s__a', 9], other: 'not-an-array' },
    });
    assert.equal(policy.defaultDecision, 'allow');
    assert.deepEqual(policy.servers.s.tools, { a: 'allow' });
    assert.deepEqual(policy.servers.s.readOnlyTools, ['x']);
    assert.equal(policy.servers.bad, undefined);
    assert.deepEqual(policy.agentGrants, { agent: ['mcp__s__a'] });
    for (const raw of [null, 'x', [], 5]) assert.equal(normalizeMcpPolicy(raw).defaultDecision, 'allow');
  });

  test('validateMcpPolicy accepts a good policy and an absent one', () => {
    assert.deepEqual(validateMcpPolicy(undefined, ['docs-auditor']), []);
    assert.deepEqual(validateMcpPolicy(POLICY, ['docs-auditor', 'code-implementer']), []);
  });

  test('validateMcpPolicy reports bad decisions, wildcards in the middle, and unknown agents', () => {
    const errors = validateMcpPolicy({ defaultDecision: 'maybe', servers: { s: { tools: { 'a*b': 'allow', c: 'permit' } } }, agentGrants: { ghost: [] } }, ['docs-auditor']);
    assert.ok(errors.some((e) => /defaultDecision/.test(e)));
    assert.ok(errors.some((e) => /only a trailing \*/.test(e)));
    assert.ok(errors.some((e) => /tools\["c"\] must be allow, ask, or deny/.test(e)));
    assert.ok(errors.some((e) => /unknown agent "ghost"/.test(e)));
    assert.equal(validateMcpPolicy(5, []).length, 1);
  });

  test('grants must be exact, from a declared server, not denied, and attested read-only for read-only agents', () => {
    const agents = ['docs-auditor', 'code-implementer'];
    const withGrant = (agent, tool) => validateMcpPolicy({ ...POLICY, agentGrants: { [agent]: [tool] } }, agents);

    assert.ok(withGrant('docs-auditor', 'mcp__docs__*').some((e) => /exact/.test(e)));
    assert.ok(withGrant('docs-auditor', 'Read').some((e) => /exact/.test(e)));
    assert.ok(withGrant('docs-auditor', 'mcp__nowhere__get_page').some((e) => /not declared/.test(e)));
    assert.ok(withGrant('docs-auditor', 'mcp__docs__delete_page').some((e) => /denied by the policy/.test(e)));
    assert.ok(withGrant('docs-auditor', 'mcp__docs__update_page').some((e) => /readOnlyTools/.test(e)), 'not attested read-only');
    assert.deepEqual(withGrant('docs-auditor', 'mcp__docs__get_page'), []);
    assert.deepEqual(withGrant('code-implementer', 'mcp__docs__update_page'), [], 'the writer agent needs no attestation');
  });

  test('the shipped project policy is valid and does not change behavior by default', () => {
    const config = JSON.parse(fs.readFileSync(path.join(projectRoot, '.agents', 'framework.config.json'), 'utf8'));
    const agents = fs.readdirSync(path.join(projectRoot, '.agents', 'agents')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.replace(/\.md$/, ''));
    assert.deepEqual(validateMcpPolicy(config.mcpPolicy, agents), []);
    assert.equal(loadMcpPolicy(projectRoot).defaultDecision, 'allow');
    assert.equal(evaluateMcpCall('mcp__anything__at_all', loadMcpPolicy(projectRoot)).decision, 'allow');
  });

  test('loadMcpPolicy falls back to the default for a missing or broken config', () => {
    const ws = workspaceWithPolicy(POLICY);
    try {
      assert.equal(loadMcpPolicy(ws).servers.docs.tools['delete_*'], 'deny');
      fs.writeFileSync(path.join(ws, '.agents', 'framework.config.json'), '{ not json', 'utf8');
      assert.equal(loadMcpPolicy(ws).defaultDecision, 'allow');
      assert.equal(loadMcpPolicy(path.join(os.tmpdir(), 'no-such-dir-mcp-xyz')).defaultDecision, 'allow');
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  });

  test('the adapter maps policy decisions to allow, force_ask, and deny for MCP tool calls', () => {
    const ws = workspaceWithPolicy(POLICY);
    const run = (tool_name, tool_input) => {
      const previous = process.env.CLAUDE_PROJECT_DIR;
      process.env.CLAUDE_PROJECT_DIR = ws;
      try {
        return evaluateClaudePreToolDecision({ tool_name, tool_input, cwd: ws });
      } finally {
        if (previous === undefined) delete process.env.CLAUDE_PROJECT_DIR;
        else process.env.CLAUDE_PROJECT_DIR = previous;
      }
    };
    try {
      assert.equal(run('mcp__docs__get_page', { id: 1 }).result.decision, 'allow');
      assert.equal(run('mcp__docs__update_page', { id: 1 }).result.decision, 'force_ask');
      assert.equal(run('mcp__docs__delete_page', undefined).result.decision, 'deny');
      assert.deepEqual(run('mcp__docs__get_page', { b: 1, a: 2 }).toolCall.args.argKeys, ['a', 'b']);
      assert.equal(run('mcp__malformed', {}), null, 'a name that is not mcp__server__tool is left to Claude Code');
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  });

  test('the hook answers a denied MCP call with deny and logs the tool and argument names but never values', () => {
    const ws = workspaceWithPolicy(POLICY);
    const artifactDir = resolveDefaultArtifactDir(ws);
    try {
      const res = spawnSync(process.execPath, [adapterScript, 'pre-tool-use'], {
        input: JSON.stringify({ tool_name: 'mcp__docs__delete_page', tool_input: { id: 'TOP_SECRET_VALUE_9931' }, cwd: ws }),
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_PROJECT_DIR: ws },
      });
      assert.equal(res.status, 0);
      const output = JSON.parse(res.stdout.trim());
      assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
      assert.match(output.hookSpecificOutput.permissionDecisionReason, /denied by mcpPolicy/);

      const logText = fs.readFileSync(path.join(artifactDir, 'hook-event-log.jsonl'), 'utf8');
      const entry = JSON.parse(logText.trim().split('\n').pop());
      assert.equal(entry.input.tool, 'mcp_call');
      assert.equal(entry.input.target, 'docs/delete_page');
      assert.deepEqual(entry.input.argKeys, ['id']);
      assert.equal(entry.decision.decision, 'deny');
      assert.ok(!logText.includes('TOP_SECRET_VALUE_9931'), 'argument values are never logged');
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
      fs.rmSync(artifactDir, { recursive: true, force: true });
    }
  });

  test('toClaudeAgent adds granted MCP tools once and leaves agents without grants unchanged', () => {
    const source = fs.readFileSync(path.join(projectRoot, '.agents', 'agents', 'docs-auditor.md'), 'utf8');
    const plain = toClaudeAgent(source, '.agents/agents/docs-auditor.md');
    const granted = toClaudeAgent(source, '.agents/agents/docs-auditor.md', undefined, ['mcp__docs__get_page', 'mcp__docs__get_page']);
    assert.match(plain, /^tools: Read, Grep, Glob$/m);
    assert.match(granted, /^tools: Read, Grep, Glob, mcp__docs__get_page$/m);
    assert.equal(toClaudeAgent(source, '.agents/agents/docs-auditor.md', undefined, []), plain);
    assert.equal(grantsForAgent(normalizeMcpPolicy(POLICY), 'docs-auditor').length, 1);
    assert.deepEqual(grantsForAgent(normalizeMcpPolicy(POLICY), 'qa-reviewer'), []);
  });

  test('setup grants MCP tools only when the whole policy validates', () => {
    function project(mcpPolicy) {
      const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-setup-')));
      for (const dir of ['agents', 'skills', 'workflows', 'rules', 'scripts/adapters']) fs.mkdirSync(path.join(root, '.agents', dir), { recursive: true });
      fs.copyFileSync(path.join(projectRoot, '.agents', 'agents', 'docs-auditor.md'), path.join(root, '.agents', 'agents', 'docs-auditor.md'));
      fs.copyFileSync(path.join(projectRoot, '.agents', 'scripts', 'adapters', 'claude-code.settings.example.json'), path.join(root, '.agents', 'scripts', 'adapters', 'claude-code.settings.example.json'));
      fs.writeFileSync(path.join(root, '.agents', 'framework.config.json'), JSON.stringify({ mcpPolicy }), 'utf8');
      return root;
    }
    const good = project(POLICY);
    const bad = project({ ...POLICY, agentGrants: { 'docs-auditor': ['mcp__docs__update_page'] } });
    try {
      setupClaudeCode(good);
      assert.match(fs.readFileSync(path.join(good, '.claude', 'agents', 'docs-auditor.md'), 'utf8'), /^tools: Read, Grep, Glob, mcp__docs__get_page$/m);

      const result = setupClaudeCode(bad);
      assert.match(fs.readFileSync(path.join(bad, '.claude', 'agents', 'docs-auditor.md'), 'utf8'), /^tools: Read, Grep, Glob$/m, 'an invalid grant is not applied');
      assert.ok(result.problems.some((p) => /mcpPolicy has errors/.test(p)));
      assert.equal(result.ok, false);
    } finally {
      for (const root of [good, bad]) {
        for (const link of ['skills', 'commands']) {
          try { fs.rmdirSync(path.join(root, '.claude', link)); } catch { /* not a link on this platform */ }
        }
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });
});
