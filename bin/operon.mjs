#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STACKS, applyInit, planInit } from '../.agents/scripts/lib/bootstrap.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const USAGE = `Usage: operon init [directory] [--stack auto|a,b,c] [--dry-run]

Installs the agent framework (.agents/, AGENTS.md, CLAUDE.md) into a repository.
It never overwrites: a directory that already has .agents/ is refused.

  directory     Target repository (default: the current directory)
  --stack       Language rule sets to install: "auto" (detect from marker files, default)
                or a comma-separated list. Known: ${STACKS.join(', ')}
  --dry-run     Show what would be installed and change nothing
`;

function parse(argv) {
  const options = { dir: '.', stacks: 'auto', dryRun: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--stack') {
      const value = argv[(i += 1)];
      if (!value) throw new Error('--stack needs a value');
      options.stacks = value === 'auto' ? 'auto' : value.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg.startsWith('-')) throw new Error(`unknown option ${arg}`);
    else options.dir = arg;
  }
  return options;
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') {
    process.stdout.write(USAGE);
    return 0;
  }
  if (command !== 'init') {
    process.stderr.write(`Unknown command "${command}"\n\n${USAGE}`);
    return 2;
  }
  let options;
  try {
    options = parse(rest);
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${USAGE}`);
    return 2;
  }
  if (options.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  const plan = planInit({ sourceRoot, targetDir: path.resolve(options.dir), stacks: options.stacks });
  if (!plan.ok) {
    process.stderr.write(`operon init: ${plan.error}\n`);
    return 1;
  }
  const summary = [
    `Target: ${path.resolve(options.dir)}`,
    `Stacks: ${plan.stacks.length ? plan.stacks.join(', ') : '(none detected; core rules only)'}`,
    `Rules: ${plan.rules.length} installed, ${plan.skippedRules} language rules skipped`,
    `Files: ${plan.files.length} copied, ${plan.writes.length} generated`,
  ];
  process.stdout.write(`${summary.join('\n')}\n`);
  if (options.dryRun) {
    process.stdout.write('Dry run: nothing was written.\n');
    return 0;
  }
  const result = applyInit(plan);
  process.stdout.write(`Installed ${result.copied} files and generated ${result.written}.\n`);
  for (const note of plan.notes) process.stdout.write(`Note: ${note}\n`);
  process.stdout.write('Next: node .agents/scripts/adapters/setup-claude-code.mjs   (Claude Code wiring), then review .agents/framework.config.json.\n');
  return 0;
}

process.exitCode = main();
