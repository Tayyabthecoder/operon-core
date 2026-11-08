---
name: dependency-management
description: Manages project dependencies across package managers, runtimes, and build systems. Use when installing or removing packages, updating versions, resolving dependency conflicts, maintaining manifests and lockfiles, investigating vulnerable or deprecated packages, troubleshooting installation failures, or evaluating dependency compatibility and supply-chain risks.
---

# Dependency Management Skill

This skill guides the AI coding agent to inspect, install, update, remove, troubleshoot, audit, and maintain software dependencies across package managers, language ecosystems, and build systems. It ensures reproducible builds, preserves lockfile integrity, defends against supply-chain risks, avoids bloat, and verifies compatibility before concluding.

## 1. Purpose and Core Principles

Dependencies accelerate development but introduce external code into the software supply chain. Careless package modifications cause build regressions, runtime failures, and security vulnerabilities. Adhere to four core principles:

### Understand Before Changing
- **Identify Tooling & Runtime**: Determine the exact package manager, runtime version, and manifest conventions in the repository before touching dependencies.
- **Establish Genuine Need**: Validate the purpose of every requested package. Check if standard library features or existing project dependencies already fulfill the requirement.
- **Trace Downstream Impact**: Understand how the package integrates into application code, peer dependencies, and deployment targets.
- **Verify Authorization**: Confirm whether the user requested installation, updating, removal, or merely investigation. Never install packages unprompted.

### Prefer Minimal Changes
- **Smallest Viable Addition**: Add only packages that are strictly necessary. Reject packages for trivial utilities that can be written safely in a few lines of code.
- **Targeted Version Changes**: Modify only the intended package; avoid updating unrelated packages or performing accidental bulk upgrades.
- **Preserve Stability**: Favor proven, compatible existing versions over the latest release unless an upgrade is justified by requirements, bug fixes, or security patches.
- **Avoid Overlapping Libraries**: Never introduce multiple libraries that duplicate existing functionality (e.g., adding Axios when `fetch` or another HTTP client is already established).

### Preserve Reproducibility
- **Lockfile Integrity**: Always maintain parity between manifests (`package.json`, `pyproject.toml`) and lockfiles (`pnpm-lock.yaml`, `poetry.lock`).
- **Never Hand-Edit Generated Lockfiles**: Allow the native package manager to generate and update lockfile checksums and resolution graphs.
- **Use Deterministic Modes in CI**: Respect frozen/clean installation modes (`npm ci`, `pnpm install --frozen-lockfile`) to ensure identical builds across environments.
- **No Indiscriminate Lockfile Deletion**: Never delete lockfiles as a quick workaround for resolution errors.

### Verify Before Concluding
- **Dual-Layer Verification**: Confirm both successful package installation and functional application integration.
- **Execute Targeted Checks**: Run type checking, linting, tests, and build commands to confirm that dependency changes introduce zero regressions.
- **Transparent Reporting**: Report exact package versions installed, manifest/lockfile diffs, and any remaining advisories or verification limits.

*Scope Boundary*: Focuses strictly on dependency lifecycle, manifests, lockfiles, resolution, and supply-chain safety. For implementing application logic, use [backend-development](../backend-development/SKILL.md) and [frontend-development](../frontend-development/SKILL.md); for broad security reviews, use [security-review](../security-review/SKILL.md); for Git commits, use [git-workflow](../git-workflow/SKILL.md).

## 2. When to Use This Skill

### Trigger Scenarios
Activate this skill whenever:
- **Adding Dependencies**: Evaluating, selecting, and installing new runtime or development packages.
- **Updating & Upgrading**: Applying patch/minor updates, performing major-version migrations, or executing security patches.
- **Removing & Replacing**: Decommissioning unused libraries, replacing deprecated packages, or consolidating redundant tools.
- **Resolving Conflicts**: Investigating peer dependency mismatches, version collision errors, or dependency resolution failures.
- **Maintaining Lockfiles**: Synchronizing out-of-sync lockfiles, repairing dependency trees, or auditing lockfile diffs.
- **Auditing Supply-Chain Security**: Investigating CVE advisories, malicious package alerts, unmaintained libraries, or licensing constraints.
- **Troubleshooting Environment Failures**: Diagnosing compilation errors, missing native bindings, or registry authentication issues.

### When NOT to Use This Skill
Do not use this skill for:
- Writing feature business logic (use [backend-development](../backend-development/SKILL.md) or [frontend-development](../frontend-development/SKILL.md)).
- Debugging general application logic bugs unrelated to dependency upgrades (use [debugging](../debugging/SKILL.md)).
- Refactoring application structure without dependency changes (use [refactoring](../refactoring/SKILL.md)).
- Running routine test suites when no dependencies were changed (use [testing-qa](../testing-qa/SKILL.md)).

## 3. Supported Package Management Ecosystems

Detect the active package manager from repository files. Never impose an unconfigured tool or migrate package managers without explicit user authorization:

| Ecosystem | Tool | Manifest | Lockfile | Frozen CI Command |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js/TS** | **pnpm** | `package.json` | `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` |
| **Node.js/TS** | **npm** | `package.json` | `package-lock.json` | `npm ci` |
| **Node.js/TS** | **Yarn** | `package.json` | `yarn.lock` | `yarn install --immutable` |
| **Node.js/TS** | **Bun** | `package.json` | `bun.lock`/`bun.lockb`| `bun install --frozen-lockfile` |
| **Python** | **uv** | `pyproject.toml` | `uv.lock` | `uv sync --frozen` |
| **Python** | **Poetry** | `pyproject.toml` | `poetry.lock` | `poetry install --sync` |
| **Python** | **pip** | `requirements.txt`| `requirements.lock`| `pip install -r requirements.txt --no-deps` |
| **PHP** | **Composer**| `composer.json` | `composer.lock` | `composer install --no-dev --optimize-autoloader` |
| **Rust** | **Cargo** | `Cargo.toml` | `Cargo.lock` | `cargo build --locked` |
| **Go** | **Go Modules**| `go.mod` | `go.sum` | `go build -mod=readonly` |
| **JVM** | **Maven/Gradle**| `pom.xml` / `build.gradle`| Lockfiles when configured | `mvn package` / `./gradlew build` |
| **.NET/C#** | **NuGet / CLI**| `*.csproj` | `packages.lock.json` | `dotnet restore --locked-mode` |
| **Ruby** | **Bundler** | `Gemfile` | `Gemfile.lock` | `bundle install --deployment` |

*Windows Sandbox Rule*: On Windows, run package-altering commands (`pnpm add/install/remove`, `npm install`) with `BypassSandbox: true` when network access or native builds require it. Run read-only audits in standard sandbox mode.

## 4. Dependency Discovery and Classification

Properly classify every dependency to prevent bloated production bundles and deployment failures:
- **Production (`dependencies`)**: Required at runtime by deployed services (e.g., web frameworks, ORMs, domain libraries).
- **Development (`devDependencies`)**: Needed only for local testing, linting, type-checking, or bundling (e.g., TypeScript, Vite, Jest).
- **Peer Dependencies**: Expected to be provided by the host application (common in plugins, component libraries).
- **Optional Dependencies**: Enhances performance or features if present, but failure to install does not abort execution.
- **Transitive Dependencies**: Indirect packages pulled in by direct dependencies; audited for CVEs but never declared directly.
- **Build-Time / Tooling**: Compilers, code generators, and CLI tools needed prior to production deployment.

### Pre-Installation Due Diligence
Before adding any dependency, verify:
1. **Necessity**: Can this be done cleanly in under 20 lines of standard library code?
2. **Duplication**: Does an already installed package provide this capability?
3. **Scope**: Should it reside in `dependencies` or `devDependencies`?
4. **Compatibility**: Does it support the project's target runtime (e.g., Node 20+, Python 3.11+)?
5. **Maintenance**: Was a stable release published within the last 12-18 months? Are issues active?
6. **Footprint**: How many transitive dependencies and bytes does it add?
7. **Security**: Are there open High/Critical CVEs or suspicious post-install scripts?
8. **License**: Is the license compatible with commercial distribution (MIT, Apache-2.0, BSD vs copyleft GPL)?
9. **Native Binaries**: Does it require native build tools (`node-gyp`, C compilers) that complicate CI/CD?

## 5. Systematic Dependency Installation Workflow

Follow this 5-step workflow (Steps A through E) when installing any package:

1. **Step A: Understand Requirement**: Validate functional need, verify if existing libraries or standard built-ins suffice, and obtain user consent.
2. **Step B: Inspect Existing Setup**: Identify package manager from manifests/lockfiles, check runtime version constraints (`engines`), and check `git status` to preserve user work.
3. **Step C: Select Suitable Package & Version**: Audit package registry for stable release status, active maintainers, and clean security history. Avoid pre-releases (`alpha`, `beta`, `rc`).
4. **Step D: Install via Project Package Manager**: Execute appropriate add command (`pnpm add`, `npm install -D`, `poetry add`) with correct scope flag. Let the tool update the lockfile cleanly.
5. **Step E: Integrate & Verify**: Import into code, configure module, run type checks (`tsc --noEmit`), linters, and unit tests. Verify manifest and lockfile diffs.

## 6. Version Selection and Semantic Versioning (SemVer)

Understand version constraints to maintain stability and prevent breaking upgrades:
- **Exact Version (`1.2.3`)**: Locks dependency to that exact release. Recommended for critical core engines.
- **Caret Range (`^1.2.3`)**: Allows updates that do not change the left-most non-zero digit (`>=1.2.3 <2.0.0`). Standard default in JS.
- **Tilde Range (`~1.2.3`)**: Allows patch updates only within minor version (`>=1.2.3 <1.3.0`). Safer for conservative upgrades.
- **Wildcards (`*`, `latest`)**: **Strictly forbidden**. Causes non-deterministic builds and supply-chain vulnerabilities.
- **Git URLs / Commit Hashes**: Use only when using private unreleased modules; pin to exact commit SHA.

*Versioning Rules*: Manifest specifies the acceptable range; lockfile pins the exact resolved version. Never assume patch or minor releases cannot break behavior; always verify with tests. Avoid "latest-itis": stable vetted releases are safer than zero-day releases.

## 7. Lockfile Management and Reproducible Builds

Lockfiles guarantee that every developer, CI runner, and production container installs identical dependency trees:
- **Always Commit Lockfiles**: Commit the authoritative lockfile corresponding to the active package manager.
- **Never Edit Manually**: Editing lockfiles by hand corrupts integrity checksums and dependency graphs.
- **No Lockfile Deletion**: Never delete lockfiles to bypass resolution errors; diagnose the root cause instead.
- **Enforce Frozen Lockfiles in CI**: CI pipelines must use deterministic commands (`npm ci`, `pnpm install --frozen-lockfile`) that fail if lockfile and manifest diverge.
- **Repairing Desynchronization**: When out of sync, run non-upgrading install commands (`npm install --package-lock-only`, `pnpm install`) to regenerate lockfile parity.

## 8. Dependency Updates and Upgrades

Distinguish between surgical patch updates and consequential major-version migrations:
- **Targeted Updates**: Update a single package for bug fixes or security patches (`pnpm up <pkg>`, `poetry update <pkg>`). Review changelog, update lockfile, and run regression tests.
- **Security Hotfixes**: Target the specific vulnerable transitive or direct package. Choose the smallest version bump that remediates the CVE without breaking APIs.
- **Major-Version Upgrades**: Involves breaking changes and deprecated APIs. Review migration guides, plan code updates, verify peer dependencies, and execute in an isolated branch.
- **Automated Bulk Updates (`npm update`, Dependabot)**: Never run unconstrained bulk updates without authorization. Group updates logically (test tools first, then build tools, then runtime libraries).

## 9. Dependency Removal and Replacement

Safely decommissioning dependencies prevents dead code, security exposure, and bundle bloat:
1. **Audit All Usage**: Search repository for imports, `require()` calls, dynamic imports, configuration files (`.babelrc`, `tailwind.config`), scripts, Dockerfiles, and CI workflows.
2. **Verify Transitive Requirements**: Ensure no other direct dependency relies on the package as a peer dependency.
3. **Uninstall via Package Manager**: Use `pnpm remove <pkg>`, `npm uninstall <pkg>`, or `poetry remove <pkg>`. Never simply delete lines from manifests.
4. **Clean Code References**: Remove unused imports, mocks, and dead configuration blocks.
5. **Verify Clean Build & Tests**: Run test suites and builds to ensure no hidden dynamic references broke.

*Replacement*: Document why existing library is inadequate, map API differences, verify footprint/licensing, and migrate incrementally.

## 10. Dependency Conflict Diagnosis and Resolution

When installation fails due to version or peer conflicts, follow this systematic flow:
1. **Capture Error & Exit Code**: Read exact package manager error telemetry.
2. **Identify Conflict Type**: Distinguish peer dependency mismatches, engine incompatibilities, corrupted cache, or registry auth failures.
3. **Inspect Dependency Tree**: Run `npm ls <pkg>` or `pnpm why <pkg>` to trace conflicting versions and callers.
4. **Formulate Resolution Options**: Check if parent packages have newer versions supporting the peer; evaluate compatible alternatives.
5. **Apply Minimal Safe Adjustment**: Align versions or configure package manager overrides (`overrides` in npm, `pnpm.overrides`, `resolutions` in Yarn) only when upstream patches are pending.
6. **Verify with Clean Test & Build**: Ensure resolved tree compiles and passes tests.
7. **Prohibited Shortcuts**: Never use `--force` or `--legacy-peer-deps` blindly; they disable safety checks and cause runtime crashes.

## 11. Security Auditing and Supply-Chain Risk Management

Protect the application against vulnerabilities, malicious packages, and compromised registries:
- **Audit Tooling**: Run standard audits (`npm audit`, `pnpm audit`, `pip-audit`, `cargo audit`).
- **Triage & Context**: Determine whether the vulnerability is in production runtime or local tooling, and if the vulnerable code path is actually reachable.
- **Remediation**: Update parent package or apply targeted override. Avoid `npm audit fix --force` as it frequently introduces breaking major-version upgrades.
- **Supply-Chain Threats**: Verify package spelling against typosquatting, inspect post-install scripts (`--ignore-scripts` during audits), flag abandoned packages (no commits in 3+ years), and audit license compatibility (preventing restrictive GPL in commercial projects).

## 12. Runtime, Environment, and Monorepo Compatibility

Dependency requirements differ across local development, CI pipelines, containers, and monorepos:
- **Engine Declarations**: Explicitly define supported runtime versions in manifests (`"engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" }`).
- **Platform-Specific Binaries**: Be cautious with native C++/Rust bindings (`sharp`, `esbuild`, `bcrypt`). Ensure prebuilt binaries exist for Linux, macOS, and Windows.
- **CI Parity**: Ensure CI container images match local development runtimes and use frozen lockfile installation modes.
- **Monorepos & Workspaces**: Install dependencies into specific consuming packages (`pnpm --filter @app/web add <pkg>`), not the workspace root. Reserve root manifest for shared dev tooling (linters, TypeScript). Use workspace protocols (`workspace:*`) for internal packages.

## 13. Practical Dependency Decision Guide

| Situation | Recommended Action | Safety Precaution |
| :--- | :--- | :--- |
| **New feature needs utility** | Check standard library or existing packages first. Install minimal vetted library if needed. | Check license, size, maintenance, and security history first. |
| **Patch update available** | Apply targeted update to that specific package (`pnpm up <pkg>`). | Verify test suite and type check; review lockfile diff. |
| **Major version upgrade** | Read migration guide; update in dedicated branch; adapt breaking code changes. | Obtain user approval before upgrading major framework versions. |
| **Vulnerability reported** | Audit reachability; update to fixed version or apply temporary override. | Avoid `npm audit fix --force`; verify zero breaking regressions. |
| **Peer dependency error** | Check for newer versions of parent packages that support the peer; evaluate alternatives. | Never default to `--force` or `--legacy-peer-deps`. |
| **Lockfile out of sync** | Run package manager install command to regenerate lockfile cleanly. | Never delete lockfile or manually edit its contents. |
| **Package appears unused** | Search repository thoroughly (imports, scripts, configs, dynamic calls). Remove via PM. | Test builds and runtime to ensure dynamic dependencies aren't broken. |
| **Installation network failure** | Diagnose proxy, DNS, or private registry credentials. | Never disable TLS, HTTPS, or integrity verification to bypass errors. |
| **Multiple PMs detected** | Inspect committed lockfile to identify authoritative tool. Remove conflicting lockfiles. | Confirm with user before deleting an obsolete lockfile. |

## 14. Dependency Verification and Testing

Every dependency change must be validated across multiple layers before declaring completion:
1. **Manifest & Lockfile Parity**: Manifest reflects intended version; lockfile is consistent with zero unexpected deletions.
2. **Static & Type Checks**: Type checking passes cleanly (`tsc --noEmit`, `mypy`); linter reports zero unresolved imports.
3. **Automated Testing**: Unit and integration tests pass cleanly (`npm test`, `pytest`, `cargo test`).
4. **Build & Bundle Verification**: Production build succeeds cleanly (`npm run build`, `pnpm build`); bundle size remains within acceptable budgets.

## 15. Risk Management and Change Safety

Adhere to explicit safeguards to protect the codebase from dependency-related regressions:
- **Git Baseline Check**: Inspect `git status` before modifying manifests or running install commands.
- **Preserve User Work**: Never overwrite or discard uncommitted user edits in manifests or code files.
- **No Global Pollution**: Never install packages globally (`npm install -g`, `pip install` without virtualenv).
- **Credential Protection**: Never commit or log npm tokens, PyPI API keys, or private registry credentials in `.npmrc` or terminal output.
- **No Unsolicited Runtimes**: Never change project runtime versions (e.g., upgrading Node 18 to Node 22) as a side effect of adding a library.
- **Halt on Unresolved Risk**: If a package introduces severe security flaws, unresolvable peer conflicts, or licensing violations, halt and explain the risk to the user.

## 16. Expected Completion Report Format

When completing an authorized dependency management task, provide a structured report covering:
- **Summary**: Concise description of dependency action and motivation (e.g., "Installed Zod for runtime schema validation").
- **Dependencies Changed**: Package name, scope (`dependencies` vs `devDependencies`), previous version, installed version, and necessity justification.
- **Manifest & Lockfile Changes**: List of modified files (`package.json`, `pnpm-lock.yaml`) and confirmation of parity.
- **Compatibility & Security Audit**: Runtime compatibility, vulnerability audit findings (`0 vulnerabilities`), and license compliance.
- **Verification Results**: Status of type checking, unit tests, and production build execution.
- **Remaining Risks**: Any pending upstream releases, deprecation warnings, or verification limitations.

## 17. Alignment with Existing Rules and Skills

This skill operates in direct alignment with project rules and complementary skills:
- [security.md](../../rules/security.md): Rule 14 governs dependency security, vulnerability scanning, and supply-chain safety.
- [change-safety.md](../../rules/change-safety.md): Section 6 governs controlling dependency changes and minimizing blast radius.
- [core-workflow.md](../../rules/core-workflow.md): Directs the inspect-plan-execute-verify cycle.
- [backend-development](../backend-development/SKILL.md): Implements server-side application logic using installed packages.
- [frontend-development](../frontend-development/SKILL.md): Integrates frontend libraries and manages client bundle sizes.
- [security-review](../security-review/SKILL.md): Performs in-depth threat modeling and security audits.
- [testing-qa](../testing-qa/SKILL.md): Executes comprehensive regression and automated test suites.
- [debugging](../debugging/SKILL.md): Diagnoses runtime bugs and integration exceptions.
- [git-workflow](../git-workflow/SKILL.md): Manages staging, atomic commits, and diff reviews of lockfiles.
- [deployment.md](../../rules/deployment.md): Ensures reproducible dependency builds in deployment containers.

## 18. Final Validation Checklist

Before concluding any dependency management task, verify each requirement:
- [ ] **Authoritative Tool**: Identified and used correct package manager matching committed lockfile.
- [ ] **Genuine Necessity**: Confirmed package is necessary and cannot be cleanly implemented via standard libraries.
- [ ] **Appropriate Scope**: Correctly assigned to `dependencies` vs `devDependencies`.
- [ ] **Lockfile Consistency**: Lockfile is generated, valid, and fully synchronized with manifest.
- [ ] **Zero Unrelated Upgrades**: Avoided modifying unrelated packages or executing indiscriminate bulk updates.
- [ ] **No Destructive Shortcuts**: Avoided lockfile deletion, `--force`, and `--legacy-peer-deps`.
- [ ] **Security & License Vetted**: Checked for CVE advisories, licensing compatibility, and maintenance health.
- [ ] **Static & Test Verification**: Passed type checking, linting, tests, and production build.
- [ ] **User Work Preserved**: Kept all uncommitted user files and modifications intact.
- [ ] **Accurate Reporting**: Completion report reflects verified versions, command outputs, and diffs.
