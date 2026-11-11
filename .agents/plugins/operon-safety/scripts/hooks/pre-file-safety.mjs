import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalCase, extractCanonicalWorkspaceRoot, readStdin } from '../lib/hook-common.mjs';

export { extractCanonicalWorkspaceRoot };

/**
 * Pre-Tool Safety Hook: Filesystem Read & Mutation Protection
 *
 * TOCTOU LIMITATION DISCLOSURE:
 * Resolving file paths using fs.realpathSync.native() during the PreToolUse hook
 * establishes canonical containment and detects symbolic links / directory junctions
 * at the moment of inspection (T_check). However, because the hook operates in an
 * external supervisory Node.js process and does not hold an open, pinned OS file
 * handle (e.g. via FILE_FLAG_OPEN_REPARSE_POINT) passed directly to the tool, a
 * Time-of-Check to Time-of-Use window exists between hook approval (T_check) and the
 * platform tool opening the file (T_use). This hook provides rigorous preflight
 * containment validation, but cannot eliminate concurrent local filesystem race conditions.
 */

/**
 * Checks if target path belongs to framework control-plane assets.
 * Covers the root AGENTS.md and everything under .agents/ (rules, agents, skills,
 * templates, config, scripts, tests) except the .agents/scratch/ working area.
 * @param {string} relPosixPath
 * @returns {boolean}
 */
export function isControlPlaneAsset(relPosixPath) {
  if (!relPosixPath || typeof relPosixPath !== 'string') return false;
  const normalized = relPosixPath.split(path.sep).join('/');
  const controlPlaneRegex = /^(?:agents\.md$|\.agents(?:\/(?!scratch(?:\/|$)).*)?$)/i;
  return controlPlaneRegex.test(normalized);
}

/**
 * Resolves the canonical (realpath) form of a write target that may not exist yet.
 * Walks up to the nearest existing ancestor (using lstat so dangling links count as
 * existing), canonicalizes it, and re-appends the missing segments.
 * Throws if an existing ancestor cannot be canonicalized (e.g. a dangling link).
 * @param {string} absoluteTarget
 * @returns {string|null} Lowercased canonical path, or null if no ancestor exists
 */
export function resolveCanonicalWriteTarget(absoluteTarget) {
  let probe = absoluteTarget;
  const missingSegments = [];
  for (;;) {
    let exists = false;
    try {
      fs.lstatSync(probe);
      exists = true;
    } catch {
      exists = false;
    }
    if (exists) break;
    const parent = path.dirname(probe);
    if (parent === probe) return null;
    missingSegments.unshift(path.basename(probe));
    probe = parent;
  }
  const realAncestor = fs.realpathSync.native(probe);
  return canonicalCase(path.normalize(path.join(realAncestor, ...missingSegments)));
}

/**
 * Evaluates whether a relative POSIX path matches the sensitive path inventory.
 * Detects sensitive directories themselves and any files/paths nested within them.
 * @param {string} relPosixPath
 * @returns {boolean}
 */
export function isSensitiveFile(relPosixPath) {
  if (!relPosixPath || typeof relPosixPath !== 'string') return false;

  const normalized = relPosixPath.split(path.sep).join('/').toLowerCase().trim();
  const basename = path.posix.basename(normalized);

  // 1. Environment configuration files
  if (basename === '.env' || basename.startsWith('.env.')) {
    return true;
  }

  // 2. Private keys and cryptographic credentials
  if (/\.(pem|key|p12|pfx|jks|keystore|ppk)$/i.test(basename)) {
    return true;
  }

  // 3. SSH key files
  if (/^(id_rsa|id_ed25519|id_ecdsa|id_dsa|known_hosts|authorized_keys)(\.pub)?$/i.test(basename)) {
    return true;
  }

  // 4. Known credential and secret filenames
  const credentialFiles = [
    '.netrc',
    '.npmrc',
    '.pypirc',
    '.git-credentials',
    'application_default_credentials.json',
    'service_account.json',
    'service-account.json',
    'service-account-key.json',
    'client_secret.json',
    'client_secrets.json',
    'credentials.json',
    'credential.json',
    'secrets.json',
    'secret.json',
    'token.json',
    'tokens.json',
    'auth.json',
  ];
  if (credentialFiles.includes(basename)) {
    return true;
  }

  // 5. Segment-aware sensitive directory matching:
  // Matches the directory itself (ends with $) OR any path inside it (followed by /)
  const sensitiveDirRegex =
    /(^|\/)(\.ssh|\.aws|\.azure|\.kube|\.docker|\.terraform\.d|\.config\/(gcloud|gh|oci)|\.secrets|\.credentials|secrets|credentials|secret-store|credential-store)($|\/)/i;

  return sensitiveDirRegex.test(normalized);
}

/**
 * Extracts target file path from mutation tool arguments.
 * @param {string} toolName
 * @param {object} args
 * @returns {string|null}
 */
export function extractTargetPath(toolName, args) {
  if (!args || typeof args !== 'object') {
    return null;
  }
  if (toolName === 'edit_file' || toolName === 'write_file') {
    return args.Path || args.path || null;
  }
  return (
    args.TargetFile ||
    args.Path ||
    args.path ||
    args.filePath ||
    args.target_file ||
    args.file ||
    null
  );
}

/**
 * Deterministic target-path extraction layer for read and discovery operations.
 * Fails closed with UNKNOWN_TARGET for any unverified or ambiguous schema.
 * @param {string} toolName
 * @param {object} args
 * @returns {{ type: string, targetPath?: string, serverName?: string, uri?: string, reason?: string }}
 */
export function extractReadTargets(toolName, args) {
  if (!args || typeof args !== 'object') {
    return { type: 'UNKNOWN_TARGET', reason: 'Missing or non-object tool arguments.' };
  }

  // 1. Native Direct Content Reader: read_file
  if (toolName === 'read_file') {
    const rawPath = args.Path;
    if (typeof rawPath === 'string' && rawPath.trim().length > 0) {
      if (/[\r\n\0]/.test(rawPath)) {
        return { type: 'UNKNOWN_TARGET', reason: 'Target path contains control characters.' };
      }
      return { type: 'SINGLE_FILE', targetPath: rawPath.trim() };
    }
    return { type: 'UNKNOWN_TARGET', reason: 'read_file invoked without valid string Path argument.' };
  }

  // 2. Native MCP External Resource Reader: read_resource
  if (toolName === 'read_resource') {
    const server = args.ServerName;
    const uri = args.Uri;
    if (typeof server === 'string' && typeof uri === 'string' && server.trim() && uri.trim()) {
      return { type: 'EXTERNAL_RESOURCE', serverName: server.trim(), uri: uri.trim() };
    }
    return { type: 'UNKNOWN_TARGET', reason: 'read_resource invoked without valid ServerName and Uri arguments.' };
  }

  // 3. Mapped viewer, search, and listing tools: each accepts only its declared path keys.
  //    A call without a usable path still fails closed with UNKNOWN_TARGET.
  const scopedTools = {
    view_file: { type: 'SINGLE_FILE', keys: ['AbsolutePath', 'Path'] },
    grep_search: { type: 'CONTENT_SEARCH', keys: ['SearchPath', 'SearchDirectory', 'Path'] },
    find_by_name: { type: 'DIRECTORY_LISTING', keys: ['SearchDirectory', 'DirectoryPath', 'Path'] },
    list_dir: { type: 'DIRECTORY_LISTING', keys: ['DirectoryPath', 'Path'] },
    dir_list: { type: 'DIRECTORY_LISTING', keys: ['DirectoryPath', 'Path'] },
    list_directory: { type: 'DIRECTORY_LISTING', keys: ['DirectoryPath', 'Path'] },
  };
  const mapping = scopedTools[toolName];
  if (mapping) {
    const key = mapping.keys.find((k) => args[k] !== undefined);
    const rawPath = key ? args[key] : undefined;
    if (typeof rawPath === 'string' && rawPath.trim().length > 0 && !/[\r\n\0]/.test(rawPath)) {
      return { type: mapping.type, targetPath: rawPath.trim() };
    }
    return {
      type: 'UNKNOWN_TARGET',
      reason: `Tool "${toolName}" invoked without a valid path argument (${mapping.keys.join(', ')}); access is denied.`,
    };
  }

  // 4. Default: Unknown tool
  return { type: 'UNKNOWN_TARGET', reason: `Unrecognized read tool "${toolName}".` };
}

/**
 * Syntactically validates a requested target path string.
 * @param {string} rawTarget
 * @returns {string|null} Rejection reason or null if safe
 */
export function checkSyntacticPathEscapes(rawTarget) {
  if (rawTarget.includes('\0')) {
    return 'Path contains forbidden NUL character.';
  }
  if (/^(\\\\|\/\/)/.test(rawTarget)) {
    return 'UNC network paths are strictly prohibited.';
  }
  if (/^\\\\[.?]\\/i.test(rawTarget)) {
    return 'Windows device namespace paths are strictly prohibited.';
  }
  if (/^[a-zA-Z]:[^\\/]/.test(rawTarget)) {
    return 'Drive-relative paths are strictly prohibited.';
  }
  const pathWithoutDrive = rawTarget.replace(/^[a-zA-Z]:/, '');
  if (pathWithoutDrive.includes(':')) {
    return 'NTFS Alternate Data Stream paths are strictly prohibited.';
  }
  return null;
}

/**
 * Resolves and validates canonical path containment and sensitive inventory matching.
 * Lexical and canonical boundary containment execute strictly BEFORE sensitive approval.
 * @param {string} targetRaw Requested path
 * @param {string} canonicalRoot Verified canonical workspace root
 * @param {string} workspaceRoot Raw workspace root
 * @returns {{ decision: string, reason?: string, relPosixPath?: string }}
 */
export function validateCanonicalPath(targetRaw, canonicalRoot, workspaceRoot) {
  const syntaxError = checkSyntacticPathEscapes(targetRaw);
  if (syntaxError) {
    return { decision: 'deny', reason: syntaxError };
  }

  let cleanTarget = targetRaw.trim().replace(/^file:\/\/\/?/i, '');
  if (/^\/[a-zA-Z]:/.test(cleanTarget)) {
    cleanTarget = cleanTarget.slice(1);
  }

  // 1. Lexical containment check (FIRST GATE - MUST PRECEDE SENSITIVE EVALUATION)
  const requestedResolved = path.resolve(workspaceRoot, cleanTarget);
  const requestedRel = path.relative(workspaceRoot, requestedResolved);
  if (path.isAbsolute(requestedRel)) {
    return {
      decision: 'deny',
      reason: `Target path resolves outside workspace boundary: "${targetRaw}".`,
    };
  }

  const normReqRel = requestedRel.split(path.sep).join('/');
  const isLexicalOutside = normReqRel === '..' || normReqRel.startsWith('../');
  if (isLexicalOutside) {
    return {
      decision: 'deny',
      reason: `Target path traverses outside workspace boundary: "${targetRaw}".`,
    };
  }

  // 2. Physical existence check
  if (!fs.existsSync(requestedResolved)) {
    return {
      decision: 'deny',
      reason: `Target path does not exist or cannot be resolved: "${targetRaw}".`,
    };
  }

  // 3. Canonical containment check (SECOND GATE)
  try {
    const canonicalTarget = canonicalCase(path.normalize(fs.realpathSync.native(requestedResolved)));
    const relFromRoot = path.relative(canonicalRoot, canonicalTarget);
    if (path.isAbsolute(relFromRoot)) {
      return {
        decision: 'deny',
        reason: `Target resolves to an absolute path on a different volume: "${canonicalTarget}".`,
      };
    }

    const normRel = relFromRoot.split(path.sep).join('/');
    const isCanonicalOutside = normRel === '..' || normRel.startsWith('../');
    if (isCanonicalOutside) {
      return {
        decision: 'deny',
        reason: `Target or symlink resolves outside canonical workspace boundary: "${targetRaw}" -> "${canonicalTarget}".`,
      };
    }

    // 4. Sensitive inventory check (ONLY EVALUATED FOR VERIFIED IN-WORKSPACE TARGETS)
    if (isSensitiveFile(normReqRel)) {
      return {
        decision: 'force_ask',
        reason: `Requested target path matches sensitive file inventory: "${normReqRel}".`,
      };
    }
    if (isSensitiveFile(normRel)) {
      return {
        decision: 'force_ask',
        reason: `Canonical target path resolves to sensitive file: "${normRel}".`,
      };
    }

    return { decision: 'allow' };
  } catch (err) {
    return {
      decision: 'deny',
      reason: `Failed to resolve canonical filesystem path for "${targetRaw}": ${err.message}.`,
    };
  }
}

/**
 * Screens a search scope for sensitive files before a content search reads them.
 * Walks the tree without following links, skips .git and node_modules, and stops
 * after `limit` entries (reported as truncated, which callers treat as unsafe).
 * @param {string} scopeAbs Absolute scope path (file or directory)
 * @param {string} workspaceRootAbs Absolute workspace root
 * @param {number} [limit]
 * @returns {{ found: boolean, path?: string|null, truncated?: boolean }}
 */
export function findSensitiveFileInScope(scopeAbs, workspaceRootAbs, limit = 5000) {
  const stack = [scopeAbs];
  let visited = 0;
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      visited++;
      if (visited > limit) {
        return { found: true, path: null, truncated: true };
      }
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      const rel = path.relative(workspaceRootAbs, fullPath).split(path.sep).join('/');
      if (isSensitiveFile(rel)) {
        return { found: true, path: rel };
      }
      if (entry.isDirectory()) {
        stack.push(fullPath);
      }
    }
  }
  return { found: false };
}

/**
 * Pure scope evaluation unit function for bounded directory search.
 * @param {string} targetDir
 * @param {string} canonicalRoot
 * @returns {{ safe: boolean, reason?: string }}
 */
export function validateScopeBoundary(targetDir, canonicalRoot) {
  if (!targetDir || typeof targetDir !== 'string') {
    return { safe: false, reason: 'Search scope directory is missing or malformed.' };
  }
  if (isSensitiveFile(targetDir)) {
    return { safe: false, reason: `Search scope targets sensitive directory: "${targetDir}".` };
  }
  const resolved = path.resolve(canonicalRoot, targetDir);
  if (!fs.existsSync(resolved)) {
    return { safe: false, reason: `Search scope directory does not exist: "${targetDir}".` };
  }
  try {
    const canonicalScope = canonicalCase(path.normalize(fs.realpathSync.native(resolved)));
    const rel = path.relative(canonicalRoot, canonicalScope);
    if (path.isAbsolute(rel) || rel === '..' || rel.startsWith('../')) {
      return { safe: false, reason: `Search scope resolves outside workspace boundary: "${targetDir}".` };
    }
    return { safe: true };
  } catch (err) {
    return { safe: false, reason: err.message };
  }
}

/**
 * Evaluates PreToolUse file safety decision given a payload.
 * Pure function suitable for unit testing and runtime execution.
 * @param {object} payload
 * @returns {{ decision?: string, reason?: string }}
 */
export function evaluateFileSafety(payload) {
  const toolName = payload.toolCall?.name || payload.tool_name || payload.name || '';
  const args = payload.toolCall?.args || payload.tool_input || payload.args || {};

  // 1. run_command is handled by pre-tool-safety.mjs; allow pass through
  if (toolName === 'run_command') {
    return { decision: 'allow' };
  }

  // 2. Non-filesystem operations allow pass through
  const nonFilesystemTools = [
    'search_web',
    'search_marketplace',
    'list_plugin_accounts',
    'list_resources',
    'manage_task',
    'schedule',
    'send_message',
    'ask_question',
  ];
  if (nonFilesystemTools.includes(toolName)) {
    return { decision: 'allow' };
  }

  // 3. Extract and validate canonical workspace root
  const canonicalRoot = extractCanonicalWorkspaceRoot(payload);
  if (!canonicalRoot) {
    return {
      decision: 'deny',
      reason: 'Cannot establish canonical workspace root from hook payload. Filesystem access is strictly denied.',
    };
  }

  // Raw workspace root string
  let workspaceRoot = (payload.workspacePaths && payload.workspacePaths[0]) || payload.workspaceRoot;
  if (/^file:/i.test(workspaceRoot)) {
    try {
      workspaceRoot = fileURLToPath(new URL(workspaceRoot));
    } catch {
      workspaceRoot = canonicalRoot;
    }
  }

  // 4. Content-reading and discovery tools
  const contentReadingTools = [
    'read_file',
    'view_file',
    'list_dir',
    'dir_list',
    'list_directory',
    'find_by_name',
    'grep_search',
    'read_resource',
  ];

  if (contentReadingTools.includes(toolName)) {
    const targetExtraction = extractReadTargets(toolName, args);

    if (targetExtraction.type === 'UNKNOWN_TARGET') {
      return {
        decision: 'deny',
        reason: targetExtraction.reason || `Target path cannot be established for tool "${toolName}". Access denied.`,
      };
    }

    if (targetExtraction.type === 'EXTERNAL_RESOURCE') {
      return { decision: 'allow' };
    }

    if (targetExtraction.type === 'SINGLE_FILE') {
      return validateCanonicalPath(targetExtraction.targetPath, canonicalRoot, workspaceRoot);
    }

    if (targetExtraction.type === 'DIRECTORY_LISTING' || targetExtraction.type === 'CONTENT_SEARCH') {
      // Same containment and sensitive-path gates as a direct read of the scope itself
      const scopeDecision = validateCanonicalPath(targetExtraction.targetPath, canonicalRoot, workspaceRoot);
      if (scopeDecision.decision !== 'allow' || targetExtraction.type === 'DIRECTORY_LISTING') {
        return scopeDecision;
      }

      // Content search reads file bodies: confirm first if the scope holds sensitive files
      let cleanScope = targetExtraction.targetPath.replace(/^file:\/\/\/?/i, '');
      if (/^\/[a-zA-Z]:/.test(cleanScope)) {
        cleanScope = cleanScope.slice(1);
      }
      const scopeAbs = path.resolve(workspaceRoot, cleanScope);
      const scan = findSensitiveFileInScope(scopeAbs, workspaceRoot);
      if (scan.found) {
        return {
          decision: 'force_ask',
          reason: scan.truncated
            ? `Content search scope "${targetExtraction.targetPath}" is too large to screen for sensitive files. Narrow the scope or confirm.`
            : `Content search scope "${targetExtraction.targetPath}" contains sensitive file "${scan.path}". Narrow the scope or confirm.`,
        };
      }
      return { decision: 'allow' };
    }

    return {
      decision: 'deny',
      reason: `Unsupported target type "${targetExtraction.type}" for tool "${toolName}".`,
    };
  }

  // 5. File mutation operations
  const knownFileMutationTools = [
    'write_file',
    'edit_file',
    'write_to_file',
    'replace_file_content',
    'multi_replace_file_content',
    'append_file',
    'delete_file',
  ];

  const isKnownMutation = knownFileMutationTools.includes(toolName);
  const isGenericMutation =
    /(write|edit|modify|replace|delete|remove|unlink|create|truncate|append|patch)/i.test(toolName) ||
    Boolean(args.Content || args.content || args.Replacement || args.replacement || args.diff || args.patch);

  if (isKnownMutation || isGenericMutation) {
    const targetRaw = extractTargetPath(toolName, args);
    if (!targetRaw) {
      return {
        decision: 'force_ask',
        reason: `Unclassified file mutation tool "${toolName}" cannot reliably determine target path. Interactive confirmation required.`,
      };
    }

    const syntaxError = checkSyntacticPathEscapes(targetRaw);
    if (syntaxError) {
      return { decision: 'deny', reason: syntaxError };
    }

    let cleanTarget = targetRaw.trim().replace(/^file:\/\/\/?/i, '');
    if (/^\/[a-zA-Z]:/.test(cleanTarget)) {
      cleanTarget = cleanTarget.slice(1);
    }

    const requestedResolved = path.resolve(workspaceRoot, cleanTarget);
    const requestedRel = path.relative(workspaceRoot, requestedResolved);
    if (path.isAbsolute(requestedRel)) {
      return {
        decision: 'deny',
        reason: `File mutation outside workspace boundary is strictly prohibited: "${targetRaw}".`,
      };
    }

    const normReqRel = requestedRel.split(path.sep).join('/');
    if (normReqRel === '..' || normReqRel.startsWith('../')) {
      return {
        decision: 'deny',
        reason: `File mutation outside workspace boundary is strictly prohibited: "${targetRaw}".`,
      };
    }

    // Canonical resolution through the nearest existing ancestor, so that new files
    // created beneath a symlink or junction are contained as strictly as existing ones.
    let normCanonicalRel;
    try {
      const canonicalTarget = resolveCanonicalWriteTarget(requestedResolved);
      if (!canonicalTarget) {
        return {
          decision: 'deny',
          reason: `Failed to resolve canonical path for "${targetRaw}": no existing ancestor directory.`,
        };
      }
      const relFromRoot = path.relative(canonicalRoot, canonicalTarget);
      normCanonicalRel = relFromRoot.split(path.sep).join('/');
      if (path.isAbsolute(relFromRoot) || normCanonicalRel === '..' || normCanonicalRel.startsWith('../')) {
        return {
          decision: 'deny',
          reason: `File mutation outside canonical workspace boundary is strictly prohibited: "${targetRaw}".`,
        };
      }
    } catch (err) {
      return {
        decision: 'deny',
        reason: `Failed to resolve canonical path: ${err.message}`,
      };
    }

    // Control plane protection (requested and canonical paths)
    if (isControlPlaneAsset(normReqRel) || isControlPlaneAsset(normCanonicalRel)) {
      return {
        decision: 'force_ask',
        reason: `Modification of framework control-plane asset requires explicit user confirmation: "${normReqRel}".`,
      };
    }

    // Sensitive credential/environment protection (requested and canonical paths)
    if (isSensitiveFile(normReqRel) || isSensitiveFile(normCanonicalRel)) {
      return {
        decision: 'force_ask',
        reason: `Modification of sensitive environment or secret file requires explicit user confirmation: "${normReqRel}".`,
      };
    }

    return { decision: 'allow' };
  }

  // 6. Unrecognized generic tool: fail closed
  return {
    decision: 'force_ask',
    reason: `Unrecognized generic tool "${toolName}" requires interactive confirmation.`,
  };
}

/**
 * Builds a redacted audit-log view of a hook payload.
 * Records only the tool name, its target path, and argument key names, never argument
 * values such as file content, replacements, diffs, or command output.
 * @param {object} payload
 * @returns {{ tool: string, target: string|null, argKeys: string[] }}
 */
export function summarizePayloadForLog(payload) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const toolName = safePayload.toolCall?.name || safePayload.tool_name || safePayload.name || 'unknown';
  const args = safePayload.toolCall?.args || safePayload.tool_input || safePayload.args || {};
  const target = args && typeof args === 'object' ? extractTargetPath(toolName, args) : null;
  return {
    tool: String(toolName),
    target: typeof target === 'string' ? target : null,
    argKeys: args && typeof args === 'object' ? Object.keys(args).sort() : [],
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
    process.stderr.write(`Failed to parse PreToolUse file safety input: ${err.message}\n`);
    process.stdout.write(JSON.stringify({ decision: 'force_ask', reason: 'Malformed input' }) + '\n');
    process.exit(0);
  }

  const artifactDir = payload.artifactDirectoryPath || process.env.ARTIFACT_DIRECTORY_PATH;
  const decisionResult = evaluateFileSafety(payload);

  if (artifactDir) {
    try {
      const logPath = path.join(artifactDir, 'hook-event-log.jsonl');
      fs.appendFileSync(
        logPath,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          input: summarizePayloadForLog(payload),
          decision: decisionResult,
        }) + '\n',
        'utf8'
      );
    } catch {
      // ignore logging errors
    }
  }

  process.stdout.write(JSON.stringify(decisionResult) + '\n');
  process.exit(0);
}

// Execute main if run directly
if (process.argv[1] && process.argv[1].endsWith('pre-file-safety.mjs')) {
  main();
}
