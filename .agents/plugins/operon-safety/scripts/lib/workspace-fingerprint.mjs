import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * Serializes a JavaScript value to deterministic canonical JSON (sorted object keys).
 * @param {*} value
 * @returns {string}
 */
export function serializeCanonical(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(serializeCanonical).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + serializeCanonical(value[k])).join(',') + '}';
}

/**
 * Computes SHA-256 hex digest of a file content.
 * Fails closed on any read error.
 * @param {string} filePath
 * @returns {string}
 */
export function computeFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Checks if a relative path matches any exclusion pattern.
 * @param {string} relPosixPath
 * @param {string[]} exclusions
 * @returns {boolean}
 */
function isExcluded(relPosixPath, exclusions) {
  const normalized = relPosixPath.split(path.sep).join('/');
  for (const pattern of exclusions) {
    const cleanPattern = pattern.split(path.sep).join('/');
    if (normalized === cleanPattern || normalized.startsWith(cleanPattern + '/')) {
      return true;
    }
    // Also check if any segment equals the exclusion pattern (e.g., node_modules, .git)
    const segments = normalized.split('/');
    if (segments.includes(cleanPattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Reads additional fingerprint exclusions from .agents/framework.config.json.
 * Returns an empty list when the config is missing or malformed.
 * @param {string} root
 * @returns {string[]}
 */
export function loadConfiguredExclusions(root) {
  try {
    const configPath = path.join(root, '.agents', 'framework.config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^﻿/, ''));
    const extra = config?.fingerprint?.additionalExclusions;
    return Array.isArray(extra) ? extra.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim()) : [];
  } catch {
    return [];
  }
}

/**
 * Computes complete workspace fingerprint manifest.
 * Traverses deterministically, computes SHA-256 hashes, handles symlinks safely,
 * and produces a composite digest.
 *
 * Default exclusions cover VCS metadata, dependencies, the agent scratch area, and
 * tool caches that test runners rewrite on every run. Projects add more through
 * `fingerprint.additionalExclusions` in .agents/framework.config.json.
 *
 * @param {string} workspaceRoot
 * @param {object} [options]
 * @param {string[]} [options.exclusions] Replaces defaults and configured exclusions entirely
 * @returns {object} Manifest
 */
export function computeWorkspaceFingerprint(workspaceRoot, options = {}) {
  const root = path.resolve(workspaceRoot);
  const defaultExclusions = [
    '.git',
    'node_modules',
    '.agents/scratch',
    '.agents/scratch/tmp',
    '__pycache__',
    '.pytest_cache',
    '.venv',
    '.next',
    '.turbo',
  ];
  const exclusions = options.exclusions || [...defaultExclusions, ...loadConfiguredExclusions(root)];

  const records = [];

  function traverse(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      throw new Error(`Workspace scan failed to read directory ${currentDir}: ${err.message}`);
    }

    // Sort entries by name for stable directory traversal
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(root, fullPath).split(path.sep).join('/');

      if (isExcluded(relPath, exclusions)) {
        continue;
      }

      let stat;
      try {
        stat = fs.lstatSync(fullPath);
      } catch (err) {
        throw new Error(`Workspace scan failed to stat ${fullPath}: ${err.message}`);
      }

      if (stat.isSymbolicLink()) {
        try {
          const rawTarget = fs.readlinkSync(fullPath);
          const targetHash = crypto.createHash('sha256').update(rawTarget, 'utf8').digest('hex');
          const resolvedTarget = path.resolve(path.dirname(fullPath), rawTarget);

          // Case-insensitive containment check for Windows portability
          const normRoot = root.toLowerCase();
          const normTarget = resolvedTarget.toLowerCase();
          const isInside = normTarget === normRoot || normTarget.startsWith(normRoot + path.sep.toLowerCase());

          let exists = false;
          try {
            exists = fs.existsSync(resolvedTarget);
          } catch {
            exists = false;
          }

          let symlinkType = 'symlink_broken';
          if (isInside) {
            symlinkType = exists ? 'symlink_internal' : 'symlink_broken';
          } else {
            symlinkType = exists ? 'symlink_external' : 'symlink_broken';
          }

          records.push({
            path: relPath,
            sha256: targetHash,
            type: symlinkType,
          });
        } catch (err) {
          throw new Error(`Workspace scan failed processing symlink ${fullPath}: ${err.message}`);
        }
      } else if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile()) {
        try {
          const fileHash = computeFileHash(fullPath);
          records.push({
            path: relPath,
            sha256: fileHash,
            type: 'file',
          });
        } catch (err) {
          throw new Error(`Workspace scan failed hashing file ${fullPath}: ${err.message}`);
        }
      }
    }
  }

  traverse(root);

  // Deterministic UTF-8 code point sort
  records.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  // Composite digest over canonical JSON of the sorted records
  const canonicalRecords = serializeCanonical(records);
  const compositeDigest = crypto.createHash('sha256').update(canonicalRecords, 'utf8').digest('hex');

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    workspaceRoot: root.split(path.sep).join('/'),
    compositeDigest,
    fileCount: records.length,
    records,
  };
}

/**
 * Computes difference between two workspace manifests.
 * @param {object} baselineManifest
 * @param {object} currentManifest
 * @returns {object} Diff report
 */
export function diffManifests(baselineManifest, currentManifest) {
  const baselineMap = new Map();
  for (const r of baselineManifest.records || []) {
    baselineMap.set(r.path, r);
  }

  const currentMap = new Map();
  for (const r of currentManifest.records || []) {
    currentMap.set(r.path, r);
  }

  const added = [];
  const removed = [];
  const modified = [];

  for (const [p, curr] of currentMap.entries()) {
    if (!baselineMap.has(p)) {
      added.push(curr);
    } else {
      const base = baselineMap.get(p);
      if (base.sha256 !== curr.sha256 || base.type !== curr.type) {
        modified.push({
          path: p,
          oldSha256: base.sha256,
          newSha256: curr.sha256,
          oldType: base.type,
          newType: curr.type,
        });
      }
    }
  }

  for (const [p, base] of baselineMap.entries()) {
    if (!currentMap.has(p)) {
      removed.push(base);
    }
  }

  // Sort diffs deterministically
  added.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  removed.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  modified.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  return {
    added,
    removed,
    modified,
    totalChanges: added.length + removed.length + modified.length,
  };
}

// CLI entry point support
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  let targetRoot = process.cwd();
  if (args.includes('--root')) {
    targetRoot = args[args.indexOf('--root') + 1];
  }
  const manifest = computeWorkspaceFingerprint(targetRoot);
  if (args.includes('--json')) {
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    console.log(`Fingerprint for: ${manifest.workspaceRoot}`);
    console.log(`File count: ${manifest.fileCount}`);
    console.log(`Composite digest: ${manifest.compositeDigest}`);
  }
}
