import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OUTSIDE_DIR,
  checkExpectation,
  formatRun,
  loadScenarioFile,
  runSuite,
  substitute,
  summarize,
} from '../eval-runner.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const scenarioFile = path.join(projectRoot, '.agents', 'evals', 'policy-scenarios.json');

function writeTempScenarioFile(data) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-test-'));
  const file = path.join(dir, 'scenarios.json');
  fs.writeFileSync(file, JSON.stringify(data), 'utf8');
  return { dir, file };
}

describe('Eval runner (R2-6)', () => {
  test('checkExpectation reports each way a result can differ from the expectation', () => {
    const observed = { decision: 'ask', reason: '[agent-framework] Command profile not in pre-approved allowlist', context: '' };
    assert.deepEqual(checkExpectation(observed, { decision: 'ask', reasonIncludes: 'ALLOWLIST', noContext: true }), []);
    assert.equal(checkExpectation(observed, { decision: 'deny' }).length, 1);
    assert.equal(checkExpectation(observed, { decision: 'ask', reasonIncludes: 'git clean' }).length, 1);
    assert.equal(checkExpectation(observed, { decision: 'ask', contextIncludes: 'git-workflow.md' }).length, 1);
    assert.equal(checkExpectation({ ...observed, context: 'remember this' }, { decision: 'ask', noContext: true }).length, 1);
    assert.equal(checkExpectation(observed, { decision: 'deny', reasonIncludes: 'x' }).length, 2);
  });

  test('substitute replaces placeholders in nested values and leaves other text alone', () => {
    const out = substitute({ a: '{ws}/src', b: ['{outside}/x', 3, null], c: { d: 'plain' } }, { ws: '/w', outside: '/o' });
    assert.deepEqual(out, { a: '/w/src', b: ['/o/x', 3, null], c: { d: 'plain' } });
  });

  test('summarize counts statuses per category and ignores skipped scenarios in the pass rate', () => {
    const summary = summarize([
      { category: 'a', status: 'passed' },
      { category: 'a', status: 'failed' },
      { category: 'b', status: 'passed' },
      { category: 'b', status: 'skipped' },
    ]);
    assert.equal(summary.total, 3);
    assert.equal(summary.passed, 2);
    assert.equal(summary.failed, 1);
    assert.equal(summary.skipped, 1);
    assert.equal(summary.passRate, 66.7);
    assert.deepEqual(summary.byCategory.b, { passed: 1, failed: 0, skipped: 1 });
    assert.equal(summarize([]).passRate, 0);
  });

  test('loadScenarioFile rejects missing fields, unknown decisions, and duplicate ids', () => {
    const base = { id: 'x', category: 'c', tool: 'Bash', input: { command: 'git status' }, expect: { decision: 'allow' } };
    const cases = [
      [{ scenarios: [{ ...base, expect: undefined }] }, /missing "expect"/],
      [{ scenarios: [{ ...base, expect: { decision: 'maybe' } }] }, /unknown decision/],
      [{ scenarios: [base, base] }, /Duplicate scenario id/],
      [{ nothing: true }, /no "scenarios" array/],
    ];
    for (const [data, pattern] of cases) {
      const { dir, file } = writeTempScenarioFile(data);
      try {
        assert.throws(() => loadScenarioFile(file), pattern);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  test('a wrong expectation fails the scenario and a platform mismatch is skipped, not failed', () => {
    const suite = {
      fixture: { files: { 'src/app.js': 'v1' }, copyFromRepo: ['.agents/framework.config.json'] },
      scenarios: [
        { id: 'right', category: 't', tool: 'Bash', input: { command: 'git reset --hard' }, expect: { decision: 'deny' } },
        { id: 'wrong', category: 't', tool: 'Bash', input: { command: 'git reset --hard' }, expect: { decision: 'allow' } },
        { id: 'elsewhere', category: 't', platforms: ['plan9'], tool: 'Bash', input: { command: 'git status' }, expect: { decision: 'deny' } },
      ],
    };
    const { results, summary } = runSuite(suite);
    assert.deepEqual(results.map((r) => [r.id, r.status]), [['right', 'passed'], ['wrong', 'failed'], ['elsewhere', 'skipped']]);
    assert.match(results[1].failures[0], /expected decision allow, got deny/);
    assert.equal(summary.failed, 1);
    assert.match(formatRun({ results, summary }), /\[FAIL\] t\/wrong/);
    assert.equal(runSuite(suite, { filter: 'right' }).results.length, 1);
  });

  test('every policy scenario in the repository passes through the real adapter', () => {
    const suite = loadScenarioFile(scenarioFile);
    assert.ok(suite.scenarios.length >= 30, 'the suite keeps a meaningful number of scenarios');
    const categories = new Set(suite.scenarios.map((s) => s.category));
    for (const category of ['destructive-git', 'shell-safety', 'allowlist', 'file-boundary', 'control-plane', 'reminders']) {
      assert.ok(categories.has(category), `category ${category} is covered`);
    }
    const { results, summary } = runSuite(suite);
    const failed = results.filter((r) => r.status === 'failed').map((r) => `${r.id}: ${r.failures.join('; ')}`);
    assert.deepEqual(failed, []);
    assert.equal(summary.passRate, 100);
  });

  test('the outside directory used by scenarios exists and is not inside the temp workspace', () => {
    assert.ok(fs.existsSync(OUTSIDE_DIR));
    assert.ok(!OUTSIDE_DIR.startsWith(os.tmpdir()));
  });
});
