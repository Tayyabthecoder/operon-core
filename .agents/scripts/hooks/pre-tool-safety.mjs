import fs from 'node:fs';
import path from 'node:path';
import { canonicalCase, extractCanonicalWorkspaceRoot, extractRawWorkspaceRoot, readStdin } from '../lib/hook-common.mjs';

export { extractCanonicalWorkspaceRoot };

/**
 * Pre-Tool Safety Hook: Command Execution Safety & Allowlist Gate
 *
 * TOCTOU LIMITATION DISCLOSURE:
 * Command inspection runs synchronously prior to child process spawning.
 * This hook enforces exact command allowlists, parameter validation (BypassSandbox,
 * IsDaemon, WaitMsBeforeAsync, toolSummary), shell chaining rejection, and
 * canonical workspace root anchoring.
 */

/**
 * Checks if command contains forbidden shell chaining, redirection, or metacharacters.
 * @param {string} cmd
 * @returns {string|null} Rejection reason or null if clean
 */
export function checkShellMetacharacters(cmd) {
  const forbiddenPatterns = [
    { pattern: /[;&|]/, reason: 'Command chaining and pipe operators (; && || |) are disallowed' },
    { pattern: /[><]/, reason: 'File redirection operators (> >> <) are disallowed' },
    { pattern: /[\r\n]/, reason: 'Multi-line command execution is disallowed' },
    { pattern: /`|\$\(/, reason: 'Command substitution (` or $()) is disallowed' },
    { pattern: /\b(Out-File|Set-Content|Add-Content)\b/i, reason: 'PowerShell file redirection cmdlets are disallowed' },
    { pattern: /\b(Invoke-Expression|iex)\b/i, reason: 'Dynamic expression execution is disallowed' },
  ];

  for (const { pattern, reason } of forbiddenPatterns) {
    if (pattern.test(cmd)) {
      return reason;
    }
  }
  return null;
}

const DELETION_COMMANDS = new Set(['rm', 'del', 'rmdir', 'remove-item', 'ri', 'rd', 'erase', 'rimraf', 'shred', 'unlink']);

// Launchers whose arguments are themselves a command line (for example `cmd /c del x`).
const COMMAND_WRAPPERS = new Set(['cmd', 'powershell', 'pwsh', 'sh', 'bash', 'zsh', 'sudo', 'env', 'xargs', 'start', 'call', 'command', 'nice', 'nohup', 'exec']);

/**
 * Normalizes a command token to a lowercase program name without quotes, directory, or extension.
 * @param {string} token
 * @returns {string}
 */
export function commandName(token) {
  const unquoted = token.replace(/^["']+|["']+$/g, '');
  const base = unquoted.split(/[\\/]/).pop().toLowerCase();
  return base.replace(/\.(exe|cmd|bat|com)$/, '');
}

/**
 * Detects a deletion command in command position (the program itself, or an argument of a
 * command wrapper such as `cmd /c`). Matching tokens rather than substrings avoids denying
 * harmless commands whose arguments merely contain a word like "del" or "rm".
 * @param {string} cmd
 * @returns {boolean}
 */
function invokesDeletionCommand(cmd) {
  const tokens = cmd.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const first = commandName(tokens[0]);
  if (DELETION_COMMANDS.has(first)) return true;
  if (COMMAND_WRAPPERS.has(first)) {
    return tokens.slice(1).some((token) => DELETION_COMMANDS.has(commandName(token)));
  }
  return false;
}

/**
 * Checks if command contains explicitly forbidden destructive operations.
 * @param {string} cmd
 * @returns {string|null} Rejection reason or null if safe
 */
export function checkDestructiveCommands(cmd) {
  if (invokesDeletionCommand(cmd)) {
    return 'Direct filesystem deletion commands are strictly prohibited';
  }

  const destructivePatterns = [
    {
      pattern: /\bgit\s+rm\b/i,
      reason: 'Direct filesystem deletion commands (git rm) are strictly prohibited',
    },
    {
      pattern: /\bgit\s+reset\b.*\s--hard(?=\s|$)/i,
      reason: 'Destructive git operations (reset --hard) are strictly prohibited',
    },
    {
      // Any forced clean: -f, -fd, -fdx, -xdf, -df, --force
      pattern: /\bgit\s+clean\b.*\s(?:-[a-z]*f[a-z]*|--force)(?=\s|$)/i,
      reason: 'Destructive git operations (forced git clean) are strictly prohibited',
    },
    {
      // Whole-tree discards: git checkout ., git checkout -- ., git restore .
      pattern: /\bgit\s+(?:checkout|restore)\b.*\s\.(?=\s|$)/i,
      reason: 'Destructive git operations (discarding the whole working tree) are strictly prohibited',
    },
    {
      pattern: /\bgit\s+push\b.*\s(?:--force(?:-with-lease)?|-f)(?=\s|$)/i,
      reason: 'Destructive git operations (force push) are strictly prohibited',
    },
    {
      pattern: /\bfind\b.*\s-delete(?=\s|$)/i,
      reason: 'Direct filesystem deletion commands (find -delete) are strictly prohibited',
    },
    {
      pattern: /\bfind\b.*\s-exec(?:dir)?\s+(?:rm|del|rimraf|shred|unlink)\b/i,
      reason: 'Direct filesystem deletion commands (find -exec rm) are strictly prohibited',
    },
    {
      pattern: /\bDROP\s+TABLE\b/i,
      reason: 'Destructive database operations (DROP TABLE) are strictly prohibited',
    },
    {
      pattern: /\bformat\s+[a-z]:\b/i,
      reason: 'Disk formatting operations are strictly prohibited',
    },
  ];

  for (const { pattern, reason } of destructivePatterns) {
    if (pattern.test(cmd)) {
      return reason;
    }
  }
  return null;
}

/**
 * Determines whether a command matches an approved automated profile.
 * Enforces exact string matching without optional prefixes or bare filenames.
 * @param {string} cmd
 * @returns {boolean}
 */
export function isApprovedProfile(cmd, extraAllowed = []) {
  if (typeof cmd !== 'string') return false;
  const normalized = cmd.trim().replace(/\s+/g, ' ');

  if (extraAllowed.includes(normalized)) return true;

  const exactAllowlist = [
    'node .agents/scripts/validate-framework.mjs',
    'node .agents/scripts/verify-runner.mjs --profile framework-validator',
    'node .agents/scripts/verify-runner.mjs --profile node-test',
    'node .agents/scripts/verify-runner.mjs --profile npm-test',
    'node .agents/scripts/verify-runner.mjs --profile pytest',
    'node .agents/scripts/verify-runner.mjs --profile node-test -- .agents/scripts/tests/phase6b-tests.mjs',
    'node --test .agents/scripts/tests/phase6b-tests.mjs',
    'node --test .agents/scripts/tests/fingerprint.test.mjs',
    'node --test .agents/scripts/tests/*.mjs',
    'node .agents/scripts/verify-runner.mjs --profile node-test -- .agents/scripts/tests/*.mjs',
    'git status',
    'git diff',
    'git diff --cached',
    'git diff --staged',
    'git log',
    'git log -n 5',
    'git branch',
    'git branch -a',
    'git show',
    'node --version',
    'npm --version',
    'node .agents/scripts/lib/workspace-fingerprint.mjs',
    'node .agents/scripts/lib/workspace-fingerprint.mjs --json',
  ];

  return exactAllowlist.includes(normalized);
}

function normalizeCommandEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.filter((e) => typeof e === 'string' && e.trim()).map((e) => e.trim().replace(/\s+/g, ' '));
}

// Interpreters that can run arbitrary code from their own arguments.
const INTERPRETERS = new Set(['node', 'deno', 'bun', 'python', 'python3', 'py', 'ruby', 'perl', 'php']);
const EVAL_FLAGS = new Set(['-e', '--eval', '-c', '-p', '--print', '-r', '--require', '--import', '--loader', '--input-type']);

/**
 * Returns true when a `commandPolicy.allowedPatterns` entry is acceptable. Patterns are
 * whitespace-separated tokens: `*` matches exactly one token and a final `**` matches any
 * remaining tokens. Rejected: a wildcard or wrapper/shell in command position (it would approve
 * anything), `**` anywhere but last, wildcards inside the program name, and interpreter patterns
 * whose first argument is a wildcard (for example `node *`).
 * @param {string} pattern Whitespace-normalized pattern
 * @returns {boolean}
 */
export function isValidCommandPattern(pattern) {
  const tokens = pattern.split(' ');
  const program = commandName(tokens[0]);
  if (tokens[0].includes('*') || COMMAND_WRAPPERS.has(program) || DELETION_COMMANDS.has(program)) return false;
  if (tokens.slice(0, -1).includes('**')) return false;
  if (INTERPRETERS.has(program) && (tokens.length < 2 || tokens[1] === '*' || tokens[1] === '**')) return false;
  return true;
}

/**
 * Matches a normalized command line against one allowed pattern, token by token.
 * Callers must already have applied the chaining and destructive checks; this only widens the
 * exact-match allowlist and never overrides a denial.
 * @param {string} pattern Whitespace-normalized, valid pattern
 * @param {string} cmd Whitespace-normalized command line
 * @returns {boolean}
 */
export function matchesCommandPattern(pattern, cmd) {
  if (!isValidCommandPattern(pattern)) return false;
  const patternTokens = pattern.split(' ');
  const cmdTokens = cmd.split(' ');
  if (INTERPRETERS.has(commandName(cmdTokens[0])) && cmdTokens.slice(1).some((t) => EVAL_FLAGS.has(t))) return false;
  const open = patternTokens[patternTokens.length - 1] === '**';
  const fixed = open ? patternTokens.slice(0, -1) : patternTokens;
  if (open ? cmdTokens.length < fixed.length : cmdTokens.length !== fixed.length) return false;
  return fixed.every((token, i) => (token === '*' ? true : token === cmdTokens[i]));
}

/**
 * Loads the project's command policy from `.agents/framework.config.json`:
 * - `commandPolicy.allowedCommands`: exact command lines allowed to run in the foreground.
 * - `commandPolicy.allowedBackgroundCommands`: exact command lines allowed to run as
 *   background/daemon processes (for example a dev server).
 * Entries are matched after whitespace normalization and still pass through the chaining and
 * destructive-command checks. The config file is a control-plane asset, so changing it requires
 * user confirmation. Any missing, unreadable, or malformed config yields empty lists.
 * @param {object} payload
 * - `commandPolicy.allowedPatterns`: token patterns (`*` = one token, trailing `**` = the rest),
 *   for example `npm run *`. Invalid or over-broad patterns are ignored (see isValidCommandPattern).
 * @returns {{ allowedCommands: string[], allowedBackgroundCommands: string[], allowedPatterns: string[] }}
 */
export function loadCommandPolicy(payload) {
  const empty = { allowedCommands: [], allowedBackgroundCommands: [], allowedPatterns: [] };
  const root = extractRawWorkspaceRoot(payload);
  if (!root) return empty;
  try {
    const configPath = path.join(root, '.agents', 'framework.config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^﻿/, ''));
    return {
      allowedCommands: normalizeCommandEntries(config?.commandPolicy?.allowedCommands),
      allowedBackgroundCommands: normalizeCommandEntries(config?.commandPolicy?.allowedBackgroundCommands),
      allowedPatterns: normalizeCommandEntries(config?.commandPolicy?.allowedPatterns).filter(isValidCommandPattern),
    };
  } catch {
    return empty;
  }
}

/**
 * Evaluates PreToolUse command safety decision given a payload.
 * Pure function suitable for unit testing and runtime execution.
 * @param {object} payload
 * @returns {{ decision: string, reason?: string }}
 */
export function evaluateCommandSafety(payload) {
  const toolName = payload.toolCall?.name || payload.tool_name || payload.name;
  if (toolName !== 'run_command') {
    return { decision: 'allow' };
  }

  const args = payload.toolCall?.args || payload.tool_input || payload.args || {};

  // 1. Mandatory Canonical Workspace Root Gate
  const canonicalRoot = extractCanonicalWorkspaceRoot(payload);
  if (!canonicalRoot) {
    return {
      decision: 'deny',
      reason: 'Cannot establish canonical workspace root from hook payload. Command execution denied.',
    };
  }

  // 2. Working Directory (CWD) Gate
  const rawCwd = args.Cwd || args.cwd || payload.cwd;
  if (rawCwd) {
    if (typeof rawCwd !== 'string' || !rawCwd.trim()) {
      return { decision: 'deny', reason: 'Command Cwd argument is malformed.' };
    }
    if (!path.isAbsolute(rawCwd.trim())) {
      return { decision: 'deny', reason: 'Relative command working directory is strictly prohibited.' };
    }
    if (!fs.existsSync(rawCwd.trim())) {
      return { decision: 'deny', reason: 'Command working directory does not exist.' };
    }
    try {
      const canonicalCwd = canonicalCase(path.normalize(fs.realpathSync.native(rawCwd.trim())));
      if (canonicalCwd !== canonicalRoot) {
        return {
          decision: 'deny',
          reason: `Command execution outside workspace boundary CWD is strictly prohibited: "${rawCwd}".`,
        };
      }
    } catch (err) {
      return { decision: 'deny', reason: `Failed to resolve canonical CWD: ${err.message}` };
    }
  }

  // 3. Execution Control Parameters Validation
  // 3a. CommandLine
  const commandLine = args.CommandLine;
  if (typeof commandLine !== 'string' || !commandLine.trim()) {
    return { decision: 'deny', reason: 'Missing or empty CommandLine argument.' };
  }

  // 3b. toolSummary
  if (typeof args.toolSummary !== 'string' || !args.toolSummary.trim()) {
    return { decision: 'deny', reason: 'Missing or invalid toolSummary argument (must be a non-empty string).' };
  }

  // 3c. WaitMsBeforeAsync (Bounded Execution Policy)
  if (typeof args.WaitMsBeforeAsync !== 'number' || !Number.isInteger(args.WaitMsBeforeAsync)) {
    return { decision: 'deny', reason: 'Missing or invalid WaitMsBeforeAsync argument (must be an integer).' };
  }
  if (args.WaitMsBeforeAsync < 1000 || args.WaitMsBeforeAsync > 60000) {
    return { decision: 'deny', reason: 'WaitMsBeforeAsync must be bounded between 1000 and 60000 ms for verification commands.' };
  }

  // 3d. BypassSandbox
  if (args.BypassSandbox !== undefined) {
    if (typeof args.BypassSandbox !== 'boolean') {
      return { decision: 'deny', reason: 'Invalid BypassSandbox argument (must be a boolean).' };
    }
    if (args.BypassSandbox === true) {
      return { decision: 'deny', reason: 'Execution outside sandbox (BypassSandbox: true) is strictly prohibited for automated commands.' };
    }
  }

  // 3e. IsDaemon
  const policy = loadCommandPolicy(payload);
  let isApprovedBackground = false;
  if (args.IsDaemon !== undefined) {
    if (typeof args.IsDaemon !== 'boolean') {
      return { decision: 'deny', reason: 'Invalid IsDaemon argument (must be a boolean).' };
    }
    if (args.IsDaemon === true) {
      // Background execution is denied unless the exact command line is listed by the project
      // in commandPolicy.allowedBackgroundCommands.
      isApprovedBackground = policy.allowedBackgroundCommands.includes(commandLine.trim().replace(/\s+/g, ' '));
      if (!isApprovedBackground) {
        return {
          decision: 'deny',
          reason: 'Daemon/background execution (IsDaemon: true) is prohibited unless the exact command is listed in commandPolicy.allowedBackgroundCommands.',
        };
      }
    }
  }

  // 4. Shell Metacharacters & Chaining Check (;&|><)
  const metaRejection = checkShellMetacharacters(commandLine);
  if (metaRejection) {
    return {
      decision: 'deny',
      reason: `${metaRejection}. Execute discrete single commands directly without chaining.`,
    };
  }

  // 5. Destructive Commands Check
  const destructiveRejection = checkDestructiveCommands(commandLine);
  if (destructiveRejection) {
    return {
      decision: 'deny',
      reason: `${destructiveRejection}.`,
    };
  }

  // 6. Exact Command Profile Matching, then project token patterns (never reached for denied commands)
  const normalizedCommand = commandLine.trim().replace(/\s+/g, ' ');
  if (
    isApprovedBackground ||
    isApprovedProfile(commandLine, policy.allowedCommands) ||
    policy.allowedPatterns.some((pattern) => matchesCommandPattern(pattern, normalizedCommand))
  ) {
    return { decision: 'allow' };
  }

  // 7. Unapproved Command Fallback to Interactive Confirmation
  return {
    decision: 'force_ask',
    reason: `Command profile not in pre-approved allowlist: "${commandLine}". Interactive confirmation required.`,
  };
}

async function main() {
  let payload = {};
  try {
    const rawInput = await readStdin();
    if (rawInput.trim()) {
      payload = JSON.parse(rawInput);
    }
  } catch (err) {
    process.stderr.write(`Failed to parse PreToolUse command safety input: ${err.message}\n`);
    process.stdout.write(JSON.stringify({ decision: 'force_ask', reason: 'Malformed input' }) + '\n');
    process.exit(0);
  }

  const decisionResult = evaluateCommandSafety(payload);

  // Return strictly protojson-compliant response { decision, reason? }
  const cleanResponse = { decision: decisionResult.decision };
  if (decisionResult.reason) {
    cleanResponse.reason = decisionResult.reason;
  }

  process.stdout.write(JSON.stringify(cleanResponse) + '\n');
  process.exit(0);
}

// Execute main if run directly
if (process.argv[1] && process.argv[1].endsWith('pre-tool-safety.mjs')) {
  main();
}
