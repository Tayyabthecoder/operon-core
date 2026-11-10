import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claudeCodeRuleLoading, frontmatterOf, isConditionalRule, ruleTrigger } from './lib/rule-metadata.mjs';

/**
 * Context Cost Report
 *
 * Measures how much instruction text the framework can put into an agent's context, split by
 * when it is loaded in Claude Code (rules are generated into `.claude/rules` by
 * setup-claude-code.mjs; skills are linked through `.claude/skills`):
 *   - rules loaded at session start: no `paths:` key and not declared `trigger: model_decision`;
 *   - rules with `paths:` load only when matching files are touched (conditional);
 *   - `model_decision` rules without `paths:` are not loaded automatically (on-demand via the
 *     link list in AGENTS.md);
 *   - skill descriptions are listed in context, while skill bodies load on invocation.
 *
 * Token figures are an estimate (UTF-8 bytes / 4), not a tokenizer measurement.
 *
 * Usage: node .agents/scripts/context-cost.mjs [--workspace <dir>] [--json]
 */

const BYTES_PER_TOKEN = 4;
const TOP_LIMIT = 10;

export { isConditionalRule, ruleTrigger };

/**
 * @param {string} text
 * @returns {string} The frontmatter `description` value, or an empty string
 */
export function skillDescription(text) {
  const front = frontmatterOf(text);
  const match = front && front.match(/^description:\s*(.*)$/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
}

function bytesOf(text) {
  return Buffer.byteLength(text, 'utf8');
}

function toTokens(bytes) {
  return Math.round(bytes / BYTES_PER_TOKEN);
}

function totals(items) {
  const bytes = items.reduce((sum, item) => sum + item.bytes, 0);
  return { count: items.length, bytes, estimatedTokens: toTokens(bytes) };
}

function largest(items) {
  return [...items]
    .sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name))
    .slice(0, TOP_LIMIT)
    .map(({ name, bytes }) => ({ name, bytes, estimatedTokens: toTokens(bytes) }));
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

/**
 * Measures rules, skills, subagent definitions, and root instruction files under a workspace.
 * @param {string} root Workspace root containing `.agents/`
 * @returns {object}
 */
export function measureContextCost(root) {
  const agentsDir = path.join(root, '.agents');

  const rulesDir = path.join(agentsDir, 'rules');
  const rules = fs.existsSync(rulesDir) ? fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md')) : [];
  const sessionStart = [];
  const conditional = [];
  const onDemand = [];
  for (const file of rules) {
    const text = fs.readFileSync(path.join(rulesDir, file), 'utf8');
    const loading = claudeCodeRuleLoading(text);
    const bucket = loading === 'conditional' ? conditional : loading === 'on-demand' ? onDemand : sessionStart;
    bucket.push({ name: file, bytes: bytesOf(text) });
  }

  const skillsDir = path.join(agentsDir, 'skills');
  const skillDirs = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];
  const descriptions = [];
  const bodies = [];
  for (const dir of skillDirs) {
    const text = readIfExists(path.join(skillsDir, dir, 'SKILL.md'));
    if (text === null) continue;
    descriptions.push({ name: dir, bytes: bytesOf(skillDescription(text)) });
    bodies.push({ name: dir, bytes: bytesOf(text) });
  }

  const agentsPath = path.join(agentsDir, 'agents');
  const agentFiles = fs.existsSync(agentsPath) ? fs.readdirSync(agentsPath).filter((f) => f.endsWith('.md') && f !== 'README.md') : [];
  const subagents = agentFiles.map((file) => ({ name: file, bytes: bytesOf(fs.readFileSync(path.join(agentsPath, file), 'utf8')) }));

  const rootFiles = ['AGENTS.md', 'CLAUDE.md']
    .map((name) => ({ name, text: readIfExists(path.join(root, name)) }))
    .filter((f) => f.text !== null)
    .map((f) => ({ name: f.name, bytes: bytesOf(f.text) }));

  return {
    method: `UTF-8 bytes; estimated tokens = bytes / ${BYTES_PER_TOKEN}`,
    rules: {
      sessionStart: { ...totals(sessionStart), largest: largest(sessionStart) },
      conditional: { ...totals(conditional), largest: largest(conditional) },
      onDemand: { ...totals(onDemand), largest: largest(onDemand) },
    },
    skills: {
      descriptions: { ...totals(descriptions), largest: largest(descriptions) },
      bodies: { ...totals(bodies), largest: largest(bodies) },
    },
    subagentDefinitions: totals(subagents),
    rootInstructionFiles: { ...totals(rootFiles), files: rootFiles },
  };
}

function line(label, t) {
  return `${label}: ${t.count} files, ${t.bytes} bytes, ~${t.estimatedTokens} tokens`;
}

/**
 * @param {object} report Result of measureContextCost
 * @returns {string}
 */
export function formatReport(report) {
  const out = ['Context Cost Report', `Method: ${report.method}`, ''];
  out.push('Loaded at session start (Claude Code):');
  out.push(`  ${line('Rules loaded at session start', report.rules.sessionStart)}`);
  out.push(`  ${line('Skill descriptions', report.skills.descriptions)}`);
  out.push(`  ${line('Root instruction files', report.rootInstructionFiles)}`);
  out.push('', 'Loaded later:');
  out.push(`  ${line('Rules with paths (when matching files are touched)', report.rules.conditional)}`);
  out.push(`  ${line('model_decision rules without paths (read on demand via AGENTS.md)', report.rules.onDemand)}`);
  out.push(`  ${line('Skill bodies (on invocation)', report.skills.bodies)}`);
  out.push(`  ${line('Subagent definitions (on delegation)', report.subagentDefinitions)}`);
  out.push('', 'Largest session-start rules:');
  for (const r of report.rules.sessionStart.largest) out.push(`  ${r.name}: ${r.bytes} bytes (~${r.estimatedTokens} tokens)`);
  out.push('', 'Largest skill descriptions:');
  for (const s of report.skills.descriptions.largest.slice(0, 5)) out.push(`  ${s.name}: ${s.bytes} bytes (~${s.estimatedTokens} tokens)`);
  return out.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const wsIndex = argv.indexOf('--workspace');
  const root = path.resolve(wsIndex >= 0 && argv[wsIndex + 1] ? argv[wsIndex + 1] : process.cwd());
  const report = measureContextCost(root);
  process.stdout.write((argv.includes('--json') ? JSON.stringify(report, null, 2) : formatReport(report)) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
