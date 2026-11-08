import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {
  serializeCanonical,
  computeFileHash,
  computeWorkspaceFingerprint,
  diffManifests,
} from '../lib/workspace-fingerprint.mjs';

describe('Focused Test: Workspace Fingerprint Library', () => {
  let tempTestDir;

  before(() => {
    tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-fingerprint-test-'));
  });

  after(() => {
    try {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors on Windows
    }
  });

  test('serializeCanonical produces deterministic JSON with sorted keys', () => {
    const obj1 = { z: 1, a: 2, m: { y: 10, b: 20 } };
    const obj2 = { a: 2, m: { b: 20, y: 10 }, z: 1 };
    assert.equal(serializeCanonical(obj1), serializeCanonical(obj2));
    assert.equal(serializeCanonical(obj1), '{"a":2,"m":{"b":20,"y":10},"z":1}');
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
    const testWs = path.join(tempTestDir, 'ws1');
    fs.mkdirSync(path.join(testWs, 'src'), { recursive: true });
    fs.writeFileSync(path.join(testWs, 'README.md'), '# Test Project', 'utf8');
    fs.writeFileSync(path.join(testWs, 'src', 'index.js'), 'console.log("hi");', 'utf8');

    const manifest1 = computeWorkspaceFingerprint(testWs);
    assert.equal(manifest1.fileCount, 2);
    assert.equal(manifest1.records.length, 2);
    assert.ok(manifest1.compositeDigest);

    const manifest2 = computeWorkspaceFingerprint(testWs);
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
    assert.equal(diff.modified.length, 1);
    assert.equal(diff.added.length, 1);
  });

  test('excludes .agents/scratch from default traversal', () => {
    const testWs = path.join(tempTestDir, 'scratch-ws');
    fs.mkdirSync(path.join(testWs, '.agents', 'scratch'), { recursive: true });
    fs.writeFileSync(path.join(testWs, 'index.js'), 'console.log(1);', 'utf8');
    fs.writeFileSync(path.join(testWs, '.agents', 'scratch', 'temp.txt'), 'scratch data', 'utf8');

    const manifest = computeWorkspaceFingerprint(testWs);
    assert.equal(manifest.fileCount, 1);
    assert.equal(manifest.records[0].path, 'index.js');
  });
});
