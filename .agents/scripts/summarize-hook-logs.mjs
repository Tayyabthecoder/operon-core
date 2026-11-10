import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDefaultArtifactDir } from './lib/artifact-dir.mjs';
import { redactReason } from './lib/hook-common.mjs';

/**
 * Hook Log Summary
 *
 * Summarizes the framework's audit logs from a session artifact directory:
 *   hook-event-log.jsonl      pre-tool decisions (allow, force_ask, deny)
 *   stop-event-log.jsonl      stop-gate decisions
 *   post-tool-telemetry.jsonl completed tool calls
 *
 * Usage:
 *   node .agents/scripts/summarize-hook-logs.mjs [--workspace <dir>] [--artifactDir <dir>] [--json]
 *
 * Without --artifactDir, the default per-workspace artifact directory is used (the one the
 * Claude Code adapter writes to). Reasons are re-redacted here so older logs stay safe to share.
 */

const TOP_REASON_LIMIT = 10;

/**
 * Parses JSON Lines text, skipping blank and malformed lines.
 * @param {string} text
 * @returns {{ entries: object[], malformed: number }}
 */
export function parseJsonLines(text) {
  const entries = [];
  let malformed = 0;
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) entries.push(parsed);
      else malformed++;
    } catch {
      malformed++;
    }
  }
  return { entries, malformed };
}

function increment(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function timeRange(entries) {
  const stamps = entries.map((e) => e.timestamp).filter((t) => typeof t === 'string').sort();
  return stamps.length ? { first: stamps[0], last: stamps[stamps.length - 1] } : null;
}

/**
 * Builds a summary from parsed log entries.
 * @param {{ hookEvents?: object[], stopEvents?: object[], postToolEvents?: object[] }} logs
 * @returns {object}
 */
export function summarizeLogs({ hookEvents = [], stopEvents = [], postToolEvents = [] }) {
  const decisions = {};
  const byTool = {};
  const reasons = {};
  for (const event of hookEvents) {
    const decision = event.decision?.decision || 'unknown';
    const tool = event.input?.tool || 'unknown';
    increment(decisions, decision);
    byTool[tool] = byTool[tool] || {};
    increment(byTool[tool], decision);
    if (decision !== 'allow' && event.decision?.reason) {
      increment(reasons, `${decision}: ${redactReason(event.decision.reason)}`);
    }
  }

  const stopOutcomes = {};
  for (const event of stopEvents) {
    increment(stopOutcomes, event.output?.decision === 'continue' ? 'blocked (continue)' : 'allowed');
  }

  const postToolByTool = {};
  for (const event of postToolEvents) increment(postToolByTool, event.tool || 'unknown');

  const topReasons = Object.entries(reasons)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_REASON_LIMIT)
    .map(([reason, count]) => ({ reason, count }));

  return {
    preTool: { total: hookEvents.length, decisions, byTool, topReasons, range: timeRange(hookEvents) },
    stopGate: { total: stopEvents.length, outcomes: stopOutcomes, range: timeRange(stopEvents) },
    postTool: { total: postToolEvents.length, byTool: postToolByTool, range: timeRange(postToolEvents) },
  };
}

/**
 * Renders a summary as readable text.
 * @param {object} summary
 * @param {{ missing?: string[], malformed?: number, artifactDir?: string }} [meta]
 * @returns {string}
 */
export function formatSummary(summary, meta = {}) {
  const lines = ['Hook Log Summary'];
  if (meta.artifactDir) lines.push(`Artifact directory: ${meta.artifactDir}`);

  const { preTool, stopGate, postTool } = summary;
  lines.push('', `Pre-tool decisions: ${preTool.total}`);
  for (const [decision, count] of Object.entries(preTool.decisions)) lines.push(`  ${decision}: ${count}`);
  if (preTool.range) lines.push(`  range: ${preTool.range.first} to ${preTool.range.last}`);

  const tools = Object.entries(preTool.byTool);
  if (tools.length) {
    lines.push('  by tool:');
    for (const [tool, counts] of tools) {
      lines.push(`    ${tool}: ${Object.entries(counts).map(([d, c]) => `${d}=${c}`).join(', ')}`);
    }
  }
  if (preTool.topReasons.length) {
    lines.push('  top non-allow reasons:');
    for (const { reason, count } of preTool.topReasons) lines.push(`    ${count} x ${reason}`);
  }

  lines.push('', `Stop gate events: ${stopGate.total}`);
  for (const [outcome, count] of Object.entries(stopGate.outcomes)) lines.push(`  ${outcome}: ${count}`);

  lines.push('', `Completed tool calls: ${postTool.total}`);
  for (const [tool, count] of Object.entries(postTool.byTool)) lines.push(`  ${tool}: ${count}`);

  if (meta.missing?.length) lines.push('', `Missing log files (nothing recorded yet): ${meta.missing.join(', ')}`);
  if (meta.malformed) lines.push('', `Skipped ${meta.malformed} malformed log line(s).`);
  return lines.join('\n');
}

function readLog(artifactDir, fileName) {
  const filePath = path.join(artifactDir, fileName);
  if (!fs.existsSync(filePath)) return { entries: [], malformed: 0, missing: true };
  return { ...parseJsonLines(fs.readFileSync(filePath, 'utf8')), missing: false };
}

function parseArgs(argv) {
  const options = { workspace: process.cwd(), artifactDir: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--workspace' && i + 1 < argv.length) options.workspace = argv[++i];
    else if (argv[i] === '--artifactDir' && i + 1 < argv.length) options.artifactDir = argv[++i];
    else if (argv[i] === '--json') options.json = true;
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const artifactDir = options.artifactDir || process.env.ARTIFACT_DIRECTORY_PATH || resolveDefaultArtifactDir(path.resolve(options.workspace));

  if (!fs.existsSync(artifactDir)) {
    process.stderr.write(`No artifact directory found at ${artifactDir}. Run a session with the hooks enabled first.\n`);
    process.exit(1);
  }

  const files = {
    hook: readLog(artifactDir, 'hook-event-log.jsonl'),
    stop: readLog(artifactDir, 'stop-event-log.jsonl'),
    postTool: readLog(artifactDir, 'post-tool-telemetry.jsonl'),
  };
  const summary = summarizeLogs({ hookEvents: files.hook.entries, stopEvents: files.stop.entries, postToolEvents: files.postTool.entries });
  const meta = {
    artifactDir,
    malformed: files.hook.malformed + files.stop.malformed + files.postTool.malformed,
    missing: [
      files.hook.missing && 'hook-event-log.jsonl',
      files.stop.missing && 'stop-event-log.jsonl',
      files.postTool.missing && 'post-tool-telemetry.jsonl',
    ].filter(Boolean),
  };

  process.stdout.write((options.json ? JSON.stringify({ ...summary, meta }, null, 2) : formatSummary(summary, meta)) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
