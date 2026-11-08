import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeWorkspaceFingerprint, diffManifests } from './lib/workspace-fingerprint.mjs';
import { resolveDefaultArtifactDir } from './lib/artifact-dir.mjs';

/**
 * Resolves the executable and arguments for a given profile.
 * @param {string} profile
 * @param {string[]} extraArgs
 * @param {string} workspaceRoot
 * @returns {{ executable: string, args: string[] }}
 */
function resolveProfileCommand(profile, extraArgs, workspaceRoot) {
  switch (profile) {
    case 'framework-validator': {
      const scriptPath = path.join(workspaceRoot, '.agents/scripts/validate-framework.mjs');
      return {
        executable: process.execPath,
        args: [scriptPath, ...extraArgs],
      };
    }
    case 'node-test': {
      return {
        executable: process.execPath,
        args: ['--test', ...extraArgs],
      };
    }
    case 'npm-test': {
      // Cross-platform Windows safe invocation without shell: true
      const npmCliPath = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
      if (fs.existsSync(npmCliPath)) {
        return {
          executable: process.execPath,
          args: [npmCliPath, 'test', ...extraArgs],
        };
      }
      return {
        executable: process.platform === 'win32' ? 'npm.cmd' : 'npm',
        args: ['test', ...extraArgs],
      };
    }
    case 'pytest': {
      return {
        executable: 'pytest',
        args: [...extraArgs],
      };
    }
    default:
      throw new Error(`Unsupported verification profile: "${profile}". Valid profiles: framework-validator, node-test, npm-test, pytest.`);
  }
}

/**
 * Executes a command safely via child_process.spawn with shell: false.
 * @param {string} executable
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ exitCode: number, stdout: string, stderr: string }>}
 */
function runCommand(executable, args, cwd) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(executable, args, {
      cwd,
      shell: false,
      env: process.env,
    });

    child.stdout.on('data', (chunk) => {
      const str = chunk.toString();
      stdout += str;
      process.stdout.write(str);
    });

    child.stderr.on('data', (chunk) => {
      const str = chunk.toString();
      stderr += str;
      process.stderr.write(str);
    });

    child.on('error', (err) => {
      const errMsg = `Spawn error: ${err.message}\n`;
      stderr += errMsg;
      process.stderr.write(errMsg);
      resolve({ exitCode: 1, stdout, stderr });
    });

    child.on('close', (code) => {
      resolve({ exitCode: code ?? 0, stdout, stderr });
    });
  });
}

/**
 * Parses command-line arguments.
 * @param {string[]} argv
 */
function parseArgs(argv) {
  let profile = null;
  let artifactDir = process.env.ARTIFACT_DIRECTORY_PATH || null;
  let workspaceRoot = process.cwd();
  const extraArgs = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--profile' && i + 1 < argv.length) {
      profile = argv[++i];
    } else if (arg === '--artifactDir' && i + 1 < argv.length) {
      artifactDir = argv[++i];
    } else if (arg === '--workspace' && i + 1 < argv.length) {
      workspaceRoot = argv[++i];
    } else if (arg === '--') {
      extraArgs.push(...argv.slice(i + 1));
      break;
    } else {
      extraArgs.push(arg);
    }
  }

  return { profile, artifactDir, workspaceRoot, extraArgs };
}

async function main() {
  const { profile, artifactDir: requestedArtifactDir, workspaceRoot: rawWorkspace, extraArgs } = parseArgs(process.argv.slice(2));

  if (!profile) {
    console.error('Usage: node .agents/scripts/verify-runner.mjs --profile <profile> [--artifactDir <dir>] [--workspace <dir>] [-- <args...>]');
    console.error('Available profiles: framework-validator, node-test, npm-test, pytest');
    process.exit(1);
  }

  let workspaceRoot = path.resolve(rawWorkspace);
  if (workspaceRoot.endsWith('.agents')) {
    workspaceRoot = path.dirname(workspaceRoot);
  }

  // Hosts without an artifact directory (e.g. Claude Code via the adapter) share a
  // per-workspace default outside the workspace, which the Stop gate also reads.
  const artifactDir = requestedArtifactDir || resolveDefaultArtifactDir(workspaceRoot);

  console.log(`\n=== Verification Runner ===`);
  console.log(`Profile: ${profile}`);
  console.log(`Workspace: ${workspaceRoot}`);
  if (artifactDir) {
    console.log(`Artifact Directory: ${artifactDir}`);
  }

  // 1. Pre-execution workspace fingerprint
  console.log(`Computing pre-execution workspace fingerprint...`);
  const preFingerprint = computeWorkspaceFingerprint(workspaceRoot);
  console.log(`Pre-execution digest: ${preFingerprint.compositeDigest} (${preFingerprint.fileCount} files)`);

  // 2. Resolve command
  let cmd;
  try {
    cmd = resolveProfileCommand(profile, extraArgs, workspaceRoot);
  } catch (err) {
    console.error(`Profile resolution error: ${err.message}`);
    process.exit(1);
  }

  console.log(`Executing: ${cmd.executable} ${cmd.args.join(' ')}\n`);

  // 3. Execute test command
  const startTime = Date.now();
  const result = await runCommand(cmd.executable, cmd.args, workspaceRoot);
  const durationMs = Date.now() - startTime;

  console.log(`\nExecution finished in ${durationMs}ms with exit code ${result.exitCode}.`);

  // 4. Post-execution workspace fingerprint
  console.log(`Computing post-execution workspace fingerprint...`);
  const postFingerprint = computeWorkspaceFingerprint(workspaceRoot);
  console.log(`Post-execution digest: ${postFingerprint.compositeDigest} (${postFingerprint.fileCount} files)`);

  // 5. Dirty execution check
  const isDirty = postFingerprint.compositeDigest !== preFingerprint.compositeDigest;
  let diff = null;
  if (isDirty) {
    diff = diffManifests(preFingerprint, postFingerprint);
    console.warn(`[WARNING] DIRTY EXECUTION DETECTED! Filesystem mutations occurred during test execution:`);
    console.warn(`  Total mutations: ${diff.totalChanges} (${diff.added.length} added, ${diff.modified.length} modified, ${diff.removed.length} removed)`);
  } else {
    console.log(`[PASS] Clean execution: No filesystem mutations detected during test run.`);
  }

  // 6. Evaluate pass condition
  let passed = result.exitCode === 0 && !isDirty;

  // Additional structured validation per profile
  if (profile === 'framework-validator' && !result.stdout.includes('Validation SUCCEEDED')) {
    passed = false;
  }

  const summary = passed
    ? `Profile "${profile}" passed verification cleanly in ${durationMs}ms.`
    : isDirty
    ? `Profile "${profile}" failed: DIRTY EXECUTION detected (${diff.totalChanges} mutated files).`
    : `Profile "${profile}" failed with exit code ${result.exitCode}.`;

  console.log(`Result: ${passed ? 'PASSED' : 'FAILED'} — ${summary}\n`);

  // 7. Store verification evidence if artifact directory is provided
  if (artifactDir) {
    try {
      fs.mkdirSync(artifactDir, { recursive: true });
      const evidence = {
        timestamp: new Date().toISOString(),
        profile,
        command: `${cmd.executable} ${cmd.args.join(' ')}`,
        exitCode: result.exitCode,
        passed,
        dirtyExecution: isDirty,
        diff,
        preFingerprint: preFingerprint.compositeDigest,
        postFingerprint: postFingerprint.compositeDigest,
        summary,
        durationMs,
      };
      const evidencePath = path.join(artifactDir, 'verification-evidence.json');
      fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');
      console.log(`Saved verification evidence to: ${evidencePath}`);
    } catch (err) {
      console.error(`Failed to record verification evidence: ${err.message}`);
    }
  }

  process.exit(passed ? 0 : 1);
}

main();
