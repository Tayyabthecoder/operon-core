import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const workflowsDir = path.join(root, '.agents', 'workflows');
const config = JSON.parse(fs.readFileSync(path.join(root, '.agents', 'framework.config.json'), 'utf8'));

const ORIGINAL = ['incident.md', 'release.md', 'migrate.md', 'onboard-repo.md', 'triage-bug.md', 'retro.md'];

function read(file) {
  return fs.readFileSync(path.join(workflowsDir, file), 'utf8');
}

function frontmatter(text) {
  return (text.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
}

describe('Workflows (R2-4)', () => {
  test('the six original workflows are registered and the count matches the config', () => {
    for (const file of ORIGINAL) assert.ok(config.workflows.includes(file), `${file} is in framework.config.json`);
    assert.equal(config.expectedCounts.workflows, config.workflows.length);
    assert.equal(config.workflows.length, 15);
  });

  test('each original workflow declares a description and argument hint, and an explicit-instruction gate', () => {
    for (const file of ORIGINAL) {
      const text = read(file);
      const front = frontmatter(text);
      assert.match(front, /^description:\s*\S/m, `${file} description`);
      assert.match(front, /^argument-hint:\s*\S/m, `${file} argument-hint`);
      assert.match(text, /^> \*\*Framework gate\*\*:/m, `${file} has a Framework gate note`);
      assert.match(text, /explicit/i, `${file} names the explicit-instruction requirement`);
    }
  });

  test('the original workflows never instruct unattended outward or destructive actions', () => {
    for (const file of ORIGINAL) {
      const text = read(file);
      assert.ok(!/--force(?!-with-lease)/.test(text.replace(/never force-push|Never force-push/gi, '')), `${file} mentions a force flag`);
      assert.ok(!/(^|[^\w])\.claude\/(plans|prds|reviews|docs)\//.test(text), `${file} writes a Claude-only artifact path`);
      assert.ok(!/\bDROP\s+(TABLE|DATABASE)\b/i.test(text), `${file} contains a DROP statement`);
    }
    // The release workflow prints tag and push commands for the user; it must say they are not run automatically.
    assert.match(read('release.md'), /without running them/i);
  });

  test('scripts and subagents named in any workflow exist', () => {
    const agentNames = new Set(fs.readdirSync(path.join(root, '.agents', 'agents')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.replace(/\.md$/, '')));
    for (const file of config.workflows) {
      const text = read(file);
      for (const script of text.match(/\.agents\/scripts\/[\w./-]+\.mjs/g) || []) {
        assert.ok(fs.existsSync(path.join(root, script)), `${file} references missing script ${script}`);
      }
      for (const agent of text.match(/`([a-z]+(?:-[a-z]+)+)`/g) || []) {
        const name = agent.slice(1, -1);
        if (/-(auditor|reviewer|planner|implementer|debugger|manager)$/.test(name)) {
          assert.ok(agentNames.has(name), `${file} references unknown subagent ${name}`);
        }
      }
    }
  });

  test('skills named in the original workflows exist', () => {
    const skills = new Set(fs.readdirSync(path.join(root, '.agents', 'skills')));
    for (const file of ORIGINAL) {
      for (const match of read(file).matchAll(/Use the `([\w-]+)` skill|`([\w-]+)` and `([\w-]+)` skills/g)) {
        for (const name of match.slice(1).filter(Boolean)) assert.ok(skills.has(name), `${file} references unknown skill ${name}`);
      }
    }
  });

  test('the release workflow involves release-manager and the three other reviewers', () => {
    const text = read('release.md');
    for (const agent of ['release-manager', 'qa-reviewer', 'security-auditor', 'dependency-auditor', 'docs-auditor']) {
      assert.ok(text.includes(`\`${agent}\``), `release.md mentions ${agent}`);
    }
  });
});
