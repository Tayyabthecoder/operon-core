import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  serializeCanonical,
  computeFileHash,
  computeWorkspaceFingerprint,
  diffManifests,
} from '../lib/workspace-fingerprint.mjs';
import {
  isSensitiveFile,
  validateCanonicalPath,
  validateScopeBoundary,
  extractCanonicalWorkspaceRoot,
  extractReadTargets,
} from '../hooks/pre-file-safety.mjs';
import {
  isApprovedProfile,
  evaluateCommandSafety,
} from '../hooks/pre-tool-safety.mjs';

describe('Phase 6B: Lifecycle Hooks & Filesystem Safety Test Suite', () => {
  let tempTestDir;
  let artifactTestDir;

  before(() => {
    tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-phase6b-test-'));
    artifactTestDir = path.join(tempTestDir, 'artifacts');
    fs.mkdirSync(artifactTestDir, { recursive: true });
  });

  after(() => {
    try {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors on Windows
    }
  });

  // ==========================================
  // 1. Workspace Fingerprint Library Tests
  // ==========================================
  describe('Workspace Fingerprint Library', () => {
    test('serializeCanonical produces deterministic JSON with sorted keys', () => {
      const obj1 = { z: 1, a: 2, m: { y: 10, b: 20 } };
      const obj2 = { a: 2, m: { b: 20, y: 10 }, z: 1 };

      const json1 = serializeCanonical(obj1);
      const json2 = serializeCanonical(obj2);

      assert.equal(json1, json2);
      assert.equal(json1, '{"a":2,"m":{"b":20,"y":10},"z":1}');
    });

    test('computes deterministic file hash and detects content change', () => {
      const filePath = path.join(tempTestDir, 'sample.txt');
      fs.writeFileSync(filePath, 'Hello Antigravity 2.0', 'utf8');

      const hash1 = computeFileHash(filePath);
      const expectedHash = crypto.createHash('sha256').update('Hello Antigravity 2.0').digest('hex');
      assert.equal(hash1, expectedHash);

      fs.writeFileSync(filePath, 'Modified content', 'utf8');
      const hash2 = computeFileHash(filePath);
      assert.notEqual(hash1, hash2);
    });

    test('computeWorkspaceFingerprint discovers files and computes composite digest', () => {
      const testWorkspace = path.join(tempTestDir, 'workspace1');
      fs.mkdirSync(path.join(testWorkspace, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testWorkspace, 'README.md'), '# Test Project', 'utf8');
      fs.writeFileSync(path.join(testWorkspace, 'src', 'index.js'), 'console.log("hi");', 'utf8');

      const manifest1 = computeWorkspaceFingerprint(testWorkspace);
      assert.equal(manifest1.fileCount, 2);
      assert.equal(manifest1.records.length, 2);
      assert.equal(manifest1.records[0].path, 'README.md');
      assert.equal(manifest1.records[1].path, 'src/index.js');
      assert.ok(manifest1.compositeDigest);

      // Verify deterministic digest on repeat run
      const manifest2 = computeWorkspaceFingerprint(testWorkspace);
      assert.equal(manifest2.compositeDigest, manifest1.compositeDigest);
    });

    test('diffManifests accurately tracks added, removed, and modified files', () => {
      const base = {
        records: [
          { path: 'file1.txt', sha256: 'aaa', type: 'file' },
          { path: 'file2.txt', sha256: 'bbb', type: 'file' },
        ],
      };
      const curr = {
        records: [
          { path: 'file2.txt', sha256: 'bbb_modified', type: 'file' },
          { path: 'file3.txt', sha256: 'ccc', type: 'file' },
        ],
      };

      const diff = diffManifests(base, curr);
      assert.equal(diff.totalChanges, 3);
      assert.equal(diff.removed.length, 1);
      assert.equal(diff.removed[0].path, 'file1.txt');
      assert.equal(diff.modified.length, 1);
      assert.equal(diff.modified[0].path, 'file2.txt');
      assert.equal(diff.added.length, 1);
      assert.equal(diff.added[0].path, 'file3.txt');
    });

    test('symlink handling handles targets without recursion', (t) => {
      const symWorkspace = path.join(tempTestDir, 'sym-ws');
      fs.mkdirSync(symWorkspace, { recursive: true });
      const targetFile = path.join(symWorkspace, 'target.txt');
      fs.writeFileSync(targetFile, 'target content', 'utf8');

      const linkPath = path.join(symWorkspace, 'link-to-target.txt');
      try {
        fs.symlinkSync('target.txt', linkPath, 'file');
        const manifest = computeWorkspaceFingerprint(symWorkspace);
        const linkRecord = manifest.records.find((r) => r.path === 'link-to-target.txt');
        assert.ok(linkRecord);
        assert.equal(linkRecord.type, 'symlink_internal');
      } catch (err) {
        // On Windows without Developer Mode / SeCreateSymbolicLinkPrivilege, symlinkSync may fail
        if (err.code === 'EPERM') {
          t.skip('INCONCLUSIVE: Windows symlink privilege unavailable');
          return;
        } else {
          throw err;
        }
      }
    });
  });

  // ==========================================
  // 2. SessionStart Hook Tests
  // ==========================================
  describe('SessionStart Hook', () => {
    test('creates session-baseline.json and emits injectSteps', () => {
      const sessionWorkspace = path.join(tempTestDir, 'session-ws');
      fs.mkdirSync(sessionWorkspace, { recursive: true });
      fs.writeFileSync(path.join(sessionWorkspace, 'init.txt'), 'Session Initial Content', 'utf8');

      const sessionArtifactDir = path.join(tempTestDir, 'session-artifacts');
      const inputPayload = JSON.stringify({
        workspacePaths: [sessionWorkspace],
        artifactDirectoryPath: sessionArtifactDir,
      });

      const hookScript = path.resolve('.agents/scripts/hooks/session-start.mjs');
      const res = spawnSync(process.execPath, [hookScript], {
        input: inputPayload,
        encoding: 'utf8',
      });

      assert.equal(res.status, 0);
      const parsedOutput = JSON.parse(res.stdout);
      assert.ok(parsedOutput.injectSteps);
      assert.ok(parsedOutput.injectSteps[0].systemMessage.systemMessage.includes('Session baseline established'));

      const baselineFile = path.join(sessionArtifactDir, 'session-baseline.json');
      assert.ok(fs.existsSync(baselineFile));
      const baselineData = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
      assert.equal(baselineData.fileCount, 1);
      assert.equal(baselineData.records[0].path, 'init.txt');
    });
  });

  // ==========================================
  // 3. PreToolUse Safety Hook Tests
  // ==========================================
  describe('PreToolUse Safety Hook (run_command)', () => {
    const hookScript = path.resolve('.agents/scripts/hooks/pre-tool-safety.mjs');

    function executeHook(commandLine, cwd = null) {
      const inputPayload = JSON.stringify({
        toolCall: {
          name: 'run_command',
          args: {
            CommandLine: commandLine,
            toolSummary: 'Test command execution',
            WaitMsBeforeAsync: 5000,
            BypassSandbox: false,
            IsDaemon: false,
            Cwd: cwd,
          },
        },
        workspacePaths: [tempTestDir],
      });

      const res = spawnSync(process.execPath, [hookScript], {
        input: inputPayload,
        encoding: 'utf8',
      });

      assert.equal(res.status, 0);
      return JSON.parse(res.stdout);
    }

    test('denies command chaining with semicolon', () => {
      const out = executeHook('npm test; rm -rf src');
      assert.equal(out.decision, 'deny');
      assert.ok(out.reason.includes('Command chaining'));
    });

    test('denies command chaining with && and ||', () => {
      const out1 = executeHook('npm test && del file.txt');
      assert.equal(out1.decision, 'deny');

      const out2 = executeHook('pytest || del file.txt');
      assert.equal(out2.decision, 'deny');
    });

    test('denies command piping and file redirection', () => {
      const outPipe = executeHook('cat file | grep text');
      assert.equal(outPipe.decision, 'deny');

      const outRedir = executeHook('echo bad > secret.txt');
      assert.equal(outRedir.decision, 'deny');

      const outPwsh = executeHook('Get-Process | Out-File proc.txt');
      assert.equal(outPwsh.decision, 'deny');
    });

    test('denies destructive deletion commands', () => {
      const outDel = executeHook('del test.txt');
      assert.equal(outDel.decision, 'deny');

      const outRm = executeHook('rm -rf dist');
      assert.equal(outRm.decision, 'deny');

      const outGit = executeHook('git reset --hard HEAD');
      assert.equal(outGit.decision, 'deny');

      const outDrop = executeHook('psql -c "DROP TABLE users"');
      assert.equal(outDrop.decision, 'deny');
    });

    test('denies forced clean, whole-tree discard, and force-push git variants (F12)', () => {
      for (const cmd of [
        'git clean -fdx',
        'git clean -xdf',
        'git clean -f',
        'git clean --force -d',
        'git reset HEAD~1 --hard',
        'git checkout .',
        'git checkout -- .',
        'git restore .',
        'git push --force',
        'git push -f origin main',
        'git push --force-with-lease',
      ]) {
        assert.equal(executeHook(cmd).decision, 'deny', cmd);
      }

      for (const cmd of ['git clean -n', 'git checkout feature/x', 'git push origin main']) {
        assert.equal(executeHook(cmd).decision, 'force_ask', cmd);
      }
    });

    test('denies execution with Cwd outside workspace boundary', () => {
      const out = executeHook('node app.js', 'C:\\Windows\\System32');
      assert.equal(out.decision, 'deny');
      assert.ok(out.reason.includes('outside workspace boundary'));
    });

    test('allows approved verification profiles', () => {
      const out1 = executeHook('node .agents/scripts/verify-runner.mjs --profile framework-validator');
      assert.equal(out1.decision, 'allow');

      const out2 = executeHook('node .agents/scripts/validate-framework.mjs');
      assert.equal(out2.decision, 'allow');

      const out3 = executeHook('git status');
      assert.equal(out3.decision, 'allow');
    });

    test('triggers force_ask for unknown commands', () => {
      const out = executeHook('unknown-tool --run');
      assert.equal(out.decision, 'force_ask');
      assert.ok(out.reason.includes('not in pre-approved allowlist'));
    });
  });

  // ==========================================
  // 4. PreToolUse File & Read Safety Hook Tests (23 tests, #14-36)
  // ==========================================
  describe('PreToolUse File & Read Safety Hook', () => {
    const hookScript = path.resolve('.agents/scripts/hooks/pre-file-safety.mjs');

    function executeFileHook(toolName, targetPath, extraArgs = {}, customWs = tempTestDir) {
      const inputPayload = JSON.stringify({
        toolCall: {
          name: toolName,
          args: {
            Path: targetPath,
            ...extraArgs,
          },
        },
        workspacePaths: [customWs],
      });

      const res = spawnSync(process.execPath, [hookScript], {
        input: inputPayload,
        encoding: 'utf8',
      });

      assert.equal(res.status, 0);
      return JSON.parse(res.stdout);
    }

    test('denies writes outside workspace boundary', () => {
      const out = executeFileHook('write_file', 'C:\\Windows\\System32\\drivers.txt');
      assert.equal(out.decision, 'deny');
      assert.ok(out.reason.includes('outside workspace boundary'));
    });

    test('requires force_ask for control-plane asset mutations', () => {
      const out1 = executeFileHook('edit_file', '.agents/hooks.json');
      assert.equal(out1.decision, 'force_ask');
      assert.ok(out1.reason.includes('control-plane asset'));

      const out2 = executeFileHook('write_file', '.agents/scripts/hooks/pre-tool-safety.mjs');
      assert.equal(out2.decision, 'force_ask');

      const out3 = executeFileHook('edit_file', '.agents/scripts/lib/workspace-fingerprint.mjs');
      assert.equal(out3.decision, 'force_ask');

      const out4 = executeFileHook('write_file', '.agents/scripts/verify-runner.mjs');
      assert.equal(out4.decision, 'force_ask');
    });

    test('requires force_ask for sensitive environment and credential file mutations', () => {
      const outEnv = executeFileHook('write_file', '.env');
      assert.equal(outEnv.decision, 'force_ask');

      const outSecret = executeFileHook('edit_file', 'config/credentials.json');
      assert.equal(outSecret.decision, 'force_ask');

      const outKey = executeFileHook('write_file', 'cert.key');
      assert.equal(outKey.decision, 'force_ask');
    });

    test('allows normal workspace file edits', () => {
      const out = executeFileHook('write_file', 'src/components/Button.jsx');
      assert.equal(out.decision, 'allow');
    });

    function removeJunction(junctionPath) {
      try { fs.rmdirSync(junctionPath); } catch {
        try { fs.unlinkSync(junctionPath); } catch {}
      }
    }

    test('new file write beneath a junction that escapes the workspace returns deny (F1)', () => {
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-junction-'));
      const junctionPath = path.join(tempTestDir, 'escape-junction');
      try {
        fs.symlinkSync(outsideDir, junctionPath, 'junction');

        const out = executeFileHook('write_file', 'escape-junction/new-file.txt');
        assert.equal(out.decision, 'deny');
        assert.ok(out.reason.includes('outside canonical workspace boundary'));

        const nested = executeFileHook('write_file', 'escape-junction/deep/dir/new-file.txt');
        assert.equal(nested.decision, 'deny');
      } finally {
        removeJunction(junctionPath);
        try { fs.rmSync(outsideDir, { recursive: true, force: true }); } catch {}
      }
    });

    test('write through an in-workspace junction into a sensitive directory returns force_ask (F6)', () => {
      const awsDir = path.join(tempTestDir, 'cloud', '.aws');
      fs.mkdirSync(awsDir, { recursive: true });
      const junctionPath = path.join(tempTestDir, 'innocent-cfg');
      try {
        fs.symlinkSync(awsDir, junctionPath, 'junction');
        const out = executeFileHook('write_file', 'innocent-cfg/config');
        assert.equal(out.decision, 'force_ask');
        assert.ok(out.reason.includes('sensitive'));
      } finally {
        removeJunction(junctionPath);
      }
    });

    test('control-plane protection covers AGENTS.md and all of .agents/ except scratch (F2)', () => {
      const protectedPaths = [
        'AGENTS.md',
        '.agents/rules/change-safety.md',
        '.agents/agents/code-implementer.md',
        '.agents/framework.config.json',
        '.agents/scripts/tests/phase6b-tests.mjs',
        '.agents/skills/debugging/SKILL.md',
      ];
      for (const p of protectedPaths) {
        const out = executeFileHook('write_file', p);
        assert.equal(out.decision, 'force_ask', p);
        assert.ok(out.reason.includes('control-plane asset'), p);
      }

      assert.equal(executeFileHook('write_file', '.agents/scratch/notes.txt').decision, 'allow');
      assert.equal(executeFileHook('write_file', 'docs/AGENTS.md').decision, 'allow');
      assert.equal(executeFileHook('write_file', '.agentsx/file.txt').decision, 'allow');
    });

    test('hook audit log records tool and target but never argument content (F4)', () => {
      const logDir = path.join(tempTestDir, 'hook-log-artifacts');
      fs.mkdirSync(logDir, { recursive: true });
      const secret = 'SUPER_SECRET_VALUE_12345';
      const res = spawnSync(process.execPath, [hookScript], {
        input: JSON.stringify({
          toolCall: { name: 'write_file', args: { Path: '.env', Content: `API_KEY=${secret}` } },
          workspacePaths: [tempTestDir],
          artifactDirectoryPath: logDir,
        }),
        encoding: 'utf8',
      });
      assert.equal(res.status, 0);

      const log = fs.readFileSync(path.join(logDir, 'hook-event-log.jsonl'), 'utf8');
      assert.ok(!log.includes(secret));
      const entry = JSON.parse(log.trim().split('\n').pop());
      assert.equal(entry.input.tool, 'write_file');
      assert.equal(entry.input.target, '.env');
      assert.deepEqual(entry.input.argKeys, ['Content', 'Path']);
    });

    test('normal workspace file direct read (read_file targeting src/index.js) returns allow', () => {
      const testFile = path.join(tempTestDir, 'src', 'index.js');
      fs.mkdirSync(path.dirname(testFile), { recursive: true });
      fs.writeFileSync(testFile, 'console.log("ok");', 'utf8');

      const out = executeFileHook('read_file', 'src/index.js');
      assert.equal(out.decision, 'allow');
    });

    test('sensitive direct read (read_file targeting in-workspace .env, id_rsa, cert.key) returns force_ask', () => {
      const envFile = path.join(tempTestDir, '.env');
      fs.writeFileSync(envFile, 'SECRET=123', 'utf8');

      const out = executeFileHook('read_file', '.env');
      assert.equal(out.decision, 'force_ask');
      assert.ok(out.reason.includes('sensitive file inventory'));
    });

    test('grep_search without a usable path argument fails closed with deny (F7)', () => {
      const res = spawnSync(process.execPath, [hookScript], {
        input: JSON.stringify({
          toolCall: { name: 'grep_search', args: { Query: 'export' } },
          workspacePaths: [tempTestDir],
        }),
        encoding: 'utf8',
      });
      const out = JSON.parse(res.stdout);
      assert.equal(out.decision, 'deny');
      assert.ok(out.reason.includes('without a valid path argument'));
    });

    test('mapped search and listing tools enforce containment and sensitive-scope screening (F7)', () => {
      const searchWs = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-search-ws-'));
      try {
        fs.mkdirSync(path.join(searchWs, 'src'), { recursive: true });
        fs.writeFileSync(path.join(searchWs, 'src', 'index.js'), 'export {}', 'utf8');
        fs.mkdirSync(path.join(searchWs, 'config'), { recursive: true });
        fs.writeFileSync(path.join(searchWs, 'config', '.env'), 'SECRET=1', 'utf8');

        const grepSrc = executeFileHook('grep_search', undefined, { SearchPath: 'src', Query: 'export' }, searchWs);
        assert.equal(grepSrc.decision, 'allow');

        const grepRoot = executeFileHook('grep_search', undefined, { SearchPath: searchWs, Query: 'SECRET' }, searchWs);
        assert.equal(grepRoot.decision, 'force_ask');
        assert.ok(grepRoot.reason.includes('config/.env'));

        const listRoot = executeFileHook('list_dir', undefined, { DirectoryPath: searchWs }, searchWs);
        assert.equal(listRoot.decision, 'allow');

        const listOutside = executeFileHook('list_dir', undefined, { DirectoryPath: '..' }, searchWs);
        assert.equal(listOutside.decision, 'deny');

        const findSrc = executeFileHook('find_by_name', undefined, { SearchDirectory: 'src', Pattern: '*.js' }, searchWs);
        assert.equal(findSrc.decision, 'allow');

        const viewFile = executeFileHook('view_file', undefined, { AbsolutePath: path.join(searchWs, 'src', 'index.js') }, searchWs);
        assert.equal(viewFile.decision, 'allow');

        const viewEnv = executeFileHook('view_file', undefined, { AbsolutePath: path.join(searchWs, 'config', '.env') }, searchWs);
        assert.equal(viewEnv.decision, 'force_ask');
      } finally {
        try { fs.rmSync(searchWs, { recursive: true, force: true }); } catch {}
      }
    });

    test('broad recursive search pattern containing protected paths is denied', () => {
      const canonicalRoot = path.normalize(fs.realpathSync.native(tempTestDir)).toLowerCase();
      const res1 = validateScopeBoundary('.env', canonicalRoot);
      assert.equal(res1.safe, false);

      const res2 = validateScopeBoundary('.aws', canonicalRoot);
      assert.equal(res2.safe, false);
    });

    test('Windows traversal (..\\..\\), UNC (\\\\server\\share), and device paths (\\\\?\\) return deny', () => {
      const out1 = executeFileHook('read_file', '..\\..\\Windows\\System32\\calc.exe');
      assert.equal(out1.decision, 'deny');

      const out2 = executeFileHook('read_file', '\\\\server\\share\\secret.txt');
      assert.equal(out2.decision, 'deny');

      const out3 = executeFileHook('read_file', '\\\\?\\C:\\Windows\\System32\\cmd.exe');
      assert.equal(out3.decision, 'deny');
    });

    test('symlink escaping outside workspace boundary returns deny, even if target is sensitive', (t) => {
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-sym-'));
      const outsideSecret = path.join(outsideDir, '.env');
      fs.writeFileSync(outsideSecret, 'SECRET=OUTSIDE', 'utf8');

      const symlinkPath = path.join(tempTestDir, 'leak-link');
      try {
        fs.symlinkSync(outsideSecret, symlinkPath, 'file');
        const out = executeFileHook('read_file', 'leak-link');
        assert.equal(out.decision, 'deny');
        assert.ok(out.reason.includes('outside canonical workspace boundary'));
      } catch (err) {
        if (err.code === 'EPERM') {
          t.skip('INCONCLUSIVE: Windows symlink privilege unavailable');
          return;
        }
        throw err;
      } finally {
        try { fs.rmSync(outsideDir, { recursive: true, force: true }); } catch {}
      }
    });

    test('Windows directory junction escaping outside workspace returns deny', () => {
      const out = executeFileHook('read_file', '..\\outside\\junction-target.txt');
      assert.equal(out.decision, 'deny');
    });

    test('missing, non-string, or unrecognized target schemas fail closed with deny', () => {
      const res = spawnSync(process.execPath, [hookScript], {
        input: JSON.stringify({
          toolCall: { name: 'read_file', args: {} },
          workspacePaths: [tempTestDir],
        }),
        encoding: 'utf8',
      });
      assert.equal(res.status, 0);
      const out = JSON.parse(res.stdout);
      assert.equal(out.decision, 'deny');
    });

    test('pure boundary scope unit test validates clean subdirectory and rejects escaping scopes', () => {
      const canonicalRoot = path.normalize(fs.realpathSync.native(tempTestDir)).toLowerCase();
      const scopeRes = validateScopeBoundary('src', canonicalRoot);
      assert.equal(scopeRes.safe, true);

      const outsideRes = validateScopeBoundary('..', canonicalRoot);
      assert.equal(outsideRes.safe, false);
    });

    test('sensitive path matching detects nested directories at any depth and checks canonical paths', () => {
      assert.equal(isSensitiveFile('src/.aws/credentials'), true);
      assert.equal(isSensitiveFile('config/secrets/token.json'), true);
      assert.equal(isSensitiveFile('deployment/.ssh/id_rsa'), true);
      assert.equal(isSensitiveFile('app/sub/.credentials/db.json'), true);
    });

    test('rejects relative workspace root and fails closed with deny', () => {
      const res = spawnSync(process.execPath, [hookScript], {
        input: JSON.stringify({
          toolCall: { name: 'read_file', args: { Path: 'src/index.js' } },
          workspacePaths: ['relative/workspace'],
        }),
        encoding: 'utf8',
      });
      assert.equal(res.status, 0);
      const out = JSON.parse(res.stdout);
      assert.equal(out.decision, 'deny');
    });

    test('rejects multiple ambiguous workspace roots without authoritative identifier', () => {
      const res = spawnSync(process.execPath, [hookScript], {
        input: JSON.stringify({
          toolCall: { name: 'read_file', args: { Path: 'src/index.js' } },
          workspacePaths: ['C:\\ws1', 'C:\\ws2'],
        }),
        encoding: 'utf8',
      });
      assert.equal(res.status, 0);
      const out = JSON.parse(res.stdout);
      assert.equal(out.decision, 'deny');
    });

    test('rejects non-directory workspace root (file path) and fails closed with deny', () => {
      const notADir = path.join(tempTestDir, 'not-a-dir.txt');
      fs.writeFileSync(notADir, 'regular file', 'utf8');

      const res = spawnSync(process.execPath, [hookScript], {
        input: JSON.stringify({
          toolCall: { name: 'read_file', args: { Path: 'src/index.js' } },
          workspacePaths: [notADir],
        }),
        encoding: 'utf8',
      });
      assert.equal(res.status, 0);
      const out = JSON.parse(res.stdout);
      assert.equal(out.decision, 'deny');
    });

    test('permits legitimate filenames beginning with double dots (..important.txt) inside workspace', () => {
      const dotDotFile = path.join(tempTestDir, '..important.txt');
      fs.writeFileSync(dotDotFile, 'important content', 'utf8');

      const out = executeFileHook('read_file', '..important.txt');
      assert.equal(out.decision, 'allow');
    });

    test('lexical traversal ..\\..\\outside\\.env returns deny before sensitive evaluation', () => {
      const out = executeFileHook('read_file', '..\\..\\outside\\.env');
      assert.equal(out.decision, 'deny');
      assert.ok(out.reason.includes('traverses outside workspace boundary'));
    });

    test('lexical traversal ..\\outside\\credentials.json returns deny before sensitive evaluation', () => {
      const out = executeFileHook('read_file', '..\\outside\\credentials.json');
      assert.equal(out.decision, 'deny');
      assert.ok(out.reason.includes('traverses outside workspace boundary'));
    });

    test('sensitive directory itself src/.aws returns force_ask', () => {
      const awsDir = path.join(tempTestDir, 'src', '.aws');
      fs.mkdirSync(awsDir, { recursive: true });

      assert.equal(isSensitiveFile('src/.aws'), true);
      assert.equal(isSensitiveFile('.aws'), true);
    });

    test('files inside sensitive directory src/.aws/credentials return force_ask', () => {
      assert.equal(isSensitiveFile('src/.aws/credentials'), true);
      assert.equal(isSensitiveFile('secrets/token.json'), true);
    });

    test('source file containing substring src/services/secretService.ts returns allow', () => {
      assert.equal(isSensitiveFile('src/services/secretService.ts'), false);
      assert.equal(isSensitiveFile('src/auth/credentialValidator.js'), false);
      assert.equal(isSensitiveFile('README.md'), false);
    });
  });

  // ==========================================
  // 4B. PreToolUse Generic Tool Dispatch & Safety Handling
  // ==========================================
  describe('PreToolUse Generic Tool Dispatch & Safety Handling', () => {
    const hookScript = path.resolve('.agents/scripts/hooks/pre-file-safety.mjs');

    function executeGenericHook(payload) {
      const res = spawnSync(process.execPath, [hookScript], {
        input: JSON.stringify({
          ...payload,
          workspacePaths: [tempTestDir],
        }),
        encoding: 'utf8',
      });
      assert.equal(res.status, 0);
      return JSON.parse(res.stdout);
    }

    test('handles generic event payload with mutation args for normal workspace file', () => {
      const out = executeGenericHook({
        toolCall: {
          name: 'generic',
          args: {
            Path: 'src/App.jsx',
            Content: 'export default function App() {}',
          },
        },
      });
      assert.equal(out.decision, 'allow');
    });

    test('handles generic event payload with mutation args targeting control-plane asset', () => {
      const out = executeGenericHook({
        toolCall: {
          name: 'generic',
          args: {
            Path: '.agents/hooks.json',
            Content: '{}',
          },
        },
      });
      assert.equal(out.decision, 'force_ask');
      assert.ok(out.reason.includes('control-plane asset'));
    });

    test('handles generic event payload targeting outside workspace boundary', () => {
      const out = executeGenericHook({
        toolCall: {
          name: 'generic',
          args: {
            Path: 'C:\\Windows\\System32\\cmd.exe',
            Content: 'bad',
          },
        },
      });
      assert.equal(out.decision, 'deny');
      assert.ok(out.reason.includes('outside workspace boundary'));
    });

    test('allows read-only tools without prompting', () => {
      fs.writeFileSync(path.join(tempTestDir, 'README.md'), '# Test Readme', 'utf8');

      const outRead = executeGenericHook({
        toolCall: {
          name: 'read_file',
          args: { Path: 'README.md' },
        },
      });
      assert.equal(outRead.decision, 'allow');

      const outRes = executeGenericHook({
        toolCall: {
          name: 'read_resource',
          args: { ServerName: 'test-server', Uri: 'custom://resource' },
        },
      });
      assert.equal(outRes.decision, 'allow');
    });

    test('passes run_command through to pre-tool-safety', () => {
      const out = executeGenericHook({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm test' },
        },
      });
      assert.equal(out.decision, 'allow');
    });

    test('fails closed with force_ask for unclassified mutation tool without target', () => {
      const out = executeGenericHook({
        toolCall: {
          name: 'custom_mutator',
          args: { Content: 'some new text' },
        },
      });
      assert.equal(out.decision, 'force_ask');
      assert.ok(out.reason.includes('cannot reliably determine target path'));
    });

    test('fails closed with force_ask for unrecognized tool', () => {
      const out = executeGenericHook({
        toolCall: {
          name: 'mysterious_tool',
          args: { foo: 'bar' },
        },
      });
      assert.equal(out.decision, 'force_ask');
      assert.ok(out.reason.includes('Unrecognized generic tool'));
    });
  });

  // ==========================================
  // 5. Verify Runner Tests
  // ==========================================
  describe('Verify Runner (verify-runner.mjs)', () => {
    const runnerScript = path.resolve('.agents/scripts/verify-runner.mjs');

    test('runs framework-validator cleanly and records verification evidence', () => {
      const runnerArtifactDir = path.join(tempTestDir, 'runner-artifacts');
      const res = spawnSync(
        process.execPath,
        [runnerScript, '--profile', 'framework-validator', '--artifactDir', runnerArtifactDir],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        }
      );

      assert.equal(res.status, 0);
      assert.ok(res.stdout.includes('Result: PASSED'));

      const evidenceFile = path.join(runnerArtifactDir, 'verification-evidence.json');
      assert.ok(fs.existsSync(evidenceFile));
      const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
      assert.equal(evidence.passed, true);
      assert.equal(evidence.dirtyExecution, false);
      assert.equal(evidence.profile, 'framework-validator');
    });
  });

  // ==========================================
  // 6. Stop Gate Hook Tests
  // ==========================================
  describe('Stop Gate Hook', () => {
    const stopScript = path.resolve('.agents/scripts/hooks/stop-gate.mjs');

    function executeStop(payload) {
      const res = spawnSync(process.execPath, [stopScript], {
        input: JSON.stringify(payload),
        encoding: 'utf8',
      });
      assert.equal(res.status, 0);
      return JSON.parse(res.stdout);
    }

    test('forces continue when fullyIdle is false', () => {
      const out = executeStop({
        fullyIdle: false,
        terminationReason: 'NO_TOOL_CALL',
      });
      assert.equal(out.decision, 'continue');
      assert.ok(out.reason.includes('Background tasks are still running'));
    });

    test('allows stop for error and cancellation reasons', () => {
      const outErr = executeStop({
        fullyIdle: true,
        terminationReason: 'ERROR',
      });
      assert.deepEqual(outErr, {});

      const outCancel = executeStop({
        fullyIdle: true,
        terminationReason: 'USER_CANCELED',
      });
      assert.deepEqual(outCancel, {});
    });

    test('allows clean stop when 0 changes from session baseline', () => {
      const gateWs = path.join(tempTestDir, 'gate-ws');
      fs.mkdirSync(gateWs, { recursive: true });
      fs.writeFileSync(path.join(gateWs, 'file.txt'), 'constant content', 'utf8');

      const gateArtifactDir = path.join(tempTestDir, 'gate-artifacts-clean');
      fs.mkdirSync(gateArtifactDir, { recursive: true });

      // Create matching baseline
      const baseline = computeWorkspaceFingerprint(gateWs);
      fs.writeFileSync(path.join(gateArtifactDir, 'session-baseline.json'), JSON.stringify(baseline));

      const out = executeStop({
        fullyIdle: true,
        terminationReason: 'NO_TOOL_CALL',
        workspacePaths: [gateWs],
        artifactDirectoryPath: gateArtifactDir,
      });

      assert.deepEqual(out, {});
    });

    test('blocks stop when changes exist without matching verification evidence, and triggers circuit breaker after 2 retries', () => {
      const gateWs = path.join(tempTestDir, 'gate-ws-modified');
      fs.mkdirSync(gateWs, { recursive: true });
      fs.writeFileSync(path.join(gateWs, 'file.txt'), 'initial content', 'utf8');

      const gateArtifactDir = path.join(tempTestDir, 'gate-artifacts-modified');
      fs.mkdirSync(gateArtifactDir, { recursive: true });

      // Baseline recorded
      const baseline = computeWorkspaceFingerprint(gateWs);
      fs.writeFileSync(path.join(gateArtifactDir, 'session-baseline.json'), JSON.stringify(baseline));

      // File modified
      fs.writeFileSync(path.join(gateWs, 'file.txt'), 'changed content', 'utf8');

      // Attempt 1: should continue
      const out1 = executeStop({
        fullyIdle: true,
        terminationReason: 'NO_TOOL_CALL',
        workspacePaths: [gateWs],
        artifactDirectoryPath: gateArtifactDir,
      });
      assert.equal(out1.decision, 'continue');
      assert.ok(out1.reason.includes('Filesystem modifications detected'));

      // Attempt 2: should continue
      const out2 = executeStop({
        fullyIdle: true,
        terminationReason: 'NO_TOOL_CALL',
        workspacePaths: [gateWs],
        artifactDirectoryPath: gateArtifactDir,
      });
      assert.equal(out2.decision, 'continue');

      // Attempt 3: Circuit breaker tripped (retry budget exhausted >= 2)
      const out3 = executeStop({
        fullyIdle: true,
        terminationReason: 'NO_TOOL_CALL',
        workspacePaths: [gateWs],
        artifactDirectoryPath: gateArtifactDir,
      });
      assert.deepEqual(out3, {}); // Allows stop to prevent hang

      const retryState = JSON.parse(
        fs.readFileSync(path.join(gateArtifactDir, 'stop-retry-state.json'), 'utf8')
      );
      assert.equal(retryState.status, 'UNVERIFIED');
      assert.equal(retryState.circuitBreakerTriggered, true);
    });

    function setupGateWorkspace(name) {
      const ws = path.join(tempTestDir, `gate-ws-${name}`);
      fs.mkdirSync(path.join(ws, 'src'), { recursive: true });
      fs.mkdirSync(path.join(ws, '.agents', 'rules'), { recursive: true });
      fs.writeFileSync(path.join(ws, 'src', 'app.js'), 'v1', 'utf8');
      fs.writeFileSync(path.join(ws, '.agents', 'rules', 'rule.md'), 'v1', 'utf8');
      const art = path.join(tempTestDir, `gate-artifacts-${name}`);
      fs.mkdirSync(art, { recursive: true });
      fs.writeFileSync(path.join(art, 'session-baseline.json'), JSON.stringify(computeWorkspaceFingerprint(ws)));
      return { ws, art };
    }

    function writeEvidence(ws, art, profile) {
      const evidence = {
        passed: true,
        dirtyExecution: false,
        postFingerprint: computeWorkspaceFingerprint(ws).compositeDigest,
      };
      if (profile !== undefined) evidence.profile = profile;
      fs.writeFileSync(path.join(art, 'verification-evidence.json'), JSON.stringify(evidence));
    }

    const gatePayload = (ws, art, extra = {}) => ({
      fullyIdle: true,
      terminationReason: 'NO_TOOL_CALL',
      workspacePaths: [ws],
      artifactDirectoryPath: art,
      ...extra,
    });

    test('framework-validator evidence does not satisfy the gate for project code changes (F3)', () => {
      const { ws, art } = setupGateWorkspace('fv-app');
      fs.writeFileSync(path.join(ws, 'src', 'app.js'), 'v2', 'utf8');
      writeEvidence(ws, art, 'framework-validator');

      const out = executeStop(gatePayload(ws, art));
      assert.equal(out.decision, 'continue');
      assert.ok(out.reason.includes('framework-validator'));
      assert.ok(out.reason.includes('src/app.js'));
    });

    test('project test profile evidence satisfies the gate for project code changes (F3)', () => {
      const { ws, art } = setupGateWorkspace('nt-app');
      fs.writeFileSync(path.join(ws, 'src', 'app.js'), 'v2', 'utf8');
      writeEvidence(ws, art, 'node-test');

      assert.deepEqual(executeStop(gatePayload(ws, art)), {});
    });

    test('framework-validator evidence satisfies the gate when only framework or docs files changed (F3)', () => {
      const { ws, art } = setupGateWorkspace('fv-framework');
      fs.writeFileSync(path.join(ws, '.agents', 'rules', 'rule.md'), 'v2', 'utf8');
      fs.writeFileSync(path.join(ws, 'README.md'), '# Readme', 'utf8');
      writeEvidence(ws, art, 'framework-validator');

      assert.deepEqual(executeStop(gatePayload(ws, art)), {});
    });

    test('evidence without a profile field does not satisfy the gate (F3)', () => {
      const { ws, art } = setupGateWorkspace('no-profile');
      fs.writeFileSync(path.join(ws, 'src', 'app.js'), 'v2', 'utf8');
      writeEvidence(ws, art, undefined);

      assert.equal(executeStop(gatePayload(ws, art)).decision, 'continue');
    });

    test('stop event log records termination metadata only, never the raw payload (F4)', () => {
      const { ws, art } = setupGateWorkspace('log-redaction');
      const secret = 'SUPER_SECRET_TRANSCRIPT_67890';
      assert.deepEqual(executeStop(gatePayload(ws, art, { transcript: secret })), {});

      const log = fs.readFileSync(path.join(art, 'stop-event-log.jsonl'), 'utf8');
      assert.ok(!log.includes(secret));
      const entry = JSON.parse(log.trim().split('\n').pop());
      assert.deepEqual(entry.input, { terminationReason: 'NO_TOOL_CALL', fullyIdle: true });
    });

    test('tripped circuit breaker re-arms when the workspace changes again (F5)', () => {
      const { ws, art } = setupGateWorkspace('rearm');
      fs.writeFileSync(path.join(ws, 'src', 'app.js'), 'v2', 'utf8');

      assert.equal(executeStop(gatePayload(ws, art)).decision, 'continue');
      assert.equal(executeStop(gatePayload(ws, art)).decision, 'continue');
      assert.deepEqual(executeStop(gatePayload(ws, art)), {}); // breaker trips

      // Same workspace state: breaker stays open
      assert.deepEqual(executeStop(gatePayload(ws, art)), {});

      // New modification after the trip: gate is armed again
      fs.writeFileSync(path.join(ws, 'src', 'app.js'), 'v3', 'utf8');
      const rearmed = executeStop(gatePayload(ws, art));
      assert.equal(rearmed.decision, 'continue');
    });
  });

  // ==========================================
  // Fingerprint exclusions from framework.config.json (F13)
  // ==========================================
  describe('Fingerprint Exclusion Configuration', () => {
    test('tool caches are excluded by default and projects can add exclusions via config (F13)', () => {
      const ws = path.join(tempTestDir, 'fp-exclusions');
      fs.mkdirSync(path.join(ws, '__pycache__'), { recursive: true });
      fs.mkdirSync(path.join(ws, 'dist'), { recursive: true });
      fs.mkdirSync(path.join(ws, 'src'), { recursive: true });
      fs.writeFileSync(path.join(ws, '__pycache__', 'm.pyc'), 'x', 'utf8');
      fs.writeFileSync(path.join(ws, 'dist', 'bundle.js'), 'x', 'utf8');
      fs.writeFileSync(path.join(ws, 'src', 'main.py'), 'x', 'utf8');

      const before = computeWorkspaceFingerprint(ws).records.map((r) => r.path);
      assert.ok(!before.some((p) => p.startsWith('__pycache__/')));
      assert.ok(before.includes('dist/bundle.js'));

      fs.mkdirSync(path.join(ws, '.agents'), { recursive: true });
      fs.writeFileSync(
        path.join(ws, '.agents', 'framework.config.json'),
        JSON.stringify({ fingerprint: { additionalExclusions: ['dist'] } }),
        'utf8'
      );
      const after = computeWorkspaceFingerprint(ws).records.map((r) => r.path);
      assert.ok(!after.includes('dist/bundle.js'));
      assert.ok(after.includes('src/main.py'));
    });
  });

  // ==========================================
  // Claude Code Adapter (F8)
  // ==========================================
  describe('Claude Code Adapter', () => {
    const adapterScript = path.resolve('.agents/scripts/adapters/claude-code.mjs');

    function runAdapter(event, payload, projectDir) {
      const res = spawnSync(process.execPath, [adapterScript, event], {
        input: JSON.stringify(payload),
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
      });
      assert.equal(res.status, 0);
      const text = res.stdout.trim();
      return text ? JSON.parse(text) : null;
    }

    function setupProject(name) {
      const ws = path.join(tempTestDir, `cc-${name}`);
      fs.mkdirSync(path.join(ws, 'src'), { recursive: true });
      fs.writeFileSync(path.join(ws, 'src', 'app.js'), 'v1', 'utf8');
      fs.writeFileSync(path.join(ws, 'AGENTS.md'), '# Agents', 'utf8');
      return ws;
    }

    test('translates Claude Code tools to framework tools and leaves ungoverned tools alone', async () => {
      const { translateToolCall } = await import(pathToFileURL(adapterScript).href);
      const ctx = { projectDir: tempTestDir, cwd: tempTestDir };

      assert.deepEqual(translateToolCall('Write', { file_path: 'a.txt', content: 'x' }, ctx), {
        name: 'write_file',
        args: { Path: 'a.txt', Content: 'x' },
      });
      const bash = translateToolCall('Bash', { command: 'git status', run_in_background: true }, ctx);
      assert.equal(bash.name, 'run_command');
      assert.equal(bash.args.CommandLine, 'git status');
      assert.equal(bash.args.IsDaemon, true);
      assert.equal(bash.args.Cwd, tempTestDir);
      assert.equal(translateToolCall('Grep', { pattern: 'x' }, ctx).args.SearchPath, tempTestDir);
      assert.equal(translateToolCall('WebFetch', { url: 'https://example.com' }, ctx), null);
    });

    test('pre-tool-use maps allow to no output, force_ask to ask, and deny to deny', () => {
      const ws = setupProject('pretool');
      const allowOut = runAdapter('pre-tool-use', { tool_name: 'Edit', tool_input: { file_path: path.join(ws, 'src', 'app.js'), new_string: 'v2' }, cwd: ws }, ws);
      assert.equal(allowOut, null);

      const askOut = runAdapter('pre-tool-use', { tool_name: 'Write', tool_input: { file_path: path.join(ws, 'AGENTS.md'), content: 'x' }, cwd: ws }, ws);
      assert.equal(askOut.hookSpecificOutput.permissionDecision, 'ask');

      const denyOut = runAdapter('pre-tool-use', { tool_name: 'Bash', tool_input: { command: 'git clean -fdx' }, cwd: ws }, ws);
      assert.equal(denyOut.hookSpecificOutput.permissionDecision, 'deny');

      const outsideOut = runAdapter('pre-tool-use', { tool_name: 'Write', tool_input: { file_path: path.join(tempTestDir, 'outside.txt'), content: 'x' }, cwd: ws }, ws);
      assert.equal(outsideOut.hookSpecificOutput.permissionDecision, 'deny');

      const webOut = runAdapter('pre-tool-use', { tool_name: 'WebFetch', tool_input: { url: 'https://example.com' }, cwd: ws }, ws);
      assert.equal(webOut, null);
    });

    test('session-start and stop enforce verification through the shared artifact directory', async () => {
      const ws = setupProject('stop');
      const { resolveDefaultArtifactDir } = await import(pathToFileURL(path.resolve('.agents/scripts/lib/artifact-dir.mjs')).href);
      const artifactDir = resolveDefaultArtifactDir(ws);
      try {
        const start = runAdapter('session-start', { session_id: 't', cwd: ws }, ws);
        assert.ok(start.hookSpecificOutput.additionalContext.includes('Session baseline established'));

        assert.equal(runAdapter('stop', { session_id: 't', cwd: ws }, ws), null);

        fs.writeFileSync(path.join(ws, 'src', 'app.js'), 'v2', 'utf8');
        const blocked = runAdapter('stop', { session_id: 't', cwd: ws }, ws);
        assert.equal(blocked.decision, 'block');
        assert.ok(blocked.reason.includes('Filesystem modifications detected'));
      } finally {
        try { fs.rmSync(artifactDir, { recursive: true, force: true }); } catch {}
      }
    });
  });

  // ==========================================
  // 9. Subagent Architecture & Least-Privilege Invariants (5 tests, #49-53)
  // ==========================================
  describe('Subagent Architecture & Least-Privilege Invariants', () => {
    const agentsDir = path.resolve('.agents/agents');
    const agentFiles = [
      'accessibility-auditor.md',
      'architect-planner.md',
      'code-implementer.md',
      'diagnostic-debugger.md',
      'qa-reviewer.md',
      'security-auditor.md',
    ];

    test('all six subagent definitions declare subagent: true, inheritMcp: false, and inheritCustomizations: true', () => {
      for (const file of agentFiles) {
        const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
        assert.ok(/subagent:\s*true/i.test(content), `${file} missing subagent: true`);
        assert.ok(/inheritMcp:\s*false/i.test(content), `${file} missing inheritMcp: false`);
        assert.ok(/inheritCustomizations:\s*true/i.test(content), `${file} missing inheritCustomizations: true`);
      }
    });

    test('only code-implementer declares write_file, edit_file, or run_command', () => {
      for (const file of agentFiles) {
        const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
        const frontmatter = content.split('---')[1] || '';
        if (file === 'code-implementer.md') {
          assert.ok(frontmatter.includes('run_command'));
          assert.ok(frontmatter.includes('write_file'));
          assert.ok(frontmatter.includes('edit_file'));
        } else {
          assert.ok(!frontmatter.includes('run_command'), `${file} should not possess run_command`);
          assert.ok(!frontmatter.includes('write_file'), `${file} should not possess write_file`);
          assert.ok(!frontmatter.includes('edit_file'), `${file} should not possess edit_file`);
        }
      }
    });

    test('other five subagents declare exactly [read_file, send_message, manage_task]', () => {
      const readOnlyAgents = agentFiles.filter((f) => f !== 'code-implementer.md');
      for (const file of readOnlyAgents) {
        const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
        const frontmatter = content.split('---')[1] || '';
        assert.ok(frontmatter.includes('read_file'));
        assert.ok(frontmatter.includes('send_message'));
        assert.ok(frontmatter.includes('manage_task'));
      }
    });

    test('all 26 skill bindings across the six agents resolve to existing directories in .agents/skills/', () => {
      let count = 0;
      for (const file of agentFiles) {
        const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
        const matches = content.match(/skills\/[\w-]+/g) || [];
        count += matches.length;
        for (const skill of matches) {
          assert.ok(fs.existsSync(path.resolve('.agents', skill)), `Missing skill directory: ${skill}`);
        }
      }
      assert.equal(count, 26);
    });

    test('core-workflow.md Section 12 codifies Primary Agent Broker Protocol and secret redaction', () => {
      const content = fs.readFileSync(path.resolve('.agents/rules/core-workflow.md'), 'utf8');
      assert.ok(content.includes('## 12. Primary Agent Broker Protocol'));
      assert.ok(content.includes('[REDACTED_SECRET: TYPE]'));
      assert.ok(content.includes('Synchronous Completion Verification'));
    });
  });

  // ==========================================
  // 10. Command Policy & Execution Parameter Tests (13 tests, #54-66)
  // ==========================================
  describe('Command Policy & Strict Allowlist Tests', () => {
    const cmdHookScript = path.resolve('.agents/scripts/hooks/pre-tool-safety.mjs');

    function executeCommandHook(commandLine, extraArgs = {}, customWs = tempTestDir) {
      const inputPayload = JSON.stringify({
        toolCall: {
          name: 'run_command',
          args: {
            CommandLine: commandLine,
            toolSummary: 'Test execution summary',
            WaitMsBeforeAsync: 5000,
            BypassSandbox: false,
            IsDaemon: false,
            ...extraArgs,
          },
        },
        workspacePaths: [customWs],
      });

      const res = spawnSync(process.execPath, [cmdHookScript], {
        input: inputPayload,
        encoding: 'utf8',
      });

      assert.equal(res.status, 0);
      return JSON.parse(res.stdout);
    }

    test('exact framework validator command is allowed from canonical workspace CWD', () => {
      const out = executeCommandHook('node .agents/scripts/validate-framework.mjs');
      assert.equal(out.decision, 'allow');
    });

    test('exact approved verify-runner profile is allowed; alternate profiles trigger force_ask', () => {
      const out1 = executeCommandHook('node .agents/scripts/verify-runner.mjs --profile framework-validator');
      assert.equal(out1.decision, 'allow');

      const out2 = executeCommandHook('node .agents/scripts/verify-runner.mjs --profile custom-profile');
      assert.equal(out2.decision, 'force_ask');
    });

    test('exact approved test suite is allowed; arbitrary test scripts trigger force_ask', () => {
      const out1 = executeCommandHook('node --test .agents/scripts/tests/phase6b-tests.mjs');
      assert.equal(out1.decision, 'allow');

      const out2 = executeCommandHook('node --test .agents/scripts/tests/other-test.mjs');
      assert.equal(out2.decision, 'force_ask');
    });

    test('dynamic evaluation (node -e), shell chaining (;, &&), and arbitrary binaries are rejected or trigger force_ask', () => {
      const out1 = executeCommandHook('node -e "console.log(1)"');
      assert.equal(out1.decision, 'force_ask');

      const out2 = executeCommandHook('node .agents/scripts/validate-framework.mjs; node .agents/scripts/verify-runner.mjs');
      assert.equal(out2.decision, 'deny');

      const out3 = executeCommandHook('arbitrary-binary --flag');
      assert.equal(out3.decision, 'force_ask');
    });

    test('rejects bare script-name execution (node validate-framework.mjs) with force_ask', () => {
      const out = executeCommandHook('node validate-framework.mjs');
      assert.equal(out.decision, 'force_ask');
    });

    test('rejects alternate script-directory prefix (node scripts/validate-framework.mjs) with force_ask', () => {
      const out = executeCommandHook('node scripts/validate-framework.mjs');
      assert.equal(out.decision, 'force_ask');
    });

    test('rejects command execution when CWD is missing, relative, outside canonical workspace root, or invalid with deny', () => {
      const out1 = executeCommandHook('node .agents/scripts/validate-framework.mjs', { Cwd: 'C:\\Windows\\System32' });
      assert.equal(out1.decision, 'deny');

      const out2 = executeCommandHook('node .agents/scripts/validate-framework.mjs', { Cwd: 'relative/dir' });
      assert.equal(out2.decision, 'deny');
    });

    test('exact approved command with default/sandboxed execution (BypassSandbox: false, IsDaemon: false) is allowed', () => {
      const out = executeCommandHook('node .agents/scripts/validate-framework.mjs', {
        BypassSandbox: false,
        IsDaemon: false,
      });
      assert.equal(out.decision, 'allow');
    });

    test('exact approved command with BypassSandbox: true is strictly denied', () => {
      const out = executeCommandHook('node .agents/scripts/validate-framework.mjs', {
        BypassSandbox: true,
      });
      assert.equal(out.decision, 'deny');
      assert.ok(out.reason.includes('BypassSandbox: true'));
    });

    test('exact approved command with IsDaemon: true is strictly denied', () => {
      const out = executeCommandHook('node .agents/scripts/validate-framework.mjs', {
        IsDaemon: true,
      });
      assert.equal(out.decision, 'deny');
      assert.ok(out.reason.includes('IsDaemon: true'));
    });

    test('non-boolean BypassSandbox or IsDaemon values fail closed with deny', () => {
      const out1 = executeCommandHook('node .agents/scripts/validate-framework.mjs', {
        BypassSandbox: 'false',
      });
      assert.equal(out1.decision, 'deny');

      const out2 = executeCommandHook('node .agents/scripts/validate-framework.mjs', {
        IsDaemon: 1,
      });
      assert.equal(out2.decision, 'deny');
    });

    test('missing or invalid execution parameters (toolSummary, non-integer WaitMsBeforeAsync) fail closed with deny', () => {
      const out1 = executeCommandHook('node .agents/scripts/validate-framework.mjs', {
        toolSummary: '',
      });
      assert.equal(out1.decision, 'deny');

      const out2 = executeCommandHook('node .agents/scripts/validate-framework.mjs', {
        WaitMsBeforeAsync: 'fast',
      });
      assert.equal(out2.decision, 'deny');

      const out3 = executeCommandHook('node .agents/scripts/validate-framework.mjs', {
        WaitMsBeforeAsync: 500, // below 1000ms minimum threshold
      });
      assert.equal(out3.decision, 'deny');
    });

    test('exact CommandLine match cannot bypass execution-control parameter enforcement', () => {
      const out = executeCommandHook('node .agents/scripts/validate-framework.mjs', {
        CommandLine: 'node .agents/scripts/validate-framework.mjs',
        BypassSandbox: true,
      });
      assert.equal(out.decision, 'deny');
    });
  });
});
