import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontmatterOf } from './lib/rule-metadata.mjs';

/**
 * ECC Drift Report
 *
 * The language rules and workflows adapted from ECC (`ecc-universal`) carry a
 * `source: ecc-universal@<version>` stamp in their frontmatter. This script:
 *   1. checks every stamp against the version recorded in THIRD_PARTY_NOTICES.md (always possible);
 *   2. when a local copy of the upstream package is available (default `ECC-framework/`, which is
 *      git-ignored), compares each adapted rule's body to its upstream file and reports which are
 *      unchanged, locally modified, or no longer present upstream.
 *
 * Usage:
 *   node .agents/scripts/ecc-drift.mjs [--root <dir>] [--ecc <dir>] [--json]
 *
 * Bodies are compared after removing frontmatter, the generated "extends" link line, and
 * whitespace differences, because the adaptation rewrites those on purpose.
 */

const STAMP = /^source:\s*ecc-universal@(\S+)\s*$/m;

/**
 * @param {string} text
 * @returns {string|null} Stamped upstream version, or null when the file has no ECC stamp
 */
export function stampOf(text) {
  const front = frontmatterOf(text);
  const match = front && front.match(STAMP);
  return match ? match[1] : null;
}

/**
 * @param {string} rootDir
 * @returns {string|null} Version from THIRD_PARTY_NOTICES.md, or null when not found
 */
export function noticesVersion(rootDir) {
  try {
    const text = fs.readFileSync(path.join(rootDir, 'THIRD_PARTY_NOTICES.md'), 'utf8');
    return (text.match(/ecc-universal`\s*v(\d+\.\d+\.\d+)/) || [])[1] || null;
  } catch {
    return null;
  }
}

/**
 * Lists the stamped rules and workflows.
 * @param {string} rootDir
 * @returns {{ kind: 'rule'|'workflow', file: string, version: string }[]}
 */
export function collectStamps(rootDir) {
  const found = [];
  for (const [kind, sub] of [['rule', 'rules'], ['workflow', 'workflows']]) {
    const dir = path.join(rootDir, '.agents', sub);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()) {
      const version = stampOf(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (version) found.push({ kind, file, version });
    }
  }
  return found;
}

function normalizedBody(text) {
  return String(text)
    .replace(/^﻿/, '')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    .split(/\r?\n/)
    .filter((line) => !/^>\s*This file extends\b/.test(line))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Compares one adapted rule with its upstream counterpart.
 * @param {string} localText
 * @param {string} upstreamText
 * @returns {{ status: 'unchanged'|'modified', addedLines: number, removedLines: number }}
 */
export function compareBodies(localText, upstreamText) {
  const local = normalizedBody(localText);
  const upstream = normalizedBody(upstreamText);
  const localSet = new Set(local);
  const upstreamSet = new Set(upstream);
  const addedLines = local.filter((line) => !upstreamSet.has(line)).length;
  const removedLines = upstream.filter((line) => !localSet.has(line)).length;
  return { status: addedLines === 0 && removedLines === 0 ? 'unchanged' : 'modified', addedLines, removedLines };
}

/**
 * Builds the drift report.
 * @param {string} rootDir
 * @param {string|null} eccDir Local copy of the upstream package, or null when unavailable
 * @returns {object}
 */
export function buildDriftReport(rootDir, eccDir) {
  const stamps = collectStamps(rootDir);
  const expected = noticesVersion(rootDir);
  const versions = {};
  for (const { version } of stamps) versions[version] = (versions[version] || 0) + 1;
  const mismatched = stamps.filter((s) => expected !== null && s.version !== expected);

  const report = { expectedVersion: expected, stamped: stamps.length, versions, mismatched, upstream: null };
  if (!eccDir || !fs.existsSync(path.join(eccDir, 'rules'))) return report;

  const results = { unchanged: [], modified: [], missingUpstream: [] };
  for (const { kind, file } of stamps.filter((s) => s.kind === 'rule')) {
    const upstreamFile = path.join(eccDir, 'rules', file);
    if (!fs.existsSync(upstreamFile)) {
      results.missingUpstream.push(file);
      continue;
    }
    const comparison = compareBodies(
      fs.readFileSync(path.join(rootDir, '.agents', 'rules', file), 'utf8'),
      fs.readFileSync(upstreamFile, 'utf8')
    );
    if (comparison.status === 'unchanged') results.unchanged.push(file);
    else results.modified.push({ file, addedLines: comparison.addedLines, removedLines: comparison.removedLines });
  }
  report.upstream = results;
  return report;
}

/**
 * @param {object} report
 * @returns {string}
 */
export function formatDriftReport(report) {
  const lines = ['ECC Drift Report', `Version in THIRD_PARTY_NOTICES.md: ${report.expectedVersion ?? 'not found'}`];
  lines.push(`Stamped files (rules and workflows): ${report.stamped}`);
  for (const [version, count] of Object.entries(report.versions)) lines.push(`  ecc-universal@${version}: ${count}`);
  if (report.mismatched.length) {
    lines.push('', 'Stamps that differ from THIRD_PARTY_NOTICES.md:');
    for (const m of report.mismatched) lines.push(`  ${m.kind} ${m.file}: ${m.version}`);
  }
  if (!report.upstream) {
    lines.push('', 'No local upstream copy found (ECC-framework/rules); body comparison skipped.');
    return lines.join('\n');
  }
  const { unchanged, modified, missingUpstream } = report.upstream;
  lines.push('', `Rule bodies vs local upstream copy: ${unchanged.length} unchanged, ${modified.length} modified, ${missingUpstream.length} missing upstream`);
  for (const m of modified) lines.push(`  modified: ${m.file} (+${m.addedLines} / -${m.removedLines} lines)`);
  for (const f of missingUpstream) lines.push(`  missing upstream: ${f}`);
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const option = (name) => (args.includes(name) && args[args.indexOf(name) + 1]) || null;
  const rootDir = path.resolve(option('--root') || process.cwd());
  const eccDir = path.resolve(option('--ecc') || path.join(rootDir, 'ECC-framework'));
  const report = buildDriftReport(rootDir, eccDir);
  process.stdout.write((args.includes('--json') ? JSON.stringify(report, null, 2) : formatDriftReport(report)) + '\n');
  process.exit(report.mismatched.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
