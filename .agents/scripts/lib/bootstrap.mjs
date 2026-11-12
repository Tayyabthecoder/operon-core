import fs from 'node:fs';
import path from 'node:path';
import { HEADER } from './decision-log.mjs';

/**
 * Project bootstrap: installs this framework's `.agents/` directory into another repository.
 *
 * It never overwrites: if the target already has `.agents/`, initialization is refused. Language
 * rules are chosen by the detected (or given) stack; the 15 core rules, all skills, agents,
 * workflows, templates, and the safety scripts are always installed. The framework's own test
 * suite, its decision log entries, and scratch files are not copied.
 */

const LANGUAGE_SUFFIXES = new Set([
  'coding-style', 'hooks', 'patterns', 'security', 'testing', 'fastapi',
  'accessibility', 'performance', 'production-readiness', 'design-quality',
]);

export const STACKS = Object.freeze([
  'typescript', 'react', 'react-native', 'vue', 'nuxt', 'angular', 'web', 'python', 'golang', 'rust',
  'java', 'kotlin', 'csharp', 'fsharp', 'ruby', 'php', 'dart', 'swift', 'cpp', 'perl', 'arkts',
]);

/** Directories and files under `.agents/` that are copied as they are. */
const COPY_ENTRIES = ['agents', 'evals', 'hooks.json', 'skills', 'templates', 'workflows'];

/** Scripts that only make sense in the framework repository itself (the CLI, the plugin builder). */
const REPOSITORY_ONLY_SCRIPTS = new Set(['build-plugin.mjs', 'lib/bootstrap.mjs', 'lib/plugin-build.mjs']);

/**
 * @param {string} fileName A rule file name such as `python-testing.md`
 * @returns {string|null} The stack a rule belongs to, or null for a core rule
 */
export function ruleStack(fileName) {
  const base = fileName.replace(/\.md$/, '');
  // Longest stack name first so react-native-hooks is not read as react + native-hooks.
  for (const stack of [...STACKS].sort((a, b) => b.length - a.length)) {
    if (base.startsWith(`${stack}-`) && LANGUAGE_SUFFIXES.has(base.slice(stack.length + 1))) return stack;
  }
  return null;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch {
    return null;
  }
}

/**
 * Detects stacks from marker files in the target directory (top level only, no network, no commands).
 * @param {string} targetDir
 * @returns {string[]} Sorted stack names
 */
export function detectStacks(targetDir) {
  const found = new Set();
  const has = (name) => fs.existsSync(path.join(targetDir, name));
  const entries = fs.existsSync(targetDir) ? fs.readdirSync(targetDir) : [];
  const anyEnding = (...suffixes) => entries.some((entry) => suffixes.some((s) => entry.endsWith(s)));

  const pkg = readJson(path.join(targetDir, 'package.json'));
  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const dep = (name) => Object.prototype.hasOwnProperty.call(deps, name);
    if (has('tsconfig.json') || dep('typescript')) found.add('typescript');
    if (dep('react') || dep('react-dom')) found.add('react');
    if (dep('react-native')) found.add('react-native');
    if (dep('vue')) found.add('vue');
    if (dep('nuxt')) found.add('nuxt');
    if (dep('@angular/core')) found.add('angular');
    if (dep('react') || dep('vue') || dep('nuxt') || dep('@angular/core') || has('index.html')) found.add('web');
  }
  if (has('pyproject.toml') || has('requirements.txt') || has('setup.py') || has('Pipfile')) {
    found.add('python');
  }
  if (has('go.mod')) found.add('golang');
  if (has('Cargo.toml')) found.add('rust');
  if (has('pom.xml') || has('build.gradle') || has('build.gradle.kts') || has('settings.gradle') || has('settings.gradle.kts')) {
    const gradleKts = has('build.gradle.kts') || has('settings.gradle.kts');
    found.add(gradleKts ? 'kotlin' : 'java');
  }
  if (anyEnding('.csproj', '.sln')) found.add('csharp');
  if (anyEnding('.fsproj')) found.add('fsharp');
  if (has('Gemfile')) found.add('ruby');
  if (has('composer.json')) found.add('php');
  if (has('pubspec.yaml')) found.add('dart');
  if (has('Package.swift')) found.add('swift');
  if (has('CMakeLists.txt')) found.add('cpp');
  if (has('cpanfile') || has('Makefile.PL')) found.add('perl');
  return [...found].sort();
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

const FRAMEWORK_ONLY_DOC = /framework-improvement-tracker\.md|context-cost-audit\.md/;

const MINIMAL_AGENTS_MD = `# Agent Guidelines

This repository uses the agent framework in \`.agents/\`.

## Mandatory Core Safety Rules

@[Core Development Workflow](.agents/rules/core-workflow.md)
@[Change Safety and Risk Prevention](.agents/rules/change-safety.md)

## On-Demand Rules

Read the relevant rule in \`.agents/rules/\` before starting that kind of work: \`architecture.md\`, \`coding-standards.md\`, \`git-workflow.md\`, \`performance-optimization.md\`.
`;

/**
 * Builds the install plan without touching the target.
 * @param {{ sourceRoot: string, targetDir: string, stacks?: string[]|'auto' }} options
 * @returns {{ ok: boolean, error?: string, stacks: string[], rules: string[], skippedRules: number, files: { from: string, to: string }[], writes: { to: string, content: string }[], notes: string[] }}
 */
export function planInit({ sourceRoot, targetDir, stacks = 'auto' }) {
  const fail = (error) => ({ ok: false, error, stacks: [], rules: [], skippedRules: 0, files: [], writes: [], notes: [] });
  const source = path.resolve(sourceRoot);
  const target = path.resolve(targetDir);
  if (source === target) return fail('the target is the framework source itself');
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) return fail(`target directory does not exist: ${target}`);
  if (fs.existsSync(path.join(target, '.agents'))) return fail('the target already has .agents/; init never overwrites an existing framework install');

  const sourceAgents = path.join(source, '.agents');
  const config = readJson(path.join(sourceAgents, 'framework.config.json'));
  if (!config || !Array.isArray(config.rules)) return fail('the source has no readable .agents/framework.config.json');

  const requested = stacks === 'auto' ? detectStacks(target) : stacks;
  const unknown = requested.filter((s) => !STACKS.includes(s));
  if (unknown.length) return fail(`unknown stack(s): ${unknown.join(', ')} (known: ${STACKS.join(', ')})`);

  const rules = config.rules.filter((file) => {
    const stack = ruleStack(file);
    return stack === null || requested.includes(stack);
  });
  const skippedRules = config.rules.length - rules.length;

  const files = [];
  const rulesDir = path.join(sourceAgents, 'rules');
  for (const rule of rules) {
    if (!fs.existsSync(path.join(rulesDir, rule))) return fail(`rule listed in the source config is missing: ${rule}`);
    files.push({ from: path.join(rulesDir, rule), to: path.join(target, '.agents', 'rules', rule) });
  }
  for (const entry of COPY_ENTRIES) {
    const from = path.join(sourceAgents, entry);
    if (!fs.existsSync(from)) continue;
    const list = fs.statSync(from).isDirectory() ? listFiles(from) : [from];
    for (const file of list) files.push({ from: file, to: path.join(target, '.agents', path.relative(sourceAgents, file)) });
  }
  const scriptsDir = path.join(sourceAgents, 'scripts');
  for (const file of listFiles(scriptsDir)) {
    const relative = path.relative(scriptsDir, file);
    if (relative.split(path.sep)[0] === 'tests' || REPOSITORY_ONLY_SCRIPTS.has(relative.split(path.sep).join('/'))) continue;
    files.push({ from: file, to: path.join(target, '.agents', 'scripts', relative) });
  }

  // `version` is the framework's own release number (the validator compares it with this repo's
  // README badge), so it is recorded in .operon.json instead of the target's config.
  const { version: frameworkVersion, ...configWithoutVersion } = config;
  // `hosts` lists the generated Cursor/Gemini/Codex files kept in sync here; a new install has
  // none until the owner runs setup-hosts.mjs and opts in.
  const targetConfig = { ...configWithoutVersion, hosts: [], rules, expectedCounts: { ...config.expectedCounts, rules: rules.length } };
  const writes = [
    { to: path.join(target, '.agents', 'framework.config.json'), content: `${JSON.stringify(targetConfig, null, 2)}\n` },
    { to: path.join(target, '.agents', 'memory', 'decision-log.md'), content: HEADER },
    { to: path.join(target, '.agents', '.operon.json'), content: `${JSON.stringify({ frameworkVersion, stacks: requested }, null, 2)}\n` },
  ];
  const notes = [];

  // The validator and several skills expect the docs/ guides and the ECC attribution notice.
  // Existing files in the target are never replaced.
  const docs = Array.isArray(config.docs) ? config.docs : [];
  let docsAdded = 0;
  for (const doc of docs) {
    const from = path.join(source, doc);
    const to = path.join(target, doc);
    if (!fs.existsSync(from) || fs.existsSync(to)) continue;
    docsAdded += 1;
    const original = fs.readFileSync(from, 'utf8');
    if (FRAMEWORK_ONLY_DOC.test(original)) {
      // Some guides link to documents about this framework itself, which are not installed.
      const text = original
        .split('\n')
        .filter((line) => !(/^- \[/.test(line) && FRAMEWORK_ONLY_DOC.test(line)))
        .map((line) => line.replace(/, and the \[Framework Improvement Tracker\]\([^)]*\)/, ''))
        .join('\n');
      writes.push({ to, content: text });
    } else {
      files.push({ from, to });
    }
  }
  if (docsAdded && !fs.existsSync(path.join(target, 'docs', 'architecture', 'architecture-decisions'))) {
    writes.push({ to: path.join(target, 'docs', 'architecture', 'architecture-decisions', '.gitkeep'), content: '' });
  }
  if (!fs.existsSync(path.join(target, 'THIRD_PARTY_NOTICES.md'))) {
    files.push({ from: path.join(source, 'THIRD_PARTY_NOTICES.md'), to: path.join(target, 'THIRD_PARTY_NOTICES.md') });
  } else {
    notes.push('THIRD_PARTY_NOTICES.md already exists and was left unchanged; copy the ECC attribution from the framework\'s notice into it (the validator checks for it).');
  }
  if (!fs.existsSync(path.join(target, 'AGENTS.md'))) writes.push({ to: path.join(target, 'AGENTS.md'), content: MINIMAL_AGENTS_MD });
  else notes.push('AGENTS.md already exists and was left unchanged; add the two core rule links from the framework README if they are missing.');
  if (!fs.existsSync(path.join(target, 'CLAUDE.md'))) writes.push({ to: path.join(target, 'CLAUDE.md'), content: '@AGENTS.md\n' });
  else notes.push('CLAUDE.md already exists and was left unchanged.');

  return { ok: true, stacks: requested, rules, skippedRules, files, writes, notes };
}

/**
 * Applies a plan. Files are copied byte for byte; nothing in the target is overwritten.
 * @param {ReturnType<typeof planInit>} plan
 * @returns {{ copied: number, written: number }}
 */
export function applyInit(plan) {
  if (!plan.ok) throw new Error(plan.error);
  for (const { to } of [...plan.files, ...plan.writes]) {
    if (fs.existsSync(to)) throw new Error(`refusing to overwrite ${to}`);
  }
  let copied = 0;
  for (const { from, to } of plan.files) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
    copied += 1;
  }
  let written = 0;
  for (const { to, content } of plan.writes) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, content, { encoding: 'utf8', flag: 'wx' });
    written += 1;
  }
  return { copied, written };
}
