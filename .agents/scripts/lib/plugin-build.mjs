import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_MODEL_MAP, toClaudeAgent } from '../adapters/setup-claude-code.mjs';

/**
 * Builds the Claude Code plugin `operon-safety` from the framework sources.
 *
 * A plugin is copied into a cache when installed and cannot reach files outside its own folder,
 * so everything it needs is generated into `.agents/plugins/operon-safety/`. The output is
 * committed (a marketplace entry points at it) and `build-plugin.mjs --check` fails when it no
 * longer matches the sources.
 *
 * Not shipped, on purpose:
 * - Rules: plugins have no rules folder and do not load a CLAUDE.md. The always-on guardrails are the hooks.
 * - Workflows: they call scripts such as eval-runner.mjs that are not part of the plugin.
 * - The Stop gate: it needs verify-runner.mjs and the exact allowlisted `node .agents/scripts/...`
 *   commands, which a project without `.agents/` does not have.
 */

export const PLUGIN_NAME = 'operon-safety';
export const PLUGIN_DIR = `.agents/plugins/${PLUGIN_NAME}`;
export const MARKETPLACE_NAME = 'operon';

/** Skills shipped in the plugin: general review, debugging, security, and git practice. */
export const CORE_SKILLS = Object.freeze([
  'code-review', 'debugging', 'security-review', 'threat-modeling', 'git-workflow', 'testing-qa', 'refactoring',
]);

const SCRIPT_FILES = [
  'adapters/claude-code.mjs',
  'hooks/pre-file-safety.mjs',
  'hooks/pre-tool-safety.mjs',
  'hooks/post-tool-safety.mjs',
  'hooks/session-start.mjs',
  'hooks/stop-gate.mjs',
  'lib/artifact-dir.mjs',
  'lib/decision-log.mjs',
  'lib/glob-match.mjs',
  'lib/hook-common.mjs',
  'lib/mcp-policy.mjs',
  'lib/rule-reminders.mjs',
  'lib/workspace-fingerprint.mjs',
];

const GOVERNED_TOOLS = 'Bash|PowerShell|Write|Edit|MultiEdit|NotebookEdit|Read|Grep|Glob|LS|mcp__.*';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
}

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const toPosix = (p) => p.split(path.sep).join('/');

/**
 * Removes skill bindings the plugin does not ship, so a plugin agent never names a missing skill.
 * @param {string} agentMarkdown Output of toClaudeAgent
 * @param {string[]} shipped
 * @returns {string}
 */
export function keepShippedSkills(agentMarkdown, shipped) {
  return agentMarkdown.replace(/^skills:\r?\n((?:  - .+\r?\n?)+)/m, (_whole, block) => {
    const kept = [...block.matchAll(/^  - (.+?)\s*$/gm)].map((m) => m[1]).filter((name) => shipped.includes(name));
    return kept.length ? `skills:\n${kept.map((s) => `  - ${s}`).join('\n')}\n` : '';
  });
}

/**
 * @param {string} root Repository root
 * @returns {Map<string, Buffer|string>} Files keyed by repository-relative POSIX path
 */
export function buildPlugin(root) {
  const agentsDir = path.join(root, '.agents');
  const config = readJson(path.join(agentsDir, 'framework.config.json'));
  const files = new Map();
  const put = (rel, content) => files.set(`${PLUGIN_DIR}/${rel}`, content);

  put('.claude-plugin/plugin.json', `${JSON.stringify({
    name: PLUGIN_NAME,
    version: config.version,
    description: 'Safety hooks for Claude Code (command, file, and MCP guardrails, audit log, decision log at session start), plus core review skills and read-only subagents.',
    author: { name: 'Muhammad Tayyab' },
    repository: 'https://github.com/Tayyabthecoder/operon-core',
    license: 'MIT',
    keywords: ['safety', 'hooks', 'guardrails', 'review', 'subagents'],
  }, null, 2)}\n`);

  const command = (event) => `node "\${CLAUDE_PLUGIN_ROOT}/scripts/adapters/claude-code.mjs" ${event}`;
  put('hooks/hooks.json', `${JSON.stringify({
    hooks: {
      SessionStart: [{ hooks: [{ type: 'command', command: command('session-start'), timeout: 30 }] }],
      PreToolUse: [{ matcher: GOVERNED_TOOLS, hooks: [{ type: 'command', command: command('pre-tool-use'), timeout: 15 }] }],
      PostToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: command('post-tool-use'), timeout: 15 }] }],
    },
  }, null, 2)}\n`);

  for (const rel of SCRIPT_FILES) put(`scripts/${rel}`, fs.readFileSync(path.join(agentsDir, 'scripts', rel)));

  for (const skill of CORE_SKILLS) {
    const skillDir = path.join(agentsDir, 'skills', skill);
    if (!fs.existsSync(path.join(skillDir, 'SKILL.md'))) throw new Error(`core skill is missing: ${skill}`);
    for (const file of listFiles(skillDir)) put(`skills/${skill}/${toPosix(path.relative(skillDir, file))}`, fs.readFileSync(file));
  }

  const modelMap = { ...DEFAULT_MODEL_MAP, ...(config.claudeCode?.modelMap || {}) };
  for (const agent of config.subagents || []) {
    const rel = `.agents/agents/${agent}`;
    const generated = toClaudeAgent(fs.readFileSync(path.join(root, rel), 'utf8'), rel, modelMap);
    put(`agents/${agent}`, keepShippedSkills(generated, CORE_SKILLS));
  }

  put('README.md', [
    `# ${PLUGIN_NAME}`,
    '',
    'Generated by `.agents/scripts/build-plugin.mjs` from the framework in this repository. Edit the sources, not this folder.',
    '',
    '## What it adds',
    '',
    '- **Hooks** (`hooks/hooks.json`): `SessionStart` (workspace baseline, decision log), `PreToolUse` (shell commands, file reads and writes, MCP calls: allow, ask, or deny; chaining, destructive deletes, forced git operations, and paths outside the project are blocked), `PostToolUse` (audit log).',
    `- **Skills** (${CORE_SKILLS.length}): ${CORE_SKILLS.map((s) => `\`${s}\``).join(', ')}.`,
    '- **Subagents** (9): `architect-planner`, `code-implementer`, `diagnostic-debugger`, `qa-reviewer`, `security-auditor`, `accessibility-auditor`, `docs-auditor`, `dependency-auditor`, `release-manager`. Eight are read-only.',
    '',
    '## What it does not include',
    '',
    '- **Rules and the Stop gate.** A plugin cannot ship rules, and the Stop gate depends on `.agents/scripts/verify-runner.mjs` inside the project. Use `node bin/operon.mjs init` from the framework repository to install the full framework instead.',
    '- **Workflows.** They call framework scripts that are not part of this plugin.',
    '',
    '## Project configuration',
    '',
    'The hooks read `.agents/framework.config.json` in the project when it exists (command allowlist, MCP policy, rule reminders, decision log) and use safe defaults when it does not. Skill and subagent text may mention files from the full framework, such as `.agents/templates/`, that exist only after `operon init`.',
    '',
  ].join('\n'));

  files.set('.claude-plugin/marketplace.json', `${JSON.stringify({
    name: MARKETPLACE_NAME,
    description: 'Claude Code plugins from the operon-core agent framework.',
    owner: { name: 'Muhammad Tayyab' },
    plugins: [{
      name: PLUGIN_NAME,
      source: `./${PLUGIN_DIR}`,
      description: 'Safety hooks, core review skills, and read-only subagents for Claude Code.',
    }],
  }, null, 2)}\n`);

  return files;
}

const normalizeText = (buffer) => Buffer.from(buffer).toString('utf8').replace(/\r\n/g, '\n');
const isText = (rel) => /\.(md|json|mjs)$/.test(rel);

/**
 * Compares the built files with the committed ones. Text is compared with line endings
 * normalized, because a Windows checkout may convert them.
 * @param {string} root
 * @returns {{ missing: string[], changed: string[], extra: string[] }}
 */
export function checkPlugin(root) {
  const built = buildPlugin(root);
  const missing = [];
  const changed = [];
  for (const [rel, content] of built) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      missing.push(rel);
      continue;
    }
    const actual = fs.readFileSync(full);
    const same = isText(rel) ? normalizeText(actual) === normalizeText(content) : Buffer.compare(actual, Buffer.from(content)) === 0;
    if (!same) changed.push(rel);
  }
  const extra = [];
  const pluginRoot = path.join(root, PLUGIN_DIR);
  if (fs.existsSync(pluginRoot)) {
    for (const file of listFiles(pluginRoot)) {
      const rel = toPosix(path.relative(root, file));
      if (!built.has(rel)) extra.push(rel);
    }
  }
  return { missing, changed, extra };
}

/**
 * Writes the built files. Files in the plugin folder that are no longer produced are removed.
 * @param {string} root
 * @returns {{ written: number, removed: string[] }}
 */
export function writePlugin(root) {
  const built = buildPlugin(root);
  const { extra } = checkPlugin(root);
  for (const rel of extra) fs.rmSync(path.join(root, rel));
  for (const [rel, content] of built) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return { written: built.size, removed: extra };
}
