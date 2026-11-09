---
trigger: glob
globs: "**/*.ts,**/*.tsx,**/*.js,**/*.jsx"
description: "TypeScript/JavaScript Security (applies to **/*.ts, **/*.tsx, **/*.js, **/*.jsx)"
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
source: ecc-universal@2.2.3
---
# TypeScript/JavaScript Security

> This file extends [security.md](security.md) with TypeScript/JavaScript specific content.

## Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.API_KEY

if (!apiKey) {
  throw new Error('API_KEY not configured')
}
```

## Agent Support

- Use **security-auditor** skill for comprehensive security audits
