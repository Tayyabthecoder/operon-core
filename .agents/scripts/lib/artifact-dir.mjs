import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

/**
 * Resolves the default per-workspace artifact directory used when the host does not
 * provide one (e.g. Claude Code). It lives in the OS temp directory, outside the
 * workspace, so agent file tools cannot forge verification evidence through it and
 * it never affects the workspace fingerprint.
 * @param {string} workspaceRoot
 * @returns {string}
 */
export function resolveDefaultArtifactDir(workspaceRoot) {
  let key = path.resolve(workspaceRoot);
  if (process.platform === 'win32') {
    key = key.toLowerCase();
  }
  const id = crypto.createHash('sha256').update(key, 'utf8').digest('hex').slice(0, 16);
  return path.join(os.tmpdir(), 'agent-framework', id);
}
