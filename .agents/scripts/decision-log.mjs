import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TAGS, appendEntry, normalizeMemoryConfig, parseDecisionLog, formatEntry } from './lib/decision-log.mjs';

/**
 * Decision Log CLI
 *
 * Usage:
 *   node .agents/scripts/decision-log.mjs add --tag <tag> "<text>" [--date YYYY-MM-DD]
 *   node .agents/scripts/decision-log.mjs list
 *   node .agents/scripts/decision-log.mjs check
 *
 * Options: --root <dir> (default: current directory). The file is `memory.file` from
 * framework.config.json (default `.agents/memory/decision-log.md`). `add` appends one validated
 * line; it refuses empty text, unknown tags, secret-like text, and duplicates. `check` exits 1
 * when the file has malformed or unsafe lines.
 */

function memoryFile(root) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(root, '.agents', 'framework.config.json'), 'utf8').replace(/^﻿/, '')).memory;
  } catch {
    raw = undefined;
  }
  return path.join(root, normalizeMemoryConfig(raw).file);
}

function main() {
  const args = process.argv.slice(2);
  const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const root = path.resolve(option('--root') || process.cwd());
  const command = args[0];
  const file = memoryFile(root);

  if (command === 'add') {
    const flagged = new Set(['--tag', '--date', '--root']);
    const text = args.slice(1).filter((a, i, all) => !a.startsWith('--') && !flagged.has(all[i - 1])).join(' ');
    const result = appendEntry(file, { tag: option('--tag'), text, date: option('--date') });
    if (!result.added) {
      process.stderr.write(`Not added: ${result.reason}\n`);
      process.exit(1);
    }
    process.stdout.write(`Added to ${path.relative(root, file)}:\n${result.line}\n`);
    return;
  }

  if (command === 'list' || command === 'check') {
    if (!fs.existsSync(file)) {
      process.stdout.write(`No decision log at ${path.relative(root, file)}.\n`);
      return;
    }
    const { entries, problems } = parseDecisionLog(fs.readFileSync(file, 'utf8'));
    if (command === 'list') for (const entry of entries) process.stdout.write(formatEntry(entry) + '\n');
    for (const problem of problems) process.stderr.write(`Line ${problem.line}: ${problem.reason}\n`);
    process.stdout.write(`${entries.length} valid entr${entries.length === 1 ? 'y' : 'ies'}, ${problems.length} problem(s).\n`);
    if (command === 'check' && problems.length) process.exit(1);
    return;
  }

  process.stderr.write(`Usage: decision-log.mjs add --tag <${TAGS.join('|')}> "<text>" | list | check\n`);
  process.exit(2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
