import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Skill Body Audit
 *
 * The validator checks skill frontmatter and links. This report-only audit looks at the bodies:
 * size outliers, missing standard sections, weak descriptions, placeholder text, empty sections,
 * and lines repeated across many skills (boilerplate that costs context every time a skill loads).
 * It measures structure, not whether the advice is good; use skill-comply to measure behavior.
 *
 * Usage:
 *   node .agents/scripts/skill-audit.mjs [--root <dir>] [--json]
 */

const SHARED_LINE_MIN_LENGTH = 60;
const SHARED_LINE_MIN_SKILLS = 5;
const LARGE_SKILL_BYTES = 30000;
const LONG_DESCRIPTION_CHARS = 500;

/**
 * @param {string} text Full SKILL.md text
 * @returns {object} Per-skill structural facts
 */
export function analyzeSkill(text) {
  const clean = String(text).replace(/^﻿/, '');
  const front = (clean.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
  const body = clean.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const description = (front.match(/^description:\s*(.*)$/m) || [])[1] || '';
  const lines = body.split(/\r?\n/);
  const headingTitles = [...body.matchAll(/^#{2,4}\s+(.*)$/gm)].map((m) => m[1]);

  // A section is empty when nothing but blank lines sits between its heading and the next heading
  // of the same or a higher level (a heading directly followed by a sub-heading is a parent, not empty).
  // Lines inside fenced code blocks are ignored so `# comment` lines are not read as headings.
  let inFence = false;
  const headings = [];
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) inFence = !inFence;
    else if (!inFence && /^#{1,4}\s/.test(line)) headings.push({ index: i, level: line.match(/^#+/)[0].length });
  });
  let emptySections = 0;
  headings.forEach((heading, idx) => {
    const next = headings[idx + 1];
    if (next && next.level > heading.level) return;
    const end = next ? next.index : lines.length;
    if (lines.slice(heading.index + 1, end).every((line) => !line.trim())) emptySections++;
  });

  return {
    bytes: Buffer.byteLength(clean),
    descriptionLength: description.length,
    descriptionHasUseWhen: /\buse when\b/i.test(description),
    hasWhenToUse: headingTitles.some((title) => /when to use|trigger|activat/i.test(title)),
    hasWhenNotToUse: /when not to use|do not (?:use|invoke)|not for\b/i.test(body),
    hasWorkflow: headingTitles.some((title) => /workflow|process|procedure|steps|checklist|phase/i.test(title)),
    mentionsVerification: /verif/i.test(body),
    emptySections,
    placeholders: (body.match(/\b(TODO|TBD|FIXME|lorem ipsum)\b/gi) || []).length,
    longLines: [...new Set(lines.map((line) => line.trim()).filter((line) => line.length >= SHARED_LINE_MIN_LENGTH))],
  };
}

/**
 * @param {Record<string, string>} skillTexts Skill name to SKILL.md text
 * @returns {object}
 */
export function auditSkills(skillTexts) {
  const analyses = Object.entries(skillTexts).map(([name, text]) => ({ name, ...analyzeSkill(text) }));
  const owners = new Map();
  for (const skill of analyses) {
    for (const line of skill.longLines) {
      if (!owners.has(line)) owners.set(line, new Set());
      owners.get(line).add(skill.name);
    }
  }
  const sharedLines = [...owners.entries()]
    .filter(([, set]) => set.size >= SHARED_LINE_MIN_SKILLS)
    .sort((a, b) => b[1].size - a[1].size)
    .map(([line, set]) => ({ skills: set.size, line: line.slice(0, 120) }));

  const sizes = analyses.map((s) => s.bytes).sort((a, b) => a - b);
  const names = (predicate) => analyses.filter(predicate).map((s) => s.name);
  return {
    skills: analyses.length,
    totalBytes: sizes.reduce((sum, n) => sum + n, 0),
    medianBytes: sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0,
    largest: [...analyses].sort((a, b) => b.bytes - a.bytes).slice(0, 5).map((s) => ({ name: s.name, bytes: s.bytes })),
    overLargeThreshold: names((s) => s.bytes > LARGE_SKILL_BYTES),
    missingWhenToUse: names((s) => !s.hasWhenToUse),
    missingWhenNotToUse: names((s) => !s.hasWhenNotToUse),
    missingWorkflow: names((s) => !s.hasWorkflow),
    neverMentionsVerification: names((s) => !s.mentionsVerification),
    descriptionWithoutUseWhen: names((s) => !s.descriptionHasUseWhen),
    longDescriptions: analyses.filter((s) => s.descriptionLength > LONG_DESCRIPTION_CHARS).map((s) => ({ name: s.name, chars: s.descriptionLength })),
    emptySections: analyses.filter((s) => s.emptySections).map((s) => ({ name: s.name, count: s.emptySections })),
    placeholders: analyses.filter((s) => s.placeholders).map((s) => ({ name: s.name, count: s.placeholders })),
    sharedLines: { count: sharedLines.length, top: sharedLines.slice(0, 5) },
    thresholds: { largeSkillBytes: LARGE_SKILL_BYTES, longDescriptionChars: LONG_DESCRIPTION_CHARS, sharedLineMinSkills: SHARED_LINE_MIN_SKILLS },
  };
}

/**
 * @param {object} audit
 * @returns {string}
 */
export function formatAudit(audit) {
  const list = (label, items) => items.length ? `${label} (${items.length}): ${items.map((i) => (typeof i === 'string' ? i : `${i.name}${i.bytes ? ` ${i.bytes}B` : ''}${i.chars ? ` ${i.chars} chars` : ''}${i.count ? ` x${i.count}` : ''}`)).join(', ')}` : `${label}: none`;
  return [
    'Skill Body Audit',
    `Skills: ${audit.skills}, total ${audit.totalBytes} bytes (~${Math.round(audit.totalBytes / 4)} est. tokens), median ${audit.medianBytes} bytes`,
    `Largest: ${audit.largest.map((s) => `${s.name} ${s.bytes}B`).join(', ')}`,
    list(`Over ${audit.thresholds.largeSkillBytes} bytes`, audit.overLargeThreshold),
    list('Missing a "When to Use" section', audit.missingWhenToUse),
    list('Missing "When NOT to Use" guidance', audit.missingWhenNotToUse),
    list('Missing a workflow/process/steps section', audit.missingWorkflow),
    list('Never mention verification', audit.neverMentionsVerification),
    list('Description lacks "Use when"', audit.descriptionWithoutUseWhen),
    list(`Descriptions over ${audit.thresholds.longDescriptionChars} chars`, audit.longDescriptions),
    list('Empty sections', audit.emptySections),
    list('TODO/TBD placeholders', audit.placeholders),
    `Lines (${SHARED_LINE_MIN_LENGTH}+ chars) repeated in ${audit.thresholds.sharedLineMinSkills}+ skills: ${audit.sharedLines.count}`,
    ...audit.sharedLines.top.map((s) => `  ${s.skills} skills: ${s.line}`),
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf('--root');
  const rootDir = path.resolve(rootIndex !== -1 && args[rootIndex + 1] ? args[rootIndex + 1] : process.cwd());
  const skillsDir = path.join(rootDir, '.agents', 'skills');
  if (!fs.existsSync(skillsDir)) {
    process.stderr.write(`No skills directory at ${skillsDir}\n`);
    process.exit(1);
  }
  const texts = {};
  for (const name of fs.readdirSync(skillsDir).sort()) {
    const file = path.join(skillsDir, name, 'SKILL.md');
    if (fs.existsSync(file)) texts[name] = fs.readFileSync(file, 'utf8');
  }
  const audit = auditSkills(texts);
  process.stdout.write((args.includes('--json') ? JSON.stringify(audit, null, 2) : formatAudit(audit)) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
