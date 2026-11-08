---
name: environment-configuration
description: Designs, manages, validates, and troubleshoots application configuration across development, testing, staging, production, containers, and CI/CD environments. Use when working with environment variables, .env files, configuration files, runtime settings, database connection settings, secrets management, configuration validation, or environment-specific failures.
---

# Environment Configuration Skill

This skill guides the AI coding agent to design, validate, manage, and troubleshoot application configuration across local development, testing, staging, production, containers, and CI/CD pipelines. It enforces strict separation of configuration from code, protects secrets, guarantees predictable environment boundaries, and validates settings at startup.

## 1. Purpose and Core Principles

Configuration dictates application behavior across deployment environments. Mishandled configuration leads to credential leaks, outages, and vulnerabilities. Adhere to four core principles:

### Configuration Belongs Outside Code
- **Externalize Environment Settings**: Never hardcode database connection strings, API endpoints, hostnames, ports, credentials, or environment-specific URLs into source code.
- **Distinguish Config from Constants**: Fixed values that never change across deployments belong in code; values that vary by deployment belong in configuration.
- **Avoid Over-Abstraction**: Do not move every internal application variable into environment variables. Keep configuration focused and intentional.

### Secrets Must Remain Secret
- **Zero Secrets in Source & History**: Never commit passwords, private keys, API tokens, signing secrets, or connection strings into version control, example templates, or issue reports.
- **Never Log Sensitive Values**: Mask or redact credentials in diagnostic outputs, error logs, command outputs, and final reports.
- **Use Unmistakable Placeholders**: In templates (`.env.example`), use explicit placeholders like `replace-with-your-own-secret` rather than plausible or real credentials.
- **Leverage Secure Stores**: Use platform-managed secret stores (e.g., AWS Secrets Manager, GCP Secret Manager, Vault) or protected CI/CD variables in production.

### Environments Must Be Predictable
- **Strict Boundary Separation**: Maintain explicit boundaries between development, testing, staging, and production. Never allow development settings or test mocks to leak into production.
- **Fail Fast on Missing Config**: Validate all required configuration at startup. Fail with clear, actionable diagnostics before the application accepts traffic.
- **No Insecure Secret Defaults**: Never provide fallback defaults for production secrets (e.g., defaulting `JWT_SECRET` to `"secret123"`).

### Minimal Configuration Changes
- **Inspect Before Mutating**: Understand existing configuration mechanisms, precedence rules, and naming conventions before suggesting modifications.
- **Preserve Backward Compatibility**: When renaming configuration variables, support legacy names during a migration period to prevent breaking active deployments.
- **Avoid Unrequested File Churn**: Modify only the specific variables required for the task.

*Scope Boundary*: Focuses on configuration architecture, `.env` files, secrets management, validation, and environment parity. For package dependencies, use [dependency-management](../dependency-management/SKILL.md); for broad security reviews, use [security-review](../security-review/SKILL.md); for Git commits and ignore rules, use [git-workflow](../git-workflow/SKILL.md); for release deployments, refer to [deployment.md](../../rules/deployment.md).

## 2. When to Use This Skill

### Trigger Scenarios
Activate this skill whenever:
- **Managing Environment Variables**: Adding, updating, or reviewing variables in `.env` files, templates, or runtime environments.
- **Designing Configuration Architecture**: Establishing configuration loaders, schema validation, and type-safe access layers.
- **Configuring Databases & Services**: Setting up connection parameters, connection pools, timeouts, and TLS options.
- **Securing Sensitive Credentials**: Integrating secret managers, handling credential rotations, or remediating exposed secrets.
- **Frontend vs. Backend Boundaries**: Distinguishing client-inlined build-time variables from server-side runtime secrets.
- **Container & CI/CD Configuration**: Defining environment variables in Docker Compose, Kubernetes ConfigMaps/Secrets, or CI pipelines.
- **Troubleshooting Environment Failures**: Diagnosing startup crashes, connection timeouts, or missing variable errors.

### When NOT to Use This Skill
Do not use this skill for:
- Writing feature business logic (use [backend-development](../backend-development/SKILL.md) or [frontend-development](../frontend-development/SKILL.md)).
- Debugging general application bugs unrelated to configuration (use [debugging](../debugging/SKILL.md)).
- Running automated test suites when configuration is unchanged (use [testing-qa](../testing-qa/SKILL.md)).
- Provisioning cloud infrastructure from scratch (use infrastructure-as-code tooling).

## 3. Configuration Discovery and System Inspection

Before proposing configuration changes, investigate the existing setup across 10 discovery points:
1. **Supplying Mechanism**: Does the project use `.env` files, OS environment variables, JSON/YAML files, or a secret manager?
2. **Loading Timing**: Are variables read at build time (inlined into assets) or at runtime (read dynamically on process boot)?
3. **Precedence Hierarchy**: Which source wins when a variable is defined in multiple locations?
4. **Missing Variable Handling**: Does the application fail fast at startup or silently fall back to defaults?
5. **Type Coercion & Validation**: Does the app parse numbers, booleans, and URLs, or treat everything as raw strings?
6. **Secret Management**: How are production credentials injected into the deployment target?
7. **Environment Differences**: How do dev, test, staging, and prod configurations differ?
8. **Client Exposure**: Are any variables prefixed with public markers (`VITE_`, `NEXT_PUBLIC_`) and exposed to browsers?
9. **Propagation Mechanism**: Do changes require a process restart, a frontend rebuild, or a container redeployment?
10. **Documentation Parity**: Does `.env.example` accurately reflect the variables required by current code?

## 4. Configuration Classification & Boundary Matrix

Categorize every configuration setting into its proper tier:

| Category | Typical Examples | Sensitivity | Permitted Locations |
| :--- | :--- | :--- | :--- |
| **Ordinary Settings** | Log level, pagination limits, timeouts, feature flags | Low | Config files, `.env`, defaults in code |
| **Environment Settings** | Base URLs, database hosts, API endpoints, storage buckets | Medium | `.env`, ConfigMaps, CI environment vars |
| **Secrets & Credentials** | DB passwords, private API keys, signing keys, OAuth secrets | **High** | Secret stores, Kubernetes Secrets, protected CI |
| **Public Client Config** | Public app IDs, client analytics keys, public API URLs | Low/Public | Frontend bundles, `VITE_*`, `NEXT_PUBLIC_*` |

### Critical Rule for Client-Side Variables
Any variable embedded into browser JavaScript (e.g., via Vite, Next.js, or Webpack) is **publicly readable by anyone using the application**. Never attach secrets, private keys, or internal database credentials to client-prefixed variables.

## 5. `.env` Files and Environment Variable Management

Manage local `.env` files under strict safety protocols:

### Syntax & Parsing Conventions
- Use standard `KEY=VALUE` formatting without spaces around `=`.
- Wrap values containing spaces, `#`, or special characters in quotes (`KEY="value with spaces"`).
- Avoid storing complex multiline JSON objects in environment variables; use dedicated configuration files or secret stores instead.
- Prevent duplicate keys; duplicate entries create non-deterministic behavior across parsers.

### Safety Rules for `.env` Files
1. **Never Commit Real `.env` Files**: Only commit sanitized templates (e.g., `.env.example`).
2. **Never Overwrite Without Confirmation**: Inspect existing `.env` files before editing; preserve pre-existing user values.
3. **Never Output Secrets**: Never execute commands that print the complete `.env` file (`cat .env`, `printenv`).
4. **Verify Ignore Status**: Confirm that `.env` and environment-specific variants (`.env.local`, `.env.*.local`) are in `.gitignore`. Note that adding a file to `.gitignore` does not untrack it if already committed.

### Configuration Templates (`.env.example`)
Maintain an up-to-date, non-sensitive template file with explicit, safe placeholders:
```bash
DATABASE_URL="postgresql://user:replace-with-your-own-password@localhost:5432/app_dev"
PORT=3000
NODE_ENV="development"
JWT_SECRET="replace-with-your-own-secret-key-at-least-32-chars"
```

## 6. Required vs. Optional Configuration & Type Safety

Explicitly type and validate all configuration values at application startup:
- **Strings**: Non-empty checks for credentials, path existence checks for filesystem references.
- **Numbers & Ports**: Validate integers within range (e.g., `PORT` between 1024 and 65535).
- **Booleans**: Parse strings cleanly (`"true"`, `"1"` vs. `"false"`, `"0"`). Avoid truthy string bugs where `"false"` evaluates to true.
- **URLs**: Validate valid URI schemes (`http://`, `https://`) and parse hostnames.
- **Enums**: Restrict environment names to explicit sets (`"development" | "test" | "staging" | "production"`).

### Handling Rules
- **Required Configuration**: Fail fast at process startup if absent or malformed. Do not wait for a user request to trigger a missing credential exception.
- **Optional Configuration**: Supply safe, documented defaults. Never use defaults that disable authentication, bypass TLS, or downgrade security.

## 7. Configuration Validation and Startup Verification

Implement type-safe configuration validation using established schema libraries (e.g., Zod, Joi, Pydantic, or framework built-ins):
```typescript
import { z } from 'zod';

export const config = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
}).parse(process.env);
```

### Validation Reporting Protocol
- When validation fails, output the specific variable names that failed and the reason (e.g., `DATABASE_URL is not a valid URL`).
- **Never print the actual invalid value** in the error message, as it may be an exposed or malformed secret.

## 8. Environment Boundaries (Dev, Test, Staging, Prod)

Maintain strict behavioral and credential isolation across stages:
- **Development**: Local developer productivity, verbose debug logging, local database instances (`localhost`). Use isolated local credentials; never connect local environments to production databases.
- **Testing**: Automated test runs must use isolated test databases or in-memory fixtures. Tests must be completely reproducible and never depend on live external services. Never run destructive test commands (`DROP DATABASE`) against staging or production databases.
- **Staging**: Mirrored closely to production architecture, networking, and SSL/TLS configurations. Uses dedicated staging credentials and staging service endpoints.
- **Production**: Production settings require explicit authorization for any modifications. Credentials must be injected via secure secret managers or protected deployment variables. Enforce strict security settings: HTTPS/TLS 1.3, secure cookies, restricted CORS origins, and minimal logging.
- *Caution*: `NODE_ENV=production` optimizes bundles but does not secure an app by itself; security requires explicit configuration.

## 9. Secrets Management and Incident Rotation Protocol

Handle sensitive credentials with rigorous operational discipline:
- **Secret Protection**: Restrict access to secrets based on least privilege. Never embed credentials into Docker container images or Git repositories. Use environment-variable masking in CI/CD pipeline output.

### 8-Step Emergency Secret Rotation Protocol
If a secret or credential is inadvertently exposed:
1. **Halt Further Disclosure**: Prevent further distribution or logging of the exposed credential.
2. **Assess Exposure Scope**: Identify the exposed credential, access level, and all dependent systems without printing the secret value.
3. **Generate New Credential**: Create a new, cryptographically strong credential in the target service.
4. **Update Approved Store**: Inject the new credential into the platform secret manager or protected CI/CD variable.
5. **Redeploy / Restart Services**: Roll out updated configuration to affected application instances.
6. **Revoke Exposed Credential**: Decommission and invalidate the compromised credential immediately.
7. **Audit Access Logs**: Inspect service logs for unauthorized access during the exposure window.
8. **Git History Remediation**: If committed to Git, untrack the file and coordinate authorized history sanitization.

## 10. Configuration Precedence and Hierarchy

Resolve configuration values in a predictable order of precedence:
1. **Command-Line Arguments**: Explicit runtime flags (highest precedence).
2. **OS Environment Variables**: Injected via process environment or container runtime.
3. **Environment-Specific Files**: Local overrides (e.g., `.env.local`, `.env.development.local`).
4. **Standard Environment Files**: Base local configuration (`.env`).
5. **Application / Framework Defaults**: Fallback defaults defined in code (lowest precedence).

### Precedence Guidelines
- Understand which source takes precedence in the active framework (e.g., OS environment variables usually override `.env` files).
- Avoid conflicting definitions across multiple `.env` files.
- Verify whether changing a local file affects the running process or requires an explicit rebuild or restart.

## 11. Database and External Service Configuration

Connections to external infrastructure require strict parameter validation:
- **Connection Strings**: Store complete connection URLs in environment variables (e.g., `DATABASE_URL`). Redact password fields when logging connection diagnostics.
- **Pool Management**: Configure pool size (`MAX_CONNECTIONS`, `MIN_CONNECTIONS`) and connection timeouts appropriate for the environment.
- **TLS/SSL Enforcement**: Enforce TLS (`sslmode=require` or `sslmode=verify-full`) for all remote database connections.
- **Safe Connectivity Checks**: Validate database connectivity using non-destructive ping or health-check commands during application boot.

## 12. Frontend and Build-Time Configuration

Frontend single-page applications (SPAs) and static sites handle configuration differently than backends:
- **Build-Time Inlining**: Variables prefixed with public identifiers (e.g., `VITE_`, `NEXT_PUBLIC_`) are baked directly into JavaScript assets during `build`.
- **Rebuild Requirement**: Changing a frontend build-time variable requires re-running the build pipeline; modifying an environment variable on the server has zero effect on already-built static assets.
- **Runtime Injection**: If runtime configuration is required for frontend containers, use a dynamic `config.js` endpoint or inject variables into server-rendered HTML headers.
- **Backend Proxies**: Where private API keys are required to interact with third-party providers, route requests through a server-side backend proxy rather than exposing keys in client code.

## 13. Containers, CI/CD, and Deployment Parity

Maintain security across containerized and automated delivery pipelines:
- **Build Args vs. Runtime Envs**: Never pass secrets via Docker `ARG` instructions; build arguments are permanently visible in image layer metadata.
- **Dockerignore Enforcement**: Ensure `.dockerignore` excludes `.env`, `.env.local`, and local cache directories. Never copy local `.env` files into Docker images.
- **Kubernetes Configuration**: Separate non-sensitive configuration (`ConfigMap`) from sensitive credentials (`Secret`).
- **CI/CD Pipelines**: Store sensitive deploy keys and registry tokens in protected CI secrets. Mask variables to prevent leakage in build console logs.

## 14. Practical Configuration Decision Guide

| Scenario | Recommended Action | Safety Precaution |
| :--- | :--- | :--- |
| **New API key required** | Add to `.env.local` for dev; add placeholder to `.env.example`; store in secret manager for prod. | Never commit real API keys; validate on startup. |
| **Change DB connection** | Update `DATABASE_URL` in environment configuration; test connection non-destructively. | Never log raw URL with password; verify non-prod. |
| **Switch dev to prod** | Deploy to production infrastructure using platform secret managers. | Never point local tools to production DBs without approval. |
| **Variable name change** | Update code to read new name; fall back to legacy name during migration window. | Check CI/CD scripts and manifests before dropping legacy. |
| **Startup failure** | Inspect startup validation error messages for missing variable names. | Never print secret values to diagnose missing credentials. |
| **Secret leaked in Git** | Revoke and rotate credential immediately; update secret store; redeploy. | Deleting from file is insufficient; key is compromised. |
| **Frontend API URL** | Prefix with framework public identifier (e.g., `VITE_API_URL`); rebuild app. | Ensure variable contains no private backend credentials. |
| **TLS error** | Verify certificate authority and hostname match in configuration. | Never disable TLS verification (`rejectUnauthorized: false`). |

## 15. Configuration Troubleshooting Workflow

When an application fails due to configuration errors, investigate systematically:
1. **Step A: Identify Failure**: Capture error telemetry (`Invalid configuration`, `Connection refused`, `Authentication failed`).
2. **Step B: Inspect Mechanism**: Check how configuration is loaded, which files are active, and whether variables require a rebuild or restart.
3. **Step C: Classify Problem**: Distinguish missing variables, malformed types, expired credentials, and network connectivity issues.
4. **Step D: Run Safe Diagnostics**: Check if required variables exist using presence checks (e.g., `Boolean(process.env.KEY)`), never printing secret values.
5. **Step E: Apply Authorized Fix**: Modify the specific configuration file or secret store. Avoid insecure shortcuts (e.g., disabling SSL or auth).
6. **Step F: Verify Result**: Restart application, confirm successful startup validation, and run smoke tests.

## 16. Configuration Documentation and Naming Conventions

Maintain clean, standardized configuration across the project:
- **Naming Conventions**: Use `SCREAMING_SNAKE_CASE` (e.g., `DATABASE_URL`, `PORT`, `LOG_LEVEL`).
- **Descriptive Prefixes**: Group related variables logically (e.g., `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`).
- **Distinguish Public vs. Private**: Use framework-mandated prefixes for public variables (`VITE_`, `NEXT_PUBLIC_`).
- **Deprecation Windows**: When renaming variables, accept both old and new names with a deprecation warning before removing the old name.

## 17. Risk Management and Change Safety

Adhere to explicit safeguards before performing any configuration modifications:
- **Baseline Git Check**: Inspect `git status` to ensure working tree is clean and uncommitted files are preserved.
- **Backup Existing Config**: Before editing an active `.env` file, ensure existing values are preserved.
- **No Global System Alterations**: Do not modify system-wide OS environment variables without authorization.
- **No Insecure Bypasses**: Never disable TLS verification, authentication gates, or schema validation to resolve errors.
- **Authorization Required**: Modifying production deployment settings, rotating credentials, or altering live databases requires explicit user approval.

## 18. Expected Completion Report Format

When completing an authorized environment configuration task, provide a structured summary:
- **Summary**: Brief description of the configuration task and motivation (e.g., "Added type-safe validation for database connection settings").
- **Configuration Changes**: Specific variable names or template files modified (without printing secret values).
- **Environment Impact**: Affected environments (dev, test, prod) and required actions (process restart, frontend rebuild, or redeployment).
- **Security Considerations**: Measures taken to safeguard credentials and verify secret-store integration.
- **Verification Results**: Results of startup validation tests, type checks, and safe connectivity checks.
- **Remaining Risks**: Any pending credential rotations, migration deprecations, or external infrastructure dependencies.

## 19. Alignment with Existing Rules and Skills

This skill operates in direct alignment with project rules and complementary skills:
- [security.md](../../rules/security.md): Governs secret management, transport encryption, and credential handling.
- [change-safety.md](../../rules/change-safety.md): Mandates minimal blast radius and protection of user work.
- [git-workflow](../git-workflow/SKILL.md): Manages `.gitignore` enforcement and Git staging safety.
- [deployment.md](../../rules/deployment.md): Directs production deployment variables and container environments.
- [backend-development](../backend-development/SKILL.md): Consumes validated configuration in server-side services.
- [frontend-development](../frontend-development/SKILL.md): Manages client-side environment variable boundaries.
- [dependency-management](../dependency-management/SKILL.md): Manages validation libraries and tooling dependencies.
- [debugging](../debugging/SKILL.md): Investigates runtime defects stemming from environment issues.

## 20. Final Validation Checklist

Before concluding any environment configuration task, verify each item:
- [ ] **Secrets Protected**: Credentials, keys, and tokens excluded from code, logs, and Git history.
- [ ] **Template Synchronized**: `.env.example` includes required variables with safe placeholders.
- [ ] **Type-Safe Validation**: Required variables validated at startup with non-leaking errors.
- [ ] **Frontend Boundary Maintained**: Client-inlined variables are strictly non-sensitive.
- [ ] **Ignore Rules Verified**: Active `.env` and local credentials confirmed in `.gitignore`.
- [ ] **Environment Separation**: Dev, test, and production configurations strictly isolated.
- [ ] **No Insecure Shortcuts**: TLS, auth, and validation checks preserved without bypasses.
- [ ] **User Work Preserved**: All uncommitted user modifications and existing settings intact.
- [ ] **Propagation Verified**: Process restarted or rebuilt if required for changes to take effect.
- [ ] **Truthful Reporting**: Completion report reflects verified checks without exposing secrets.
