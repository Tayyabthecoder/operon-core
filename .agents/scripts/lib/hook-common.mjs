import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Helpers shared by the lifecycle hooks and the Claude Code adapter.
 */

/**
 * Reads all content from stdin as a string.
 * @returns {Promise<string>}
 */
export function readStdin() {
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
 * Normalizes the case of a canonical filesystem path for comparison. Windows and macOS file
 * systems are case-insensitive by default, so paths are lowercased there. Elsewhere (Linux) case
 * is significant: lowercasing would make real directories unreachable and equate distinct ones.
 * @param {string} canonicalPath
 * @returns {string}
 */
export function canonicalCase(canonicalPath) {
  return process.platform === 'win32' || process.platform === 'darwin' ? canonicalPath.toLowerCase() : canonicalPath;
}

/**
 * Replaces double-quoted segments of a policy reason with a placeholder. Reasons embed the
 * offending command line or path in quotes, and audit logs must never record argument values.
 * @param {unknown} reason
 * @returns {string|undefined}
 */
export function redactReason(reason) {
  if (typeof reason !== 'string') return undefined;
  return reason.replace(/"[^"]*"/g, '"…"');
}

/**
 * Picks the workspace root string from a hook payload without touching the filesystem.
 * A single `workspacePaths` entry wins; several entries need an explicit `workspaceRoot`
 * to disambiguate. `file:` URIs are converted to paths, and remote authorities are rejected.
 * @param {object} payload
 * @returns {string|null} Root path as supplied (not canonicalized), or null if unestablished
 */
export function extractRawWorkspaceRoot(payload) {
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

  return candidateRaw;
}

/**
 * Extracts and canonicalizes the workspace root strictly from the hook payload.
 * Rejects relative paths before resolve, rejects remote URI authorities,
 * disambiguates multi-root payloads, and ensures the target is an existing directory.
 * @param {object} payload
 * @returns {string|null} Canonical workspace root (lowercased where the file system is case-insensitive), or null if unestablished
 */
export function extractCanonicalWorkspaceRoot(payload) {
  const candidateRaw = extractRawWorkspaceRoot(payload);
  if (!candidateRaw) {
    return null;
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
    return canonicalCase(path.normalize(realRoot));
  } catch {
    return null;
  }
}
