import fs from 'node:fs';
import path from 'node:path';
import { matchesAnyGlob } from './glob-match.mjs';

/**
 * On-demand rule reminders.
 *
 * Rules without a file pattern (architecture, git-workflow, ...) are not loaded into Claude Code
 * automatically; nothing forces the agent to read them. `ruleReminders` in
 * `.agents/framework.config.json` lets a project name the moments they matter. When a governed
 * tool call matches, the Claude Code adapter attaches a one-line reminder to the PreToolUse
 * output. Reminders never change an allow, ask, or deny decision.
 *
 * Entry shape (all matchers optional, at least one required):
 *   { "id": "git-workflow", "rule": ".agents/rules/git-workflow.md", "reason": "...",
 *     "command": { "program": "git", "subcommands": ["commit", "merge"] },
 *     "pathGlobs": ["docs/architecture/**"] }
 */

/**
 * @param {string} projectDir
 * @returns {object[]} Valid reminder entries (empty when the config is missing or malformed)
 */
export function loadRuleReminders(projectDir) {
  try {
    const configPath = path.join(projectDir, '.agents', 'framework.config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^﻿/, ''));
    if (!Array.isArray(config?.ruleReminders)) return [];
    return config.ruleReminders.filter(
      (entry) =>
        entry && typeof entry.id === 'string' && typeof entry.rule === 'string' && entry.rule.trim() &&
        (entry.command || Array.isArray(entry.pathGlobs))
    );
  } catch {
    return [];
  }
}

function programAndSubcommand(commandLine) {
  const tokens = String(commandLine || '').trim().split(/\s+/).filter(Boolean);
  const program = (tokens[0] || '').replace(/^["']+|["']+$/g, '').split(/[\\/]/).pop().toLowerCase().replace(/\.(exe|cmd|bat|com)$/, '');
  // Skip leading option flags such as `git -C dir commit`.
  const rest = tokens.slice(1);
  let sub = rest.find((t) => !t.startsWith('-')) || '';
  if (program === 'git' && rest[0] === '-C') sub = rest[2] || '';
  return { program, sub: sub.toLowerCase() };
}

/**
 * @param {{ name: string, args: object }} toolCall Framework tool call
 * @param {object[]} reminders Entries from loadRuleReminders
 * @param {string} projectDir
 * @returns {string[]} One reminder line per matching entry
 */
export function findRuleReminders(toolCall, reminders, projectDir) {
  if (!toolCall || !reminders.length) return [];
  const lines = [];
  for (const entry of reminders) {
    let matched = false;
    if (toolCall.name === 'run_command' && entry.command && typeof entry.command.program === 'string') {
      const { program, sub } = programAndSubcommand(toolCall.args?.CommandLine);
      const subs = Array.isArray(entry.command.subcommands) ? entry.command.subcommands.map((s) => String(s).toLowerCase()) : [];
      matched = program === entry.command.program.toLowerCase() && (subs.length === 0 || subs.includes(sub));
    } else if ((toolCall.name === 'write_file' || toolCall.name === 'edit_file') && Array.isArray(entry.pathGlobs)) {
      const target = toolCall.args?.Path;
      if (typeof target === 'string' && target) {
        const relative = path.isAbsolute(target) ? path.relative(projectDir, target) : target;
        matched = !relative.startsWith('..') && matchesAnyGlob(entry.pathGlobs, relative);
      }
    }
    if (matched) {
      const why = typeof entry.reason === 'string' && entry.reason.trim() ? ` ${entry.reason.trim()}` : '';
      lines.push(`Before continuing, read the on-demand rule ${entry.rule}.${why}`);
    }
  }
  return lines;
}
