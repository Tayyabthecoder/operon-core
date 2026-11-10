import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globToRegExp, matchesAnyGlob } from '../lib/glob-match.mjs';
import { rulePaths, isConditionalRule } from '../lib/rule-metadata.mjs';

const rulesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'rules');

function patternsOf(ruleFile) {
  return rulePaths(fs.readFileSync(path.join(rulesDir, ruleFile), 'utf8'));
}

// Sample workspace paths each domain rule must (and must not) load for.
const DOMAIN_RULES = {
  'frontend.md': {
    load: ['src/App.tsx', 'web/index.jsx', 'ui/Card.vue', 'a/b/page.svelte', 'public/index.html', 'src/app.css', 'styles/main.scss'],
    skip: ['src/server.ts', 'README.md', 'db/schema.sql'],
  },
  'accessibility.md': {
    load: ['src/App.tsx', 'ui/Card.vue', 'public/index.html', 'a/page.svelte', 'x/y.jsx'],
    skip: ['src/app.css', 'styles/main.scss', 'src/server.ts'],
  },
  'backend.md': {
    load: ['routes/users.js', 'src/controllers/auth.ts', 'app/services/mail.py', 'src/middleware/cors.ts', 'src/repositories/user.ts'],
    skip: ['src/App.tsx', 'docs/overview.md', 'src/utils/format.ts'],
  },
  'api-design.md': {
    load: ['api/v1/users.ts', 'src/api/handlers.go', 'routes/orders.js', 'src/controllers/x.ts', 'openapi.yaml', 'docs/openapi-v2.yml', 'spec/openapi.json', 'swagger.json'],
    skip: ['src/App.tsx', 'package.json', 'src/utils/format.ts'],
  },
  'database.md': {
    load: ['db/schema.sql', 'prisma/schema.prisma', 'db/migrations/001_init.js', 'app/migrations/0002.py'],
    skip: ['src/App.tsx', 'docs/database.md', 'src/db.ts'],
  },
  'deployment.md': {
    load: ['Dockerfile', 'services/api/Dockerfile.prod', 'docker-compose.yml', 'ops/docker-compose.override.yaml', '.github/workflows/ci.yml', 'infra/main.tf', 'deploy/k8s/app.yaml', 'charts/helm/values.yaml', 'vercel.json'],
    skip: ['src/App.tsx', 'package.json', 'src/dockerfile-notes.ts'],
  },
  'testing.md': {
    load: ['src/a.test.ts', 'src/a.spec.js', 'tests/unit/a.js', 'test/b.js', 'src/__tests__/c.ts', 'pkg/util_test.go', 'tests/test_math.py', 'lib/test_math.py'],
    skip: ['src/App.tsx', 'README.md', 'src/contest.ts'],
  },
  'documentation.md': {
    load: ['docs/api/README.md', 'docs/guide.md', 'README.md', 'pkg/README.md', 'CHANGELOG.md', 'pkg/CHANGELOG.md'],
    skip: ['src/App.tsx', 'notes.md', 'src/readme-helper.ts'],
  },
};

describe('Rule path globs', () => {
  test('globToRegExp handles ** at start, middle, and end plus single * and ?', () => {
    assert.ok(globToRegExp('**/*.tsx').test('a/b/c.tsx'));
    assert.ok(globToRegExp('**/*.tsx').test('c.tsx'));
    assert.ok(!globToRegExp('**/*.tsx').test('a/b/c.ts'));
    assert.ok(globToRegExp('docs/**').test('docs/a/b.md'));
    assert.ok(!globToRegExp('docs/**').test('mydocs/a.md'));
    assert.ok(globToRegExp('**/tests/**').test('x/tests/y.js'));
    assert.ok(globToRegExp('**/tests/**').test('tests/y.js'));
    assert.ok(!globToRegExp('*.md').test('docs/a.md'), 'single * must not cross directories');
    assert.ok(globToRegExp('a?.md').test('ab.md'));
    assert.ok(globToRegExp('**/*.test.*').test('src\\a.test.ts'.replace(/\\/g, '/')));
  });

  test('matchesAnyGlob accepts Windows separators and a leading ./', () => {
    assert.ok(matchesAnyGlob(['**/tests/**'], 'src\\tests\\a.js'));
    assert.ok(matchesAnyGlob(['docs/**'], './docs/a.md'));
  });

  test('rulePaths reads quoted entries and returns [] when absent', () => {
    assert.deepEqual(rulePaths('---\ntrigger: glob\npaths:\n  - "**/*.py"\n  - \'**/*.pyi\'\nsource: x\n---\n'), ['**/*.py', '**/*.pyi']);
    assert.deepEqual(rulePaths('---\ntrigger: always_on\n---\n'), []);
    assert.deepEqual(rulePaths('no frontmatter'), []);
  });

  for (const [ruleFile, samples] of Object.entries(DOMAIN_RULES)) {
    test(`${ruleFile}: loads for matching files and not for unrelated ones`, () => {
      const globs = patternsOf(ruleFile);
      assert.ok(globs.length > 0, `${ruleFile} declares no paths`);
      for (const file of samples.load) assert.ok(matchesAnyGlob(globs, file), `${ruleFile} should load for ${file}`);
      for (const file of samples.skip) assert.ok(!matchesAnyGlob(globs, file), `${ruleFile} should not load for ${file}`);
    });
  }

  test('every conditional rule has well-formed, brace-free globs that match a file built from them', () => {
    const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md'));
    let checked = 0;
    for (const file of files) {
      const text = fs.readFileSync(path.join(rulesDir, file), 'utf8');
      if (!isConditionalRule(text)) continue;
      const globs = rulePaths(text);
      assert.ok(globs.length > 0, `${file} has an empty paths list`);
      for (const glob of globs) {
        assert.ok(!/[{}[\]]/.test(glob), `${file}: unsupported glob syntax in "${glob}"`);
        const sample = glob.replace(/\*\*\//g, 'dir/').replace(/\/\*\*$/, '/dir/file.x').replace(/\*/g, 'name');
        assert.ok(matchesAnyGlob([glob], sample), `${file}: glob "${glob}" does not match its own sample "${sample}"`);
      }
      checked++;
    }
    assert.ok(checked >= 100, `expected 100+ conditional rules, checked ${checked}`);
  });

  test('every domain rule in the table is still conditional', () => {
    for (const ruleFile of Object.keys(DOMAIN_RULES)) {
      assert.ok(isConditionalRule(fs.readFileSync(path.join(rulesDir, ruleFile), 'utf8')), `${ruleFile} lost its paths:`);
    }
  });
});
