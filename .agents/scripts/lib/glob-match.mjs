/**
 * Minimal glob matcher for rule `paths:` patterns.
 *
 * Supports the subset the framework's rules use: `**` (any depth), `*` (within one path segment),
 * and `?`. Braces and character classes are intentionally unsupported (rules use brace-free lists).
 * This approximates Claude Code's matcher; it is not Claude Code's own implementation.
 */

/**
 * @param {string} glob
 * @returns {RegExp}
 */
export function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') {
        out += '(?:.*/)?';
        i += 2;
      } else {
        out += '.*';
        i += 1;
      }
    } else if (ch === '*') {
      out += '[^/]*';
    } else if (ch === '?') {
      out += '[^/]';
    } else {
      out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${out}$`);
}

/**
 * @param {string} filePath Workspace-relative path, either separator style
 * @returns {string}
 */
export function normalizeRelativePath(filePath) {
  return String(filePath).replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * @param {string[]} globs
 * @param {string} filePath
 * @returns {boolean}
 */
export function matchesAnyGlob(globs, filePath) {
  const normalized = normalizeRelativePath(filePath);
  return globs.some((glob) => globToRegExp(glob).test(normalized));
}
