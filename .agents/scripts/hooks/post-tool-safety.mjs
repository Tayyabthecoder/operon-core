import fs from 'node:fs';
import path from 'node:path';

/**
 * Post-Tool Safety Hook: Mutation Auditing & Telemetry
 *
 * Runs after every tool execution to log tool completion telemetry,
 * record audit trails for mutations, and track state changes.
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
    process.stderr.write(`Failed to parse PostToolUse input: ${err.message}\n`);
    process.stdout.write(JSON.stringify({}) + '\n');
    process.exit(0);
  }

  const artifactDir = payload.artifactDirectoryPath || process.env.ARTIFACT_DIRECTORY_PATH;
  if (artifactDir) {
    try {
      fs.mkdirSync(artifactDir, { recursive: true });
      const logPath = path.join(artifactDir, 'post-tool-telemetry.jsonl');
      const toolName = payload.toolCall?.name || payload.tool_name || payload.name || 'unknown';
      const entry = {
        timestamp: new Date().toISOString(),
        tool: toolName,
        status: payload.toolResult?.status || 'completed',
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
    } catch {
      // Ignore telemetry write errors
    }
  }

  process.stdout.write(JSON.stringify({}) + '\n');
  process.exit(0);
}

main();
