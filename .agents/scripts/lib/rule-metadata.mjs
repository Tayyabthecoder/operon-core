/**
 * Rule frontmatter helpers shared by the Claude Code setup and the context cost report.
 *
 * Framework rules carry Antigravity-style frontmatter (`trigger: always_on | model_decision | glob`)
 * and, for rules tied to file types, a `paths:` list that Claude Code uses for conditional loading.
 */

/**
 * @param {string} text
 * @returns {string|null} Frontmatter block without the delimiters, or null when absent
 */
export function frontmatterOf(text) {
  const match = String(text).replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

/**
 * A rule is conditional in Claude Code when its frontmatter declares `paths:`.
 * @param {string} text
 * @returns {boolean}
 */
export function isConditionalRule(text) {
  const front = frontmatterOf(text);
  return front !== null && /^paths:/m.test(front);
}

/**
 * @param {string} text
 * @returns {string|null} The `trigger` value (always_on, model_decision, glob), if any
 */
export function ruleTrigger(text) {
  const front = frontmatterOf(text);
  const match = front && front.match(/^trigger:\s*(\S+)/m);
  return match ? match[1] : null;
}

/**
 * How a rule reaches the agent in Claude Code:
 * - `conditional`: has `paths:`; loaded when matching files are touched.
 * - `on-demand`: declared `model_decision` without `paths:`; not loaded automatically, the agent
 *   reads it through the link list in AGENTS.md when the task calls for it.
 * - `session-start`: everything else (for example `always_on`); loaded at session start.
 * @param {string} text
 * @returns {'conditional'|'on-demand'|'session-start'}
 */
export function claudeCodeRuleLoading(text) {
  if (isConditionalRule(text)) return 'conditional';
  return ruleTrigger(text) === 'model_decision' ? 'on-demand' : 'session-start';
}
