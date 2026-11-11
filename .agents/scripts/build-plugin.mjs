import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLUGIN_DIR, checkPlugin, writePlugin } from './lib/plugin-build.mjs';

/**
 * Generates the Claude Code plugin from the framework sources.
 *
 *   node .agents/scripts/build-plugin.mjs [--root <dir>]            write the plugin
 *   node .agents/scripts/build-plugin.mjs [--root <dir>] --check    exit 1 when the committed plugin differs
 */

function main(argv) {
  const rootIndex = argv.indexOf('--root');
  const root = path.resolve(rootIndex !== -1 && argv[rootIndex + 1] ? argv[rootIndex + 1] : process.cwd());
  if (argv.includes('--check')) {
    const { missing, changed, extra } = checkPlugin(root);
    const problems = [...missing.map((f) => `missing: ${f}`), ...changed.map((f) => `changed: ${f}`), ...extra.map((f) => `unexpected: ${f}`)];
    if (problems.length) {
      process.stderr.write(`${PLUGIN_DIR} is out of date (${problems.length} file(s)). Run: node .agents/scripts/build-plugin.mjs\n${problems.slice(0, 20).join('\n')}\n`);
      return 1;
    }
    process.stdout.write(`${PLUGIN_DIR} matches the framework sources.\n`);
    return 0;
  }
  const { written, removed } = writePlugin(root);
  process.stdout.write(`Wrote ${written} files to ${PLUGIN_DIR}${removed.length ? `, removed ${removed.length} stale file(s)` : ''}.\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`build-plugin: ${error.message}\n`);
    process.exitCode = 1;
  }
}
