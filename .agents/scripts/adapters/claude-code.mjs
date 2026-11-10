import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluateFileSafety, summarizePayloadForLog } from '../hooks/pre-file-safety.mjs';
import { evaluateCommandSafety } from '../hooks/pre-tool-safety.mjs';
import { resolveDefaultArtifactDir } from '../lib/artifact-dir.mjs';
import { readStdin, redactReason } from '../lib/hook-common.mjs';

/**
 * Claude Code Adapter
 *
 * Translates Claude Code hook payloads (tool_name / tool_input) into the framework's
 * host-neutral payload shape (toolCall.name / toolCall.args), runs the unchanged core
 * policy, and translates decisions back into Claude Code hook output.
 *
 * Usage (from .claude/settings.json):
 *   node "$CLAUDE_PROJECT_DIR/.agents/scripts/adapters/claude-code.mjs" <session-start|pre-tool-use|post-tool-use|stop>
 *
 * Decision mapping for PreToolUse:
 *   allow     -> no output (Claude Code's own permission settings still apply)
 *   force_ask -> permissionDecision "ask"
 *   deny      -> permissionDecision "deny"
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hooksDir = path.resolve(__dirname, '..', 'hooks');

/**
 * Resolves the project root: CLAUDE_PROJECT_DIR, else the payload cwd.
 * @param {object} ccPayload
 * @returns {string}
 */
export function resolveProjectDir(ccPayload) {
  return path.resolve(process.env.CLAUDE_PROJECT_DIR || ccPayload?.cwd || process.cwd());
}

/**
 * Picks the command working directory to report: the project root when the shell is
 * at or inside it (the core policy anchors commands to the root), otherwise the real cwd
 * so the core policy denies execution outside the workspace.
 * @param {string|undefined} cwd
 * @param {string} projectDir
 * @returns {string}
 */
function commandCwd(cwd, projectDir) {
  if (!cwd) return projectDir;
  const rel = path.relative(projectDir, path.resolve(cwd));
  const inside = rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  return inside ? projectDir : cwd;
}

/**
 * Translates a Claude Code tool call into a framework tool call.
 * Returns null for tools the framework does not govern (web, MCP, agents, etc.),
 * which are left to Claude Code's own permission settings.
 * @param {string} toolName
 * @param {object} toolInput
 * @param {{ projectDir: string, cwd?: string }} context
 * @returns {{ name: string, args: object } | null}
 */
export function translateToolCall(toolName, toolInput, context) {
  const input = toolInput && typeof toolInput === 'object' ? toolInput : {};
  const { projectDir, cwd } = context;

  switch (toolName) {
    case 'Bash':
    case 'PowerShell':
      return {
        name: 'run_command',
        args: {
          CommandLine: input.command,
          toolSummary: typeof input.description === 'string' && input.description.trim() ? input.description : `Claude Code ${toolName} command`,
          WaitMsBeforeAsync: 5000,
          IsDaemon: input.run_in_background === true,
          Cwd: commandCwd(cwd, projectDir),
        },
      };
    case 'Write':
      return { name: 'write_file', args: { Path: input.file_path, Content: input.content } };
    case 'Edit':
    case 'MultiEdit':
      return { name: 'edit_file', args: { Path: input.file_path, Replacement: input.new_string ?? '' } };
    case 'NotebookEdit':
      return { name: 'edit_file', args: { Path: input.notebook_path, Replacement: input.new_source ?? '' } };
    case 'Read':
      return { name: 'read_file', args: { Path: input.file_path } };
    case 'Grep':
      return { name: 'grep_search', args: { SearchPath: input.path || projectDir, Query: input.pattern } };
    case 'Glob':
      return { name: 'find_by_name', args: { SearchDirectory: input.path || projectDir, Pattern: input.pattern } };
    case 'LS':
      return { name: 'list_dir', args: { DirectoryPath: input.path || projectDir } };
    default:
      return null;
  }
}

/**
 * Maps a framework decision to Claude Code PreToolUse output (null = no output).
 * @param {{ decision?: string, reason?: string }} result
 * @returns {object|null}
 */
export function toClaudePreToolOutput(result) {
  const decision = result?.decision;
  if (decision === 'deny' || decision === 'force_ask') {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision === 'deny' ? 'deny' : 'ask',
        permissionDecisionReason: `[agent-framework] ${result.reason || 'Blocked by framework safety policy.'}`,
      },
    };
  }
  return null;
}

/**
 * Evaluates a Claude Code PreToolUse payload against the framework core policy.
 * @param {object} ccPayload
 * @returns {object|null} Claude Code hook output, or null to defer to Claude Code
 */
export function evaluateClaudePreToolUse(ccPayload) {
  const evaluated = evaluateClaudePreToolDecision(ccPayload);
  return evaluated ? toClaudePreToolOutput(evaluated.result) : null;
}

/**
 * Evaluates a Claude Code PreToolUse payload and returns the translated tool call with the
 * raw framework decision, so callers can both answer Claude Code and write an audit entry.
 * @param {object} ccPayload
 * @returns {{ toolCall: object, result: { decision?: string, reason?: string } }|null} null for ungoverned tools
 */
export function evaluateClaudePreToolDecision(ccPayload) {
  const projectDir = resolveProjectDir(ccPayload);
  const toolCall = translateToolCall(ccPayload?.tool_name, ccPayload?.tool_input, { projectDir, cwd: ccPayload?.cwd });
  if (!toolCall) return null;

  const frameworkPayload = { toolCall, workspacePaths: [projectDir] };
  const result = toolCall.name === 'run_command' ? evaluateCommandSafety(frameworkPayload) : evaluateFileSafety(frameworkPayload);
  return { toolCall, result };
}

/**
 * Appends a redacted audit entry (tool, target, argument key names, decision, redacted reason)
 * to hook-event-log.jsonl. Argument values such as command lines and file contents are never
 * recorded. Logging failures never affect the decision.
 * @param {string} artifactDir
 * @param {{ toolCall: object, result: { decision?: string, reason?: string } }} evaluated
 */
function logPreToolDecision(artifactDir, evaluated) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      input: summarizePayloadForLog({ toolCall: evaluated.toolCall }),
      decision: { decision: evaluated.result?.decision || 'allow', reason: redactReason(evaluated.result?.reason) },
    };
    fs.appendFileSync(path.join(artifactDir, 'hook-event-log.jsonl'), JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    // Ignore audit log write errors
  }
}

/**
 * Runs one of the framework's stdin/stdout hook scripts with a translated payload.
 * @param {string} script
 * @param {object} payload
 * @returns {object}
 */
function runCoreHook(script, payload) {
  const res = spawnSync(process.execPath, [path.join(hooksDir, script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  if (res.stderr) process.stderr.write(res.stderr);
  try {
    return JSON.parse((res.stdout || '').trim() || '{}');
  } catch {
    return {};
  }
}

async function main() {
  const event = process.argv[2];
  let ccPayload = {};
  try {
    const raw = await readStdin();
    if (raw.trim()) ccPayload = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`[agent-framework] Failed to parse Claude Code hook input: ${err.message}\n`);
    if (event === 'pre-tool-use') {
      process.stdout.write(JSON.stringify(toClaudePreToolOutput({ decision: 'force_ask', reason: 'Malformed hook input.' })) + '\n');
    }
    process.exit(0);
  }

  const projectDir = resolveProjectDir(ccPayload);
  const artifactDir = resolveDefaultArtifactDir(projectDir);
  fs.mkdirSync(artifactDir, { recursive: true });

  if (event === 'pre-tool-use') {
    const evaluated = evaluateClaudePreToolDecision(ccPayload);
    if (evaluated) {
      logPreToolDecision(artifactDir, evaluated);
      const output = toClaudePreToolOutput(evaluated.result);
      if (output) process.stdout.write(JSON.stringify(output) + '\n');
    }
    process.exit(0);
  }

  if (event === 'post-tool-use') {
    const toolCall = translateToolCall(ccPayload.tool_name, ccPayload.tool_input, { projectDir, cwd: ccPayload.cwd });
    runCoreHook('post-tool-safety.mjs', {
      toolCall: { name: toolCall ? toolCall.name : String(ccPayload.tool_name || 'unknown') },
      artifactDirectoryPath: artifactDir,
    });
    process.exit(0);
  }

  if (event === 'session-start') {
    const out = runCoreHook('session-start.mjs', { workspacePaths: [projectDir], artifactDirectoryPath: artifactDir });
    const message = out?.injectSteps?.[0]?.systemMessage?.systemMessage;
    if (message) {
      process.stdout.write(
        JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: `[agent-framework] ${message}` } }) + '\n'
      );
    }
    process.exit(0);
  }

  if (event === 'stop') {
    const out = runCoreHook('stop-gate.mjs', {
      fullyIdle: true,
      terminationReason: '',
      workspacePaths: [projectDir],
      artifactDirectoryPath: artifactDir,
    });
    if (out?.decision === 'continue') {
      process.stdout.write(JSON.stringify({ decision: 'block', reason: `[agent-framework] ${out.reason}` }) + '\n');
    }
    process.exit(0);
  }

  process.stderr.write(`[agent-framework] Unknown adapter event "${event}". Expected session-start, pre-tool-use, post-tool-use, or stop.\n`);
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
