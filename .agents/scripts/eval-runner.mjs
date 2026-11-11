import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveDefaultArtifactDir } from './lib/artifact-dir.mjs';

/**
 * Eval Runner
 *
 * Runs black-box policy scenarios against the framework as a host would use it: each scenario
 * becomes a Claude Code PreToolUse payload, goes through the real adapter in a temporary
 * workspace that carries this repository's framework.config.json, and the resulting decision
 * (allow, ask, deny), reason, and on-demand rule reminder are compared with what the scenario
 * expects. No model is called, so a run is deterministic and free. Scenarios that need a live
 * agent (for example "fix a failing test without touching unrelated files") are not covered here.
 *
 * Usage:
 *   node .agents/scripts/eval-runner.mjs [--file <scenarios.json>] [--filter <text>] [--json] [--no-history]
 *
 * Exit code 1 when any scenario fails. Pass rates are appended to eval-history.jsonl in the
 * session artifact directory (OS temp folder) unless --no-history is given.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const adapterScript = path.join(here, 'adapters', 'claude-code.mjs');
const defaultScenarioFile = path.join(repoRoot, '.agents', 'evals', 'policy-scenarios.json');

/** An absolute directory that exists on this platform and is never inside the fixture workspace. */
export const OUTSIDE_DIR = process.platform === 'win32' ? 'C:\\Windows\\System32' : '/usr/bin';

/**
 * @param {string} filePath
 * @returns {{ fixture: object, scenarios: object[] }}
 */
export function loadScenarioFile(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^﻿/, ''));
  if (!data || !Array.isArray(data.scenarios)) throw new Error(`${filePath} has no "scenarios" array`);
  const ids = new Set();
  for (const scenario of data.scenarios) {
    for (const key of ['id', 'category', 'tool', 'input', 'expect']) {
      if (scenario[key] === undefined) throw new Error(`Scenario ${scenario.id ?? '(no id)'} is missing "${key}"`);
    }
    if (!['allow', 'ask', 'deny'].includes(scenario.expect.decision)) {
      throw new Error(`Scenario ${scenario.id} expects an unknown decision "${scenario.expect.decision}"`);
    }
    if (ids.has(scenario.id)) throw new Error(`Duplicate scenario id "${scenario.id}"`);
    ids.add(scenario.id);
  }
  return { fixture: data.fixture || {}, scenarios: data.scenarios };
}

/**
 * Replaces the {ws} and {outside} placeholders in every string of a value.
 * @param {unknown} value
 * @param {{ ws: string, outside: string }} vars
 * @returns {unknown}
 */
export function substitute(value, vars) {
  if (typeof value === 'string') return value.split('{ws}').join(vars.ws).split('{outside}').join(vars.outside);
  if (Array.isArray(value)) return value.map((item) => substitute(item, vars));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substitute(item, vars)]));
  }
  return value;
}

/**
 * Creates the temporary fixture workspace.
 * @param {{ files?: Record<string, string>, copyFromRepo?: string[] }} fixture
 * @returns {string} Canonical workspace path
 */
export function createFixtureWorkspace(fixture) {
  // `fixture.configOverrides` replaces top-level keys of the copied framework.config.json, so a
  // scenario suite can run against a test policy (for example `mcpPolicy`) without touching the repo's.
  const ws = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'eval-ws-')));
  for (const [relative, content] of Object.entries(fixture.files || {})) {
    const target = path.join(ws, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
  }
  for (const relative of fixture.copyFromRepo || []) {
    const target = path.join(ws, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, relative), target);
  }
  if (fixture.configOverrides) {
    const configPath = path.join(ws, '.agents', 'framework.config.json');
    const base = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^﻿/, '')) : {};
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ ...base, ...fixture.configOverrides }, null, 2), 'utf8');
  }
  return ws;
}

/**
 * Sends one PreToolUse payload through the real adapter.
 * @param {{ tool: string, input: object }} scenario Scenario with placeholders already substituted
 * @param {string} ws
 * @returns {{ decision: 'allow'|'ask'|'deny', reason: string, context: string }}
 */
export function runThroughAdapter(scenario, ws) {
  const res = spawnSync(process.execPath, [adapterScript, 'pre-tool-use'], {
    input: JSON.stringify({ tool_name: scenario.tool, tool_input: scenario.input, cwd: ws }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: ws },
  });
  if (res.status !== 0) throw new Error(`Adapter exited with ${res.status}: ${res.stderr}`);
  const text = res.stdout.trim();
  const output = text ? JSON.parse(text).hookSpecificOutput || {} : {};
  const decision = output.permissionDecision === 'ask' ? 'ask' : output.permissionDecision === 'deny' ? 'deny' : 'allow';
  return { decision, reason: output.permissionDecisionReason || '', context: output.additionalContext || '' };
}

/**
 * Compares an observed result with a scenario's expectation.
 * @param {{ decision: string, reason: string, context: string }} observed
 * @param {{ decision: string, reasonIncludes?: string, contextIncludes?: string, noContext?: boolean }} expect
 * @returns {string[]} Failure messages (empty when the scenario passes)
 */
export function checkExpectation(observed, expect) {
  const failures = [];
  if (observed.decision !== expect.decision) failures.push(`expected decision ${expect.decision}, got ${observed.decision}`);
  if (expect.reasonIncludes && !observed.reason.toLowerCase().includes(expect.reasonIncludes.toLowerCase())) {
    failures.push(`reason does not mention "${expect.reasonIncludes}" (reason: ${observed.reason || 'none'})`);
  }
  if (expect.contextIncludes && !observed.context.includes(expect.contextIncludes)) {
    failures.push(`reminder does not mention "${expect.contextIncludes}" (context: ${observed.context || 'none'})`);
  }
  if (expect.noContext && observed.context) failures.push(`expected no reminder, got: ${observed.context}`);
  return failures;
}

/**
 * Runs every applicable scenario.
 * @param {{ fixture: object, scenarios: object[] }} suite
 * @param {{ filter?: string, platform?: string }} [options]
 * @returns {{ results: object[], summary: object }}
 */
export function runSuite(suite, options = {}) {
  const platform = options.platform || process.platform;
  const ws = createFixtureWorkspace(suite.fixture);
  const results = [];
  try {
    for (const scenario of suite.scenarios) {
      if (options.filter && !scenario.id.includes(options.filter) && !scenario.category.includes(options.filter)) continue;
      if (Array.isArray(scenario.platforms) && !scenario.platforms.includes(platform)) {
        results.push({ id: scenario.id, category: scenario.category, status: 'skipped', failures: [`only runs on ${scenario.platforms.join(', ')}`] });
        continue;
      }
      const concrete = substitute(scenario, { ws, outside: OUTSIDE_DIR });
      let failures;
      try {
        failures = checkExpectation(runThroughAdapter(concrete, ws), scenario.expect);
      } catch (err) {
        failures = [`runner error: ${err.message}`];
      }
      results.push({ id: scenario.id, category: scenario.category, description: scenario.description, status: failures.length ? 'failed' : 'passed', failures });
    }
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
    try {
      fs.rmSync(resolveDefaultArtifactDir(ws), { recursive: true, force: true });
    } catch {
      // The adapter's audit log directory is disposable; ignore cleanup errors.
    }
  }
  return { results, summary: summarize(results) };
}

/**
 * @param {{ status: string, category: string }[]} results
 * @returns {{ total: number, passed: number, failed: number, skipped: number, passRate: number, byCategory: object }}
 */
export function summarize(results) {
  const counts = { total: 0, passed: 0, failed: 0, skipped: 0 };
  const byCategory = {};
  for (const result of results) {
    byCategory[result.category] = byCategory[result.category] || { passed: 0, failed: 0, skipped: 0 };
    byCategory[result.category][result.status]++;
    counts[result.status]++;
    if (result.status !== 'skipped') counts.total++;
  }
  const passRate = counts.total ? Math.round((counts.passed / counts.total) * 1000) / 10 : 0;
  return { ...counts, passRate, byCategory };
}

/**
 * @param {{ results: object[], summary: object }} run
 * @returns {string}
 */
export function formatRun({ results, summary }) {
  const lines = ['Eval Run: policy scenarios'];
  for (const result of results) {
    const mark = result.status === 'passed' ? 'PASS' : result.status === 'skipped' ? 'SKIP' : 'FAIL';
    lines.push(`  [${mark}] ${result.category}/${result.id}`);
    if (result.status !== 'passed') for (const failure of result.failures) lines.push(`         ${failure}`);
  }
  lines.push('', `Pass rate: ${summary.passRate}% (${summary.passed} of ${summary.total} run, ${summary.skipped} skipped, ${summary.failed} failed)`);
  for (const [category, counts] of Object.entries(summary.byCategory)) {
    lines.push(`  ${category}: ${counts.passed} passed, ${counts.failed} failed, ${counts.skipped} skipped`);
  }
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const option = (name) => (args.includes(name) && args[args.indexOf(name) + 1]) || null;
  const suite = loadScenarioFile(path.resolve(option('--file') || defaultScenarioFile));
  const run = runSuite(suite, { filter: option('--filter') || undefined });

  if (!args.includes('--no-history')) {
    try {
      const dir = resolveDefaultArtifactDir(repoRoot);
      fs.mkdirSync(dir, { recursive: true });
      const entry = { timestamp: new Date().toISOString(), platform: process.platform, ...run.summary };
      fs.appendFileSync(path.join(dir, 'eval-history.jsonl'), JSON.stringify(entry) + '\n', 'utf8');
    } catch {
      // History is best effort and never changes the result.
    }
  }

  process.stdout.write((args.includes('--json') ? JSON.stringify(run, null, 2) : formatRun(run)) + '\n');
  process.exit(run.summary.failed > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
