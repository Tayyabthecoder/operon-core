import fs from 'node:fs';
import path from 'node:path';
import { computeWorkspaceFingerprint } from '../lib/workspace-fingerprint.mjs';
import { readStdin } from '../lib/hook-common.mjs';

async function main() {
  let payload = {};
  try {
    const rawInput = await readStdin();
    if (rawInput.trim()) {
      payload = JSON.parse(rawInput);
    }
  } catch (err) {
    // If stdin parsing fails, fall back gracefully
    process.stderr.write(`Failed to parse SessionStart input: ${err.message}\n`);
  }

  // Determine workspace root
  let workspaceRoot = (payload.workspacePaths && payload.workspacePaths[0]) || payload.workspaceRoot;
  if (!workspaceRoot) {
    const cwd = process.cwd();
    workspaceRoot = cwd.endsWith('.agents') ? path.dirname(cwd) : cwd;
  }
  workspaceRoot = path.resolve(workspaceRoot);

  // Determine artifact directory
  const artifactDir = payload.artifactDirectoryPath || process.env.ARTIFACT_DIRECTORY_PATH;

  if (!artifactDir) {
    const response = {
      injectSteps: [
        {
          systemMessage: {
            systemMessage: 'Session baseline skipped: artifactDirectoryPath not provided.',
          },
        },
      ],
    };
    process.stdout.write(JSON.stringify(response) + '\n');
    process.exit(0);
  }

  try {
    fs.mkdirSync(artifactDir, { recursive: true });

    // Compute baseline workspace fingerprint
    const baseline = computeWorkspaceFingerprint(workspaceRoot);
    const baselinePath = path.join(artifactDir, 'session-baseline.json');
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2), 'utf8');

    // Clean or reset any previous retry state
    const retryStatePath = path.join(artifactDir, 'stop-retry-state.json');
    if (fs.existsSync(retryStatePath)) {
      try {
        fs.unlinkSync(retryStatePath);
      } catch {
        // ignore cleanup error
      }
    }

    const response = {
      injectSteps: [
        {
          systemMessage: {
            systemMessage: `Session baseline established. Workspace fingerprint: ${baseline.compositeDigest} (${baseline.fileCount} tracked files). Filesystem change verification is active.`,
          },
        },
      ],
    };
    process.stdout.write(JSON.stringify(response) + '\n');
    process.exit(0);
  } catch (err) {
    const errorResponse = {
      injectSteps: [
        {
          systemMessage: {
            systemMessage: `Session baseline initialization warning: ${err.message}`,
          },
        },
      ],
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
    process.exit(0);
  }
}

main();
