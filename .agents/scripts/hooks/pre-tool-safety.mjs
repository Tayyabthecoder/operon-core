import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
 * Reads all content from stdin as a string.
 * @returns {Promise<string>}
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    process.stdin.on('error', (err) => {
      reject(err);
    });
  });
}

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

/**
 * Checks if command contains explicitly forbidden destructive operations.
 * @param {string} cmd
 * @returns {string|null} Rejection reason or null if safe
 */
export function checkDestructiveCommands(cmd) {
  const destructivePatterns = [
    {
      pattern: /\b(rm|del|rmdir|Remove-Item|ri|rd|erase)\b/i,
      reason: 'Direct filesystem deletion commands are strictly prohibited',
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
export function isApprovedProfile(cmd) {
  if (typeof cmd !== 'string') return false;
  const normalized = cmd.trim().replace(/\s+/g, ' ');

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

/**
 * Extracts and canonicalizes the workspace root strictly from the hook payload.
 * Rejects relative paths before resolve, rejects remote URI authorities,
 * disambiguates multi-root payloads, and ensures the target is an existing directory.
 * @param {object} payload
 * @returns {string|null} Canonical lowercased workspace root, or null if unestablished
 */
export function extractCanonicalWorkspaceRoot(payload) {
  if (!payload || typeof payload !== 'object') return null;

  let candidateRaw = null;

  const paths = Array.isArray(payload.workspacePaths)
    ? payload.workspacePaths.filter((p) => typeof p === 'string' && p.trim().length > 0)
    : [];

  if (paths.length === 1) {
    candidateRaw = paths[0].trim();
  } else if (paths.length > 1) {
    if (typeof payload.workspaceRoot === 'string' && payload.workspaceRoot.trim().length > 0) {
      candidateRaw = payload.workspaceRoot.trim();
    } else {
      return null;
    }
  } else if (typeof payload.workspaceRoot === 'string' && payload.workspaceRoot.trim().length > 0) {
    candidateRaw = payload.workspaceRoot.trim();
  }

  if (!candidateRaw) {
    return null;
  }

  if (/^file:/i.test(candidateRaw)) {
    try {
      const parsedUrl = new URL(candidateRaw);
      if (parsedUrl.host && parsedUrl.host !== 'localhost') {
        return null;
      }
      candidateRaw = fileURLToPath(parsedUrl);
    } catch {
      return null;
    }
  }

  if (!path.isAbsolute(candidateRaw)) {
    return null;
  }

  try {
    if (!fs.existsSync(candidateRaw)) {
      return null;
    }
    const stat = fs.statSync(candidateRaw);
    if (!stat.isDirectory()) {
      return null;
    }

    const realRoot = fs.realpathSync.native(candidateRaw);
    const realStat = fs.statSync(realRoot);
    if (!realStat.isDirectory()) {
      return null;
    }
    return path.normalize(realRoot).toLowerCase();
  } catch {
    return null;
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
      const canonicalCwd = path.normalize(fs.realpathSync.native(rawCwd.trim())).toLowerCase();
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
  if (args.IsDaemon !== undefined) {
    if (typeof args.IsDaemon !== 'boolean') {
      return { decision: 'deny', reason: 'Invalid IsDaemon argument (must be a boolean).' };
    }
    if (args.IsDaemon === true) {
      return { decision: 'deny', reason: 'Daemon/background execution (IsDaemon: true) is strictly prohibited for verification commands.' };
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

  // 6. Exact Command Profile Matching
  if (isApprovedProfile(commandLine)) {
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
