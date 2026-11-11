import fs from 'node:fs';
import path from 'node:path';

/**
 * MCP tool policy.
 *
 * Claude Code names MCP tools `mcp__<server>__<tool>`. `mcpPolicy` in
 * `.agents/framework.config.json` lets a project decide, per server and tool, what the framework
 * does before such a call runs:
 *
 *   {
 *     "defaultDecision": "allow",                       // allow | ask | deny (default: allow)
 *     "servers": {
 *       "docs": {
 *         "tools": { "get_*": "allow", "delete_*": "deny", "*": "ask" },
 *         "readOnlyTools": ["get_page"]                  // attestation used by agentGrants
 *       }
 *     },
 *     "agentGrants": { "docs-auditor": ["mcp__docs__get_page"] }
 *   }
 *
 * Tool patterns are an exact name, a trailing-`*` prefix, or `*`. A matching `deny` always wins;
 * otherwise the most specific match wins (exact, then longest prefix, then `*`); with no match the
 * server-less `defaultDecision` applies. `allow` means the framework has no objection; Claude Code's
 * own permission prompts still apply. The default policy is `allow` for everything, so a project
 * that sets nothing behaves as before.
 */

const DECISIONS = new Set(['allow', 'ask', 'deny']);
const EXACT_SPECIFICITY = 1000;

export const DEFAULT_MCP_POLICY = Object.freeze({ defaultDecision: 'allow', servers: {}, agentGrants: {} });

/**
 * @param {string} toolName
 * @returns {{ server: string, tool: string }|null} null when the name is not an MCP tool name
 */
export function parseMcpToolName(toolName) {
  if (typeof toolName !== 'string' || !toolName.startsWith('mcp__')) return null;
  const rest = toolName.slice('mcp__'.length);
  const split = rest.indexOf('__');
  if (split <= 0 || split + 2 >= rest.length) return null;
  return { server: rest.slice(0, split), tool: rest.slice(split + 2) };
}

function matchesPattern(pattern, tool) {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) return tool.startsWith(pattern.slice(0, -1));
  return pattern === tool;
}

function specificity(pattern) {
  if (pattern === '*') return 0;
  return pattern.endsWith('*') ? pattern.length - 1 : EXACT_SPECIFICITY;
}

/**
 * Normalizes a raw `mcpPolicy` value. Anything invalid is dropped, never widened: an unusable entry
 * is ignored rather than allowed, and an unusable `defaultDecision` falls back to `allow` (today's behavior).
 * Use validateMcpPolicy to report problems.
 * @param {unknown} raw
 * @returns {{ defaultDecision: string, servers: Record<string, { tools: Record<string,string>, readOnlyTools: string[] }>, agentGrants: Record<string,string[]> }}
 */
export function normalizeMcpPolicy(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_MCP_POLICY, servers: {}, agentGrants: {} };
  const servers = {};
  if (raw.servers && typeof raw.servers === 'object' && !Array.isArray(raw.servers)) {
    for (const [name, value] of Object.entries(raw.servers)) {
      if (!value || typeof value !== 'object') continue;
      const tools = {};
      if (value.tools && typeof value.tools === 'object' && !Array.isArray(value.tools)) {
        for (const [pattern, decision] of Object.entries(value.tools)) {
          if (DECISIONS.has(decision)) tools[pattern] = decision;
        }
      }
      const readOnlyTools = Array.isArray(value.readOnlyTools) ? value.readOnlyTools.filter((t) => typeof t === 'string') : [];
      servers[name] = { tools, readOnlyTools };
    }
  }
  const agentGrants = {};
  if (raw.agentGrants && typeof raw.agentGrants === 'object' && !Array.isArray(raw.agentGrants)) {
    for (const [agent, tools] of Object.entries(raw.agentGrants)) {
      if (Array.isArray(tools)) agentGrants[agent] = tools.filter((t) => typeof t === 'string');
    }
  }
  return { defaultDecision: DECISIONS.has(raw.defaultDecision) ? raw.defaultDecision : 'allow', servers, agentGrants };
}

/**
 * @param {string} projectDir
 * @returns {unknown} The raw `mcpPolicy` value, or undefined when the config is missing, unreadable, or has none
 */
export function loadRawMcpPolicy(projectDir) {
  try {
    const configPath = path.join(projectDir, '.agents', 'framework.config.json');
    return JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^﻿/, ''))?.mcpPolicy;
  } catch {
    return undefined;
  }
}

/**
 * @param {string} projectDir
 * @returns {ReturnType<typeof normalizeMcpPolicy>} The project's policy, or the default when the config is missing or unreadable
 */
export function loadMcpPolicy(projectDir) {
  return normalizeMcpPolicy(loadRawMcpPolicy(projectDir));
}

/**
 * Decides what the framework does before an MCP tool call.
 * @param {string} toolName Claude Code tool name, for example `mcp__docs__get_page`
 * @param {ReturnType<typeof normalizeMcpPolicy>} policy
 * @returns {{ decision: 'allow'|'ask'|'deny', reason?: string, rule?: string }}
 */
export function evaluateMcpCall(toolName, policy) {
  const parsed = parseMcpToolName(toolName);
  if (!parsed) return { decision: 'allow' };
  const server = policy.servers[parsed.server];
  const matches = server
    ? Object.entries(server.tools)
        .filter(([pattern]) => matchesPattern(pattern, parsed.tool))
        .map(([pattern, decision]) => ({ pattern, decision, rank: specificity(pattern) }))
    : [];

  const denied = matches.find((m) => m.decision === 'deny');
  const chosen = denied || matches.sort((a, b) => b.rank - a.rank)[0];
  const decision = chosen ? chosen.decision : policy.defaultDecision;
  const rule = chosen ? `mcpPolicy.servers.${parsed.server}.tools["${chosen.pattern}"]` : 'mcpPolicy.defaultDecision';
  const label = `MCP tool ${parsed.tool} on server ${parsed.server}`;
  if (decision === 'deny') return { decision, rule, reason: `${label} is denied by ${rule}.` };
  if (decision === 'ask') return { decision, rule, reason: `${label} requires confirmation under ${rule}.` };
  return { decision: 'allow', rule };
}

/**
 * @param {ReturnType<typeof normalizeMcpPolicy>} policy
 * @param {string} agentName Agent file name without extension
 * @returns {string[]} MCP tool names granted to the agent
 */
export function grantsForAgent(policy, agentName) {
  return policy.agentGrants[agentName] || [];
}

/**
 * Reports problems in a raw `mcpPolicy` value. Grants are the sensitive part: an MCP tool can write
 * to an external service, so a read-only agent may only receive a tool the project attested as read-only.
 * @param {unknown} raw
 * @param {string[]} agentNames Existing subagent names (file names without extension)
 * @param {string} [writerAgent] The one agent allowed to hold non-read-only grants
 * @returns {string[]} Error messages (empty when valid or absent)
 */
export function validateMcpPolicy(raw, agentNames, writerAgent = 'code-implementer') {
  if (raw === undefined) return [];
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['mcpPolicy must be an object'];

  if (raw.defaultDecision !== undefined && !DECISIONS.has(raw.defaultDecision)) {
    errors.push(`mcpPolicy.defaultDecision must be allow, ask, or deny (got ${JSON.stringify(raw.defaultDecision)})`);
  }
  const servers = raw.servers === undefined ? {} : raw.servers;
  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
    errors.push('mcpPolicy.servers must be an object');
  } else {
    for (const [name, value] of Object.entries(servers)) {
      if (!value || typeof value !== 'object') {
        errors.push(`mcpPolicy.servers.${name} must be an object`);
        continue;
      }
      for (const [pattern, decision] of Object.entries(value.tools || {})) {
        if (!DECISIONS.has(decision)) errors.push(`mcpPolicy.servers.${name}.tools["${pattern}"] must be allow, ask, or deny`);
        if (pattern.includes('*') && pattern !== '*' && pattern.indexOf('*') !== pattern.length - 1) {
          errors.push(`mcpPolicy.servers.${name}.tools["${pattern}"]: only a trailing * is supported`);
        }
      }
      if (value.readOnlyTools !== undefined && !Array.isArray(value.readOnlyTools)) {
        errors.push(`mcpPolicy.servers.${name}.readOnlyTools must be an array`);
      }
    }
  }

  const grants = raw.agentGrants === undefined ? {} : raw.agentGrants;
  if (!grants || typeof grants !== 'object' || Array.isArray(grants)) {
    errors.push('mcpPolicy.agentGrants must be an object');
    return errors;
  }
  const policy = normalizeMcpPolicy(raw);
  for (const [agent, tools] of Object.entries(grants)) {
    if (!agentNames.includes(agent)) errors.push(`mcpPolicy.agentGrants names unknown agent "${agent}"`);
    if (!Array.isArray(tools)) {
      errors.push(`mcpPolicy.agentGrants.${agent} must be an array`);
      continue;
    }
    for (const toolName of tools) {
      const parsed = parseMcpToolName(toolName);
      if (!parsed || toolName.includes('*')) {
        errors.push(`mcpPolicy.agentGrants.${agent}: "${toolName}" must be an exact mcp__<server>__<tool> name`);
        continue;
      }
      const server = policy.servers[parsed.server];
      if (!server) {
        errors.push(`mcpPolicy.agentGrants.${agent}: server "${parsed.server}" is not declared in mcpPolicy.servers`);
        continue;
      }
      if (evaluateMcpCall(toolName, policy).decision === 'deny') {
        errors.push(`mcpPolicy.agentGrants.${agent}: "${toolName}" is denied by the policy`);
      }
      if (agent !== writerAgent && !server.readOnlyTools.includes(parsed.tool)) {
        errors.push(`mcpPolicy.agentGrants.${agent}: "${toolName}" must be listed in servers.${parsed.server}.readOnlyTools because ${agent} is a read-only agent`);
      }
    }
  }
  return errors;
}
