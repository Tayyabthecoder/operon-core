import fs from 'node:fs';
import path from 'node:path';
import { computeWorkspaceFingerprint, diffManifests } from '../lib/workspace-fingerprint.mjs';

const DEFAULT_STOP_GATE_POLICY = {
  frameworkOnlyProfiles: ['framework-validator'],
  frameworkPathPrefixes: ['.agents/', 'docs/'],
};

/**
 * Loads the stop gate verification policy from .agents/framework.config.json,
 * falling back to built-in defaults for any missing or malformed field.
 * @param {string} workspaceRoot
 * @returns {{ frameworkOnlyProfiles: string[], frameworkPathPrefixes: string[] }}
 */
function loadStopGatePolicy(workspaceRoot) {
  const policy = { ...DEFAULT_STOP_GATE_POLICY };
  try {
    const configPath = path.join(workspaceRoot, '.agents', 'framework.config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^﻿/, ''));
    const stopGate = config.stopGate || {};
    if (Array.isArray(stopGate.frameworkOnlyProfiles)) {
      policy.frameworkOnlyProfiles = stopGate.frameworkOnlyProfiles.filter((p) => typeof p === 'string');
    }
    if (Array.isArray(stopGate.frameworkPathPrefixes)) {
      policy.frameworkPathPrefixes = stopGate.frameworkPathPrefixes.filter((p) => typeof p === 'string');
    }
  } catch {
    // Missing or unreadable config: keep defaults
  }
  return policy;
}

/**
 * Returns true when a changed path is framework or documentation material
 * (configured prefixes, or a Markdown file at the workspace root).
 * @param {string} relPosixPath
 * @param {string[]} prefixes
 * @returns {boolean}
 */
function isFrameworkScopePath(relPosixPath, prefixes) {
  const normalized = relPosixPath.toLowerCase();
  if (!normalized.includes('/') && normalized.endsWith('.md')) return true;
  return prefixes.some((prefix) => normalized.startsWith(prefix.toLowerCase()));
}

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

async function main() {
  let payload = {};
  try {
    const rawInput = await readStdin();
    if (rawInput.trim()) {
      payload = JSON.parse(rawInput);
    }
  } catch (err) {
    process.stderr.write(`Failed to parse Stop hook input: ${err.message}\n`);
    process.stdout.write(JSON.stringify({}) + '\n');
    process.exit(0);
  }

  // Resolve workspace root and artifact directory
  let workspaceRoot = (payload.workspacePaths && payload.workspacePaths[0]) || payload.workspaceRoot;
  if (!workspaceRoot) {
    const cwd = process.cwd();
    workspaceRoot = cwd.endsWith('.agents') ? path.dirname(cwd) : cwd;
  }
  workspaceRoot = path.resolve(workspaceRoot);

  const artifactDir = payload.artifactDirectoryPath || process.env.ARTIFACT_DIRECTORY_PATH;

  function emitResponse(resp) {
    if (artifactDir) {
      try {
        const logPath = path.join(artifactDir, 'stop-event-log.jsonl');
        fs.appendFileSync(
          logPath,
          JSON.stringify({
            timestamp: new Date().toISOString(),
            input: {
              terminationReason: typeof payload.terminationReason === 'string' ? payload.terminationReason : null,
              fullyIdle: typeof payload.fullyIdle === 'boolean' ? payload.fullyIdle : null,
            },
            output: resp,
          }) + '\n',
          'utf8'
        );
      } catch {
        // ignore logging error
      }
    }
    process.stdout.write(JSON.stringify(resp) + '\n');
    process.exit(0);
  }

  // 1. If background tasks are still active, keep going
  if (payload.fullyIdle === false) {
    emitResponse({
      decision: 'continue',
      reason: 'Background tasks are still running. Awaiting completion before stopping.',
    });
  }

  // 2. Preserve explicit failures and user cancellations
  const terminationReason = payload.terminationReason || '';
  const nonContinuableReasons = [
    'ERROR',
    'error',
    'USER_CANCELED',
    'user_canceled',
    'MAX_INVOCATIONS',
    'max_invocations',
    'MAX_TOKEN_BUDGET_EXCEEDED',
    'TERMINAL_STEP_TYPE',
    'TERMINAL_CUSTOM_HOOK',
  ];

  if (nonContinuableReasons.includes(terminationReason)) {
    emitResponse({});
  }

  if (!artifactDir) {
    // Cannot inspect baseline without artifact directory, allow stop
    emitResponse({});
  }

  const baselinePath = path.join(artifactDir, 'session-baseline.json');
  if (!fs.existsSync(baselinePath)) {
    // No baseline manifest found, allow stop
    emitResponse({});
  }

  let baselineManifest;
  try {
    baselineManifest = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  } catch (err) {
    process.stderr.write(`Failed to read session baseline: ${err.message}\n`);
    emitResponse({});
  }

  // Compute current workspace fingerprint
  let currentManifest;
  try {
    currentManifest = computeWorkspaceFingerprint(workspaceRoot);
  } catch (err) {
    process.stderr.write(`Failed to compute current workspace fingerprint: ${err.message}\n`);
    emitResponse({});
  }

  // Compute diff between baseline and current state
  const diff = diffManifests(baselineManifest, currentManifest);

  if (diff.totalChanges === 0) {
    // Clean workspace, no modifications made
    emitResponse({});
  }

  // 4. Modifications detected: Check for matching valid verification evidence
  const evidencePath = path.join(artifactDir, 'verification-evidence.json');
  let evidenceRejection = '';
  if (fs.existsSync(evidencePath)) {
    try {
      const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
      if (
        evidence.passed === true &&
        evidence.dirtyExecution === false &&
        evidence.postFingerprint === currentManifest.compositeDigest &&
        typeof evidence.profile === 'string'
      ) {
        // Evidence must come from a profile that actually covers the changed files:
        // framework-only profiles cannot verify changes outside framework/docs paths.
        const policy = loadStopGatePolicy(workspaceRoot);
        const changedPaths = [...diff.added, ...diff.removed, ...diff.modified].map((r) => r.path);
        const outOfScope = changedPaths.filter((p) => !isFrameworkScopePath(p, policy.frameworkPathPrefixes));
        if (policy.frameworkOnlyProfiles.includes(evidence.profile) && outOfScope.length > 0) {
          evidenceRejection = ` Verification profile "${evidence.profile}" only validates the framework and cannot verify ${outOfScope.length} changed project file(s) (e.g. "${outOfScope[0]}"); run a project test profile (node-test, npm-test, pytest).`;
        } else {
          // Valid verification evidence matching current workspace state
          emitResponse({});
        }
      }
    } catch (err) {
      process.stderr.write(`Failed to parse verification evidence: ${err.message}\n`);
    }
  }

  // 5. Missing or invalid evidence: Manage bounded retry loop (max 2 cycles)
  const retryStatePath = path.join(artifactDir, 'stop-retry-state.json');
  let retryCount = 0;
  if (fs.existsSync(retryStatePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(retryStatePath, 'utf8'));
      retryCount = state.retryCount || 0;
      // A tripped circuit breaker only covers the workspace state it tripped on.
      // New modifications after the trip re-arm the gate with a fresh retry budget.
      if (state.circuitBreakerTriggered === true && state.fingerprint !== currentManifest.compositeDigest) {
        retryCount = 0;
      }
    } catch {
      retryCount = 0;
    }
  }

  if (retryCount < 2) {
    retryCount++;
    try {
      fs.writeFileSync(
        retryStatePath,
        JSON.stringify(
          {
            retryCount,
            lastAttempt: new Date().toISOString(),
            status: 'RETRYING',
            unverifiedChanges: diff.totalChanges,
            fingerprint: currentManifest.compositeDigest,
          },
          null,
          2
        ),
        'utf8'
      );
    } catch {
      // ignore write error
    }

    emitResponse({
      decision: 'continue',
      reason: `Filesystem modifications detected (${diff.totalChanges} files changed: ${diff.added.length} added, ${diff.modified.length} modified, ${diff.removed.length} removed) without matching valid verification evidence.${evidenceRejection} Run verification via verify-runner.mjs before concluding.`,
    });
  }

  // 6. Retry budget exhausted (>= 2 cycles): Circuit breaker triggered
  try {
    fs.writeFileSync(
      retryStatePath,
      JSON.stringify(
        {
          retryCount,
          lastAttempt: new Date().toISOString(),
          status: 'UNVERIFIED',
          unverifiedChanges: diff.totalChanges,
          fingerprint: currentManifest.compositeDigest,
          circuitBreakerTriggered: true,
          warning: `WARNING: Stop gate circuit breaker triggered after ${retryCount} retries. Workspace contains ${diff.totalChanges} unverified changes. Manual review required.`,
        },
        null,
        2
      ),
      'utf8'
    );
  } catch {
    // ignore write error
  }

  process.stderr.write(
    `WARNING: Stop gate circuit breaker triggered after ${retryCount} retries. Workspace contains ${diff.totalChanges} unverified changes. Manual review required.\n`
  );

  // Allow stop to prevent infinite lock
  emitResponse({});
}

main();
