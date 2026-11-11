import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildDriftReport } from './ecc-drift.mjs';
import { validateMcpPolicy } from './lib/mcp-policy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const configPath = path.join(rootDir, '.agents', 'framework.config.json');
const frameworkConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

console.log(`Starting AI Agent Engineering Framework Validation...`);
console.log(`Root Directory: ${rootDir}\n`);

let totalErrors = 0;
let totalChecks = 0;

function reportPass(category, message) {
  totalChecks++;
  console.log(`  [PASS] ${category}: ${message}`);
}

function reportFail(category, message) {
  totalChecks++;
  totalErrors++;
  console.error(`  [FAIL] ${category}: ${message}`);
}

function readFileClean(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

// 1. Verify Rules (list from framework.config.json)
console.log(`=== 1. Validating Framework Rules (.agents/rules/) ===`);
const expectedRules = frameworkConfig.rules || [
  'accessibility.md',
  'api-design.md',
  'architecture.md',
  'backend.md',
  'change-safety.md',
  'coding-standards.md',
  'core-workflow.md',
  'database.md',
  'deployment.md',
  'documentation.md',
  'frontend.md',
  'git-workflow.md',
  'performance-optimization.md',
  'security.md',
  'testing.md'
];

const rulesDir = path.join(rootDir, '.agents', 'rules');
if (!fs.existsSync(rulesDir)) {
  reportFail('Rules', `Directory does not exist: ${rulesDir}`);
} else {
  for (const rule of expectedRules) {
    const rulePath = path.join(rulesDir, rule);
    if (!fs.existsSync(rulePath)) {
      reportFail('Rules', `Missing rule file: ${rule}`);
    } else {
      const content = readFileClean(rulePath);
      if (content.startsWith('---')) {
        reportPass('Rules', `Valid rule with frontmatter: ${rule}`);
      } else {
        reportFail('Rules', `Missing frontmatter in rule: ${rule}`);
      }
    }
  }
}

// 2. Verify Skills (count from framework.config.json)
console.log(`\n=== 2. Validating Framework Skills (.agents/skills/) ===`);
const skillsDir = path.join(rootDir, '.agents', 'skills');
if (!fs.existsSync(skillsDir)) {
  reportFail('Skills', `Directory does not exist: ${skillsDir}`);
} else {
  const skillFolders = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const expectedSkillCount = frameworkConfig.expectedCounts?.skills || 52;
  if (skillFolders.length !== expectedSkillCount) {
    reportFail('Skills', `Expected ${expectedSkillCount} skills, found ${skillFolders.length}`);
  } else {
    reportPass('Skills', `Found exact ${expectedSkillCount} skill directories`);
  }

  let skillsWithValidFrontmatter = 0;
  const nameMismatches = [];
  const toolGrants = [];
  for (const skill of skillFolders) {
    const skillMdPath = path.join(skillsDir, skill, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
      reportFail('Skills', `Missing SKILL.md in: ${skill}`);
    } else {
      const content = readFileClean(skillMdPath);
      const frontmatter = (content.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1];
      if (frontmatter !== undefined && /^name:/m.test(frontmatter) && /^description:/m.test(frontmatter)) {
        skillsWithValidFrontmatter++;
        const declaredName = (frontmatter.match(/^name:\s*["']?([^"'\r\n]+)["']?\s*$/m) || [])[1];
        if (declaredName !== skill) nameMismatches.push(`${skill} (name: ${declaredName})`);
        if (/^tools:/m.test(frontmatter)) toolGrants.push(skill);
      } else {
        reportFail('Skills', `Invalid YAML frontmatter in: ${skill}/SKILL.md`);
      }
    }
  }

  if (skillsWithValidFrontmatter === expectedSkillCount) {
    reportPass('Skills', `All ${expectedSkillCount} skills possess valid SKILL.md and YAML frontmatter`);
  }
  if (nameMismatches.length === 0) {
    reportPass('Skills', 'Every skill frontmatter name matches its directory (no duplicate or shadowed skills)');
  } else {
    reportFail('Skills', `Skill name/directory mismatch: ${nameMismatches.join(', ')}`);
  }
  if (toolGrants.length === 0) {
    reportPass('Skills', 'No skill declares tool grants; privileges come only from subagent definitions');
  } else {
    reportFail('Skills', `Skills must not declare tools: ${toolGrants.join(', ')}`);
  }
}

// 2b. Verify Workflows (list from framework.config.json)
console.log(`\n=== 2b. Validating Workflows (.agents/workflows/) ===`);
const expectedWorkflows = frameworkConfig.workflows || [];
const workflowsDir = path.join(rootDir, '.agents', 'workflows');
const presentWorkflows = fs.existsSync(workflowsDir)
  ? fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.md'))
  : [];
const unlistedWorkflows = presentWorkflows.filter((f) => !expectedWorkflows.includes(f));
if (unlistedWorkflows.length === 0 && presentWorkflows.length === (frameworkConfig.expectedCounts?.workflows ?? expectedWorkflows.length)) {
  reportPass('Workflows', `Found exactly ${presentWorkflows.length} workflows listed in framework.config.json`);
} else {
  reportFail('Workflows', `Workflow inventory mismatch: present=${presentWorkflows.length}, unlisted=${unlistedWorkflows.join(', ') || 'none'}`);
}
for (const workflow of expectedWorkflows) {
  const workflowPath = path.join(workflowsDir, workflow);
  if (!fs.existsSync(workflowPath)) {
    reportFail('Workflows', `Missing workflow: ${workflow}`);
    continue;
  }
  const frontmatter = (readFileClean(workflowPath).match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1];
  if (frontmatter !== undefined && /^description:/m.test(frontmatter)) {
    reportPass('Workflows', `Valid workflow with description: ${workflow}`);
  } else {
    reportFail('Workflows', `Workflow missing frontmatter description: ${workflow}`);
  }
}

// 3. Verify Templates (11 templates)
console.log(`\n=== 3. Validating Engineering Templates (.agents/templates/) ===`);
const expectedTemplates = frameworkConfig.templates || [
  'architecture/adr-template.md',
  'architecture/architecture-spec-template.md',
  'database/schema-template.md',
  'database/data-dictionary-template.md',
  'prd/prd-template.md',
  'srs/srs-template.md',
  'project-planning/project-plan-template.md',
  'requirements-analysis/requirements-spec-template.md',
  'api/api-spec-template.md',
  'testing/test-plan-template.md',
  'deployment/deployment-runbook-template.md'
];

const templatesDir = path.join(rootDir, '.agents', 'templates');
for (const tmpl of expectedTemplates) {
  const tmplPath = path.join(templatesDir, tmpl);
  if (!fs.existsSync(tmplPath)) {
    reportFail('Templates', `Missing template: ${tmpl}`);
  } else {
    const stats = fs.statSync(tmplPath);
    if (stats.size > 200) {
      reportPass('Templates', `Verified template (${stats.size} bytes): ${tmpl}`);
    } else {
      reportFail('Templates', `Template too small or empty: ${tmpl}`);
    }
  }
}

// 4. Verify Documentation Hierarchy (docs/)
console.log(`\n=== 4. Validating Documentation Structure (docs/) ===`);
const expectedDocs = frameworkConfig.docs || [
  'docs/README.md',
  'docs/product/README.md',
  'docs/requirements/README.md',
  'docs/architecture/README.md',
  'docs/database/README.md',
  'docs/api/README.md',
  'docs/testing/README.md',
  'docs/deployment/README.md'
];

for (const doc of expectedDocs) {
  const docPath = path.join(rootDir, doc);
  if (!fs.existsSync(docPath)) {
    reportFail('Docs', `Missing documentation guide: ${doc}`);
  } else {
    reportPass('Docs', `Verified documentation guide: ${doc}`);
  }
}

// 4b. Verify documentation claims that can drift from the repository
console.log(`\n=== 4b. Validating README Version & Plugin Directory Claims ===`);
const readmePath = path.join(rootDir, 'README.md');
if (frameworkConfig.version && fs.existsSync(readmePath)) {
  const badgeVersion = (readFileClean(readmePath).match(/badge\/version-(\d+\.\d+\.\d+)-/) || [])[1];
  if (badgeVersion === undefined) {
    reportFail('Release', 'README.md has no version badge to compare against framework.config.json');
  } else if (badgeVersion === frameworkConfig.version) {
    reportPass('Release', `README version badge matches framework.config.json (${badgeVersion})`);
  } else {
    reportFail('Release', `README version badge (${badgeVersion}) does not match framework.config.json (${frameworkConfig.version})`);
  }
}

const pluginsDir = path.join(rootDir, '.agents', 'plugins');
const pluginsReadmePath = path.join(pluginsDir, 'README.md');
if (fs.existsSync(pluginsReadmePath)) {
  // Plugin directories are listed as "- `name/`" bullets under the "Plugin Directories" heading.
  const pluginSection = (readFileClean(pluginsReadmePath).match(/^## \d+\. Plugin Directories\r?\n([\s\S]*?)(?=^## |(?![\s\S]))/m) || [])[1] || '';
  const listedPlugins = [...pluginSection.matchAll(/^- `([^`/]+)\/`/gm)].map((m) => m[1]);
  const missingPlugins = listedPlugins.filter((name) => !fs.existsSync(path.join(pluginsDir, name)));
  if (missingPlugins.length === 0) {
    reportPass('Plugins', `Every plugin directory listed in plugins/README.md exists (${listedPlugins.length} listed)`);
  } else {
    reportFail('Plugins', `plugins/README.md lists directories that do not exist: ${missingPlugins.join(', ')}`);
  }
}

// 4c. Verify ECC source stamps agree with THIRD_PARTY_NOTICES.md (full body comparison: ecc-drift.mjs)
console.log(`\n=== 4c. Validating ECC Source Stamps ===`);
{
  const driftReport = buildDriftReport(rootDir, null);
  if (driftReport.expectedVersion === null) {
    reportFail('ECC', 'THIRD_PARTY_NOTICES.md does not record an ecc-universal version');
  } else if (driftReport.mismatched.length === 0) {
    reportPass('ECC', `All ${driftReport.stamped} stamped rules and workflows match ecc-universal@${driftReport.expectedVersion}`);
  } else {
    reportFail('ECC', `${driftReport.mismatched.length} stamped file(s) differ from ecc-universal@${driftReport.expectedVersion}: ${driftReport.mismatched.map((m) => m.file).join(', ')}`);
  }
}

// 5. Markdown Link & Portability Validation
console.log(`\n=== 5. Validating Markdown Links & Portability ===`);

// Third-party source folders staged for merging (e.g. an upstream framework copy) are
// listed in framework.config.json `validation.linkCheckExclusions` and skipped here.
const linkCheckExclusions = new Set(
  (frameworkConfig.validation?.linkCheckExclusions || []).map((p) => path.resolve(rootDir, p))
);

function getAllMarkdownFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'scratch') continue;
    const fullPath = path.join(dir, entry.name);
    if (linkCheckExclusions.has(path.resolve(fullPath))) continue;
    if (entry.isDirectory()) {
      results = results.concat(getAllMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

function stripCodeBlocksAndSpans(text) {
  // Strip fenced code blocks ```...``` and ~~~...~~~
  let stripped = text.replace(/```[\s\S]*?```/g, '');
  stripped = stripped.replace(/~~~[\s\S]*?~~~/g, '');
  // Strip inline code spans `...`
  stripped = stripped.replace(/`[^`\n]+`/g, '');
  return stripped;
}

const mdFiles = getAllMarkdownFiles(rootDir);
let linkCount = 0;
let brokenLinks = 0;
let absolutePathsFound = 0;

const linkRegex = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;

for (const file of mdFiles) {
  const relativeFile = path.relative(rootDir, file);
  const rawContent = readFileClean(file);
  const content = stripCodeBlocksAndSpans(rawContent);
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    linkCount++;
    const linkText = match[1];
    let rawTarget = match[2].trim();

    // Skip external or non-relative schemes
    if (
      rawTarget.startsWith('http://') ||
      rawTarget.startsWith('https://') ||
      rawTarget.startsWith('mailto:') ||
      rawTarget.startsWith('sidecar://') ||
      rawTarget.startsWith('conversation://')
    ) {
      continue;
    }

    // Check for prohibited machine-specific absolute paths
    if (rawTarget.startsWith('file://') || /^[A-Za-z]:[\\/]/.test(rawTarget)) {
      reportFail('Portability', `Machine-specific absolute path in ${relativeFile}: "${rawTarget}"`);
      absolutePathsFound++;
      continue;
    }

    // Handle pure in-page anchors
    if (rawTarget.startsWith('#')) {
      continue;
    }

    // Strip anchor if present
    const targetPathOnly = rawTarget.split('#')[0];
    if (!targetPathOnly) continue;

    // Resolve relative path from source file directory
    const sourceDir = path.dirname(file);
    const resolvedTarget = path.resolve(sourceDir, targetPathOnly);

    if (!fs.existsSync(resolvedTarget)) {
      reportFail('Links', `Broken link in ${relativeFile}: "${rawTarget}" -> Target does not exist: ${path.relative(rootDir, resolvedTarget)}`);
      brokenLinks++;
    }
  }
}

if (brokenLinks === 0 && absolutePathsFound === 0) {
  reportPass('Links', `All ${linkCount} active Markdown links resolved successfully with 0 broken links and 0 absolute paths`);
}

// 6. Subagent Architecture Validation (counts from framework.config.json)
console.log(`\n=== 6. Validating Subagent Architecture (.agents/agents/) ===`);
const expectedAgents = frameworkConfig.subagents || [
  'accessibility-auditor.md',
  'architect-planner.md',
  'code-implementer.md',
  'diagnostic-debugger.md',
  'qa-reviewer.md',
  'security-auditor.md'
];

const agentsDir = path.join(rootDir, '.agents', 'agents');
const expectedAgentCount = frameworkConfig.expectedCounts?.subagents ?? expectedAgents.length;
const missingAgents = expectedAgents.filter((agent) => !fs.existsSync(path.join(agentsDir, agent)));
const presentAgents = expectedAgents.filter((agent) => !missingAgents.includes(agent));
if (missingAgents.length === 0 && expectedAgents.length === expectedAgentCount) {
  reportPass('Subagents', `All ${expectedAgentCount} approved subagent definitions exist in .agents/agents/`);
} else if (missingAgents.length > 0) {
  reportFail('Subagents', `Missing subagent definition file(s): ${missingAgents.join(', ')}`);
} else {
  reportFail('Subagents', `Expected ${expectedAgentCount} subagents, config lists ${expectedAgents.length}`);
}

// Check frontmatter and tool policies for each present agent (missing files are reported above)
for (const agent of presentAgents) {
  const agentPath = path.join(agentsDir, agent);
  const content = readFileClean(agentPath);
  const hasSubagent = /subagent:\s*true/i.test(content);
  const hasMcpFalse = /inheritMcp:\s*false/i.test(content);
  const hasCustomTrue = /inheritCustomizations:\s*true/i.test(content);

  if (hasSubagent && hasMcpFalse && hasCustomTrue) {
    reportPass('Subagents', `Subagent ${agent} declares valid isolation flags (subagent: true, inheritMcp: false, inheritCustomizations: true)`);
  } else {
    reportFail('Subagents', `Subagent ${agent} missing required isolation flags`);
  }
}

// Check least-privilege tool isolation
let toolPolicyClean = true;
for (const agent of presentAgents) {
  const agentPath = path.join(agentsDir, agent);
  const content = readFileClean(agentPath);
  const frontmatter = content.split('---')[1] || '';
  if (agent === 'code-implementer.md') {
    if (!frontmatter.includes('run_command') || !frontmatter.includes('write_file') || !frontmatter.includes('edit_file')) {
      toolPolicyClean = false;
    }
  } else {
    if (frontmatter.includes('run_command') || frontmatter.includes('write_file') || frontmatter.includes('edit_file') || frontmatter.includes('write_to_file')) {
      toolPolicyClean = false;
    }
  }
}
if (toolPolicyClean) {
  reportPass('Subagents', 'Least-privilege tool separation verified: only code-implementer possesses command and mutation tools');
} else {
  reportFail('Subagents', 'Tool policy violation: unauthorized command or mutation tools found in subagent definitions');
}

// Check that all skill bindings resolve to existing directories (expected count from config)
const expectedSkillBindings = frameworkConfig.expectedCounts?.skillBindings ?? 26;
let allSkillsResolved = true;
let totalSkillBindings = 0;
for (const agent of presentAgents) {
  const agentPath = path.join(agentsDir, agent);
  const content = readFileClean(agentPath);
  const skillMatches = content.match(/skills\/[\w-]+/g) || [];
  totalSkillBindings += skillMatches.length;
  for (const skillRef of skillMatches) {
    const skillPath = path.join(rootDir, '.agents', skillRef);
    if (!fs.existsSync(skillPath)) {
      allSkillsResolved = false;
    }
  }
}
if (allSkillsResolved && totalSkillBindings === expectedSkillBindings) {
  reportPass('Subagents', `All ${expectedSkillBindings} skill bindings across ${presentAgents.length} subagents resolve to existing directories in .agents/skills/`);
} else {
  reportFail('Subagents', `Skill binding verification failed: resolved=${allSkillsResolved}, total=${totalSkillBindings} (expected ${expectedSkillBindings})`);
}

// 6b. MCP policy (optional). Grants to read-only agents must be attested read-only tools.
console.log(`\n=== 6b. Validating MCP Policy ===`);
{
  const rawMcpPolicy = frameworkConfig.mcpPolicy;
  const mcpErrors = validateMcpPolicy(rawMcpPolicy, expectedAgents.map((agent) => agent.replace(/\.md$/, '')));
  if (mcpErrors.length === 0) {
    const serverCount = Object.keys(rawMcpPolicy?.servers || {}).length;
    const grantCount = Object.values(rawMcpPolicy?.agentGrants || {}).reduce((sum, tools) => sum + tools.length, 0);
    reportPass('MCP', rawMcpPolicy === undefined
      ? 'No mcpPolicy configured (MCP tools follow Claude Code permissions)'
      : `mcpPolicy is valid (default ${rawMcpPolicy.defaultDecision ?? 'allow'}, ${serverCount} server rule set(s), ${grantCount} agent grant(s))`);
  } else {
    for (const error of mcpErrors) reportFail('MCP', error);
  }
}

// 7. Security Hook Behavior Validation
// Hooks are exercised against a disposable workspace outside the repository, so these
// checks prove behavior rather than the presence of strings in the source.
console.log(`\n=== 7. Validating Control Plane Safety Hooks (behavioral) ===`);

const hooksJsonPath = path.join(rootDir, '.agents', 'hooks.json');
if (fs.existsSync(hooksJsonPath)) {
  const hooksConfig = JSON.parse(readFileClean(hooksJsonPath));
  const lifecycle = hooksConfig['safety-lifecycle'] || {};
  if (lifecycle.SessionStart && lifecycle.PreToolUse && lifecycle.PostToolUse && lifecycle.Stop) {
    reportPass('Hooks', '.agents/hooks.json declares bindings for SessionStart, PreToolUse, PostToolUse, and Stop');
  } else {
    reportFail('Hooks', '.agents/hooks.json missing one or more required lifecycle hook bindings');
  }
} else {
  reportFail('Hooks', 'Missing .agents/hooks.json');
}

function hookCheck(label, fn) {
  try {
    const result = fn();
    if (result === true) {
      reportPass('Hooks', label);
    } else {
      reportFail('Hooks', `${label} (${result})`);
    }
  } catch (err) {
    reportFail('Hooks', `${label} (threw: ${err.message})`);
  }
}

function firstFailure(results) {
  return results.find((r) => r !== true) ?? true;
}

const preFilePath = path.join(rootDir, '.agents', 'scripts', 'hooks', 'pre-file-safety.mjs');
const preToolPath = path.join(rootDir, '.agents', 'scripts', 'hooks', 'pre-tool-safety.mjs');
let fileHook = null;
let toolHook = null;
try {
  fileHook = await import(pathToFileURL(preFilePath).href);
  toolHook = await import(pathToFileURL(preToolPath).href);
} catch (err) {
  reportFail('Hooks', `Failed to load hook modules: ${err.message}`);
}

if (fileHook && toolHook) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-validate-'));
  const ws = path.join(sandbox, 'ws');
  const outside = path.join(sandbox, 'outside');
  fs.mkdirSync(path.join(ws, 'src'), { recursive: true });
  fs.mkdirSync(path.join(ws, '.agents', 'rules'), { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(ws, 'src', 'app.js'), 'x', 'utf8');
  fs.writeFileSync(path.join(ws, '.env'), 'X=1', 'utf8');
  fs.writeFileSync(path.join(ws, '.agents', 'rules', 'rule.md'), 'x', 'utf8');
  fs.writeFileSync(path.join(outside, 'outside.txt'), 'x', 'utf8');
  let junctionReady = false;
  try {
    fs.symlinkSync(outside, path.join(ws, 'escape'), 'junction');
    junctionReady = true;
  } catch {
    junctionReady = false;
  }

  const file = (name, args) => fileHook.evaluateFileSafety({ workspacePaths: [ws], toolCall: { name, args } }).decision;
  const cmd = (commandLine, extra = {}) =>
    toolHook.evaluateCommandSafety({
      workspacePaths: [ws],
      toolCall: {
        name: 'run_command',
        args: { CommandLine: commandLine, Cwd: ws, toolSummary: 'validate', WaitMsBeforeAsync: 5000, ...extra },
      },
    }).decision;
  const expect = (actual, wanted) => (actual === wanted ? true : `got ${actual}, expected ${wanted}`);

  try {
    hookCheck('Reads: in-workspace file allowed, traversal denied, sensitive file requires confirmation', () =>
      firstFailure([
        expect(file('read_file', { Path: 'src/app.js' }), 'allow'),
        expect(file('read_file', { Path: '../outside/outside.txt' }), 'deny'),
        expect(file('read_file', { Path: '.env' }), 'force_ask'),
      ])
    );
    hookCheck('Reads: missing path schemas fail closed with deny', () =>
      firstFailure([expect(file('read_file', {}), 'deny'), expect(file('grep_search', {}), 'deny')])
    );
    hookCheck('Search: content search over a scope holding sensitive files requires confirmation', () =>
      firstFailure([
        expect(file('grep_search', { SearchPath: 'src', Query: 'x' }), 'allow'),
        expect(file('grep_search', { SearchPath: ws, Query: 'x' }), 'force_ask'),
        expect(file('list_dir', { DirectoryPath: '../outside' }), 'deny'),
      ])
    );
    hookCheck('Workspace root: relative or ambiguous roots are rejected', () =>
      fileHook.extractCanonicalWorkspaceRoot({ workspacePaths: ['relative/root'] }) === null &&
      fileHook.extractCanonicalWorkspaceRoot({ workspacePaths: [ws, outside] }) === null
        ? true
        : 'relative or ambiguous root accepted'
    );
    hookCheck('Writes: UNC, device, and drive-relative paths are denied', () =>
      firstFailure([
        expect(file('write_file', { Path: '\\\\server\\share\\x.txt' }), 'deny'),
        expect(file('write_file', { Path: '\\\\?\\C:\\x.txt' }), 'deny'),
        expect(file('write_file', { Path: 'C:x.txt' }), 'deny'),
      ])
    );
    if (junctionReady) {
      hookCheck('Writes: new file beneath an escaping junction is denied', () =>
        expect(file('write_file', { Path: 'escape/new.txt', Content: 'x' }), 'deny')
      );
    } else {
      console.log('  [SKIP] Hooks: junction escape check (junction could not be created on this platform)');
    }
    hookCheck('Writes: control-plane assets (AGENTS.md, .agents/**) require confirmation; scratch does not', () =>
      firstFailure([
        expect(file('write_file', { Path: 'AGENTS.md' }), 'force_ask'),
        expect(file('write_file', { Path: '.agents/rules/rule.md' }), 'force_ask'),
        expect(file('write_file', { Path: '.agents/scratch/n.txt' }), 'allow'),
      ])
    );
    hookCheck('Sensitive matching covers nested directories without flagging look-alike source files', () =>
      fileHook.isSensitiveFile('src/.aws/credentials') &&
      fileHook.isSensitiveFile('config/secrets/token.json') &&
      !fileHook.isSensitiveFile('src/services/secretService.ts')
        ? true
        : 'sensitive matching mismatch'
    );
    hookCheck('Commands: exact allowlist allowed; alternate prefixes ask; chaining and destructive commands denied', () =>
      firstFailure([
        expect(cmd('node .agents/scripts/validate-framework.mjs'), 'allow'),
        expect(cmd('node scripts/validate-framework.mjs'), 'force_ask'),
        expect(cmd('git status && git diff'), 'deny'),
        expect(cmd('git clean -fdx'), 'deny'),
        expect(cmd('git push --force'), 'deny'),
      ])
    );
    hookCheck('Commands: BypassSandbox, IsDaemon, and missing toolSummary are denied', () =>
      firstFailure([
        expect(cmd('git status', { BypassSandbox: true }), 'deny'),
        expect(cmd('git status', { IsDaemon: true }), 'deny'),
        expect(cmd('git status', { toolSummary: '' }), 'deny'),
      ])
    );
    hookCheck('Audit logging: redacted payload summary never contains argument values', () => {
      const summary = JSON.stringify(
        fileHook.summarizePayloadForLog({ toolCall: { name: 'write_file', args: { Path: '.env', Content: 'TOKEN=abc123secret' } } })
      );
      return summary.includes('abc123secret') ? 'content leaked into log summary' : true;
    });
  } finally {
    try {
      fs.rmdirSync(path.join(ws, 'escape'));
    } catch {
      // junction absent or already removed
    }
    try {
      fs.rmSync(sandbox, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

// Summary
console.log(`\n========================================`);
console.log(`Validation Completed:`);
console.log(`  Total Checks: ${totalChecks}`);
console.log(`  Total Errors: ${totalErrors}`);
console.log(`========================================\n`);

if (totalErrors > 0) {
  console.error(`Validation FAILED with ${totalErrors} issue(s).`);
  process.exit(1);
} else {
  console.log(`Validation SUCCEEDED: Framework is 100% compliant and ready.`);
  process.exit(0);
}
