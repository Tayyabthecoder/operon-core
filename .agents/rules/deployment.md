---
trigger: model_decision
description: Apply deployment and release engineering standards when configuring environments, building applications, preparing releases, managing migrations, deploying services, verifying production readiness, or recovering from deployment failures.
---

# Software Deployment, Release Engineering, and Operational Readiness Standards

This rule establishes engineering standards for building application artifacts, configuring environments, managing database migrations during release, hardening production infrastructure, conducting deployments, performing post-release verification, and executing safe rollbacks across any platform or cloud provider.

## 1. Understand the Deployment Environment

- **Inspect Established Configurations**: Review existing deployment manifests, Dockerfiles, CI/CD pipelines, package scripts, and hosting configurations before proposing structural deployment changes.
- **Environment Segregation**: Explicitly distinguish between `local`, `development`, `testing`, `staging`, and `production` environments. Never treat local development behavior as a guarantee of production compatibility.
- **Reuse Infrastructure**: Extend established deployment pipelines, container definitions, and cloud services rather than introducing alternative hosting platforms, container engines, or deployment frameworks without justified need.
- **Identify Missing Prerequisites**: Identify required runtime versions, database connections, environment secrets, and cloud permissions before initiating deployment operations.

## 2. Build and Release Readiness

- **Standard Build Commands**: Use the project's established build and packaging commands (e.g., `npm run build`, `cargo build --release`, `go build`). Never invent unverified packaging scripts.
- **Clean Production Artifacts**: Ensure production artifacts contain only production dependencies and runtime assets; eliminate development tooling, test fixtures, and local file paths from release bundles.
- **Pre-Release Quality Gates**: Execute automated test suites, type-checkers, and linters before packaging release artifacts. Never suppress build warnings or bypass quality gates to force an artifact to build.
- **Verify Asset Inclusion**: Confirm that required static assets, compiled outputs, client bundles, database migration scripts, and server entry points are properly packaged in the release artifact.
- **No False Readiness**: Never claim a release is ready for production based solely on code compilation without running verified release checks.

## 3. Environment Configuration & Secret Management

- **Externalize Configuration**: Maintain strict separation between application code and environment-specific parameters. Inject environment variables at runtime via container environments, cloud provider secret vaults, or runtime configuration.
- **Sanitized Templates**: Provide sanitized `.env.example` templates containing descriptive placeholders for all required environment variables.
- **Strict Client-Server Isolation**: Distinguish public client-side environment variables (e.g., `NEXT_PUBLIC_*`, `VITE_*`) from private server-side secrets. Remember that client-side variables are embedded in public JavaScript bundles and accessible to end users.
- **Zero Secrets in Artifacts**: Never commit `.env` files with real credentials, and ensure secret keys, certificates, or tokens are not embedded into Docker images, release bundles, or public repository files.
- **Cross-Reference Security Rules**: Refer to `security.md` for comprehensive secret management standards.

## 4. Hosting and Platform Configuration

- **Platform-Native Best Practices**: Adhere to the established hosting provider's conventions (e.g., Vercel, AWS, GCP, Cloudflare, Docker, Kubernetes, Render).
- **Accurate Runtime Parameters**: Configure build commands, output directories, start commands, port bindings, and routing matching the real application entry points.
- **Ephemeral Storage Awareness**: Never assume serverless runtimes or container instances provide persistent local file storage across invocations or redeployments; utilize object storage (e.g., S3, GCS) for persistent assets.
- **Resource Constraints**: Respect platform limitations regarding execution timeouts, memory allocations, request body sizes, and connection pool limits.
- **Zero Unprompted Infrastructure Changes**: Never alter DNS records, domain mappings, VPC networking, or production infrastructure without explicit user authorization.

## 5. Database Migrations and Persistent Data in Releases

- **Pre-Deployment Migration Audit**: Inspect migration history, pending migrations, and target database schemas prior to triggering deployment pipelines.
- **Zero-Downtime Expand-and-Contract**: Use multi-phase (expand-and-contract) migration strategies to ensure schemas remain backward-compatible with both the currently running and newly deploying application versions.
- **Strictly Prohibit Destructive Migrations**: Never execute destructive database commands (dropping tables, dropping columns, truncating data, or resetting schemas) as part of an automated release without explicit authorization.
- **Target Verification**: Explicitly verify the connection string and database identity before applying migrations to prevent accidental execution against the wrong environment.
- **Backup Verification**: Verify that reliable database backups exist before applying high-impact schema transformations.
- **Cross-Reference Database Rules**: Refer to `database.md` and `change-safety.md`.

## 6. Continuous Integration & Delivery (CI/CD)

- **Reuse Established Workflows**: Build upon existing CI/CD automation (e.g., GitHub Actions, GitLab CI, CircleCI) rather than introducing competing pipelines.
- **Environment Isolation in Pipelines**: Separate automated test and build validation stages from production deployment triggers.
- **Least Privilege for Service Accounts**: Grant deployment pipeline tokens the minimum cloud permissions necessary to deploy artifacts.
- **Mask Pipeline Telemetry**: Ensure API keys, database credentials, and deployment tokens are masked and redacted from CI/CD runner logs.
- **No Gate Bypasses**: Never bypass branch protections, approval requirements, or failing pipeline checks to force a deployment.

## 7. Security and Production Hardening

- **Secure Production Defaults**: Disable debug modes, development tools, verbose error display, and interactive consoles in production builds.
- **Enforce Transport Security**: Terminate TLS and enforce HTTPS for all production web traffic.
- **Restrict Internal Boundaries**: Shield database instances, cache nodes, internal microservices, and admin portals behind private VPCs or authenticated proxies.
- **Dependency Vulnerability Audits**: Run dependency security scans before finalizing production releases.
- **Cross-Reference Security Rules**: Refer to `security.md` for comprehensive hardening protocols.

## 8. Release and Deployment Execution

- **Separate Preparation from Deployment**: Distinguish the preparation of deployment configuration files from the consequential act of executing a live deployment.
- **Explicit Authorization Required**: Never trigger a live deployment, publish a package, or execute cloud deployment commands without explicit user instruction.
- **Pre-Deployment Checklist**: Confirm the target environment (e.g., staging vs. production), release version/commit tag, database migration readiness, and prerequisite services before initiating deployment.
- **Clean Git State**: Deploy strictly from reviewed, tested commit tags or branches; never deploy unreviewed working-tree edits.
- **Verify Execution Output**: Confirm deployment success using verified platform status and log output rather than assuming success from local command execution.

## 9. Deployment Strategies

- **Proportional Strategy**: Choose the simplest deployment strategy that meets availability requirements (e.g., rolling updates for stateless containers, blue-green for zero-downtime microservices).
- **Session & Traffic Continuity**: Ensure active user sessions and in-flight background jobs are gracefully handled during application restarts.
- **Honest Availability Claims**: Never claim zero-downtime deployment capability without verifying that the infrastructure, database compatibility, and routing proxies support it.

## 10. Health Checks and Smoke Testing

- **Liveness & Readiness Probes**: Implement lightweight health check endpoints (`/health/live`, `/health/ready`) to enable hosting platforms to accurately route traffic.
- **Non-Destructive Smoke Tests**: Execute post-deployment smoke tests verifying that primary routes respond, critical assets load, and core database connections are healthy.
- **No Production Pollution**: Ensure automated smoke tests do not create junk customer records, execute test financial transactions, or trigger customer-facing notifications.
- **Distinguish Reachability from Health**: Never claim an application is fully functional solely because its HTTP server returns 200 on a ping route.

## 11. Monitoring and Operational Readiness

- **Structured Production Logging**: Ensure deployed services emit structured JSON logs to standard output for ingestion by log aggregators.
- **Redact Sensitive Telemetry**: Automatically redact passwords, tokens, session keys, and customer PII from production application logs.
- **Observable Error Rates**: Verify that runtime exceptions and error spikes are captured by application monitoring tools (e.g., Sentry, CloudWatch, Datadog).

## 12. Rollback and Disaster Recovery

- **Pre-Planned Rollback Options**: Identify concrete rollback procedures (e.g., redeploying the previous container image, rolling back the commit) before executing a deployment.
- **Database Compatibility Warning**: Never assume that rolling back application code will automatically undo applied database migrations; evaluate data compatibility carefully.
- **Approval for Data Restores**: Obtain explicit user authorization before restoring database backups or modifying persistent production data during an incident.
- **Verify Post-Rollback Health**: Verify service reachability and data consistency immediately following any rollback operation.

## 13. Deployment Documentation

- **Maintain Deployment Runbooks**: Document prerequisites, environment variables, build commands, and verified deployment procedures in `docs/deployment/`.
- **Flag Destructive Operations**: Include prominent warning callouts for commands that risk data loss or service disruption.
- **Cross-Reference Documentation Rules**: Refer to `documentation.md`.

## 14. Deployment Testing and Verification

- **Staging Verification**: Validate release candidates in staging environments mirroring production architecture before deploying to production.
- **Version Verification**: Verify that the deployed instance reports the expected release version or commit hash.
- **Transparent Verification Reporting**: Accurately report which deployment verification checks succeeded and disclose any unverified operational components.

## 15. Deployment Decision Principles

When preparing or executing deployments:
1. **Security & Data Integrity Precedence**: Preserving system security, data consistency, and service recoverability takes absolute precedence over release velocity.
2. **Explicit Authorization for Production**: Treat all production deployments, infrastructure modifications, and domain changes as high-impact operations requiring explicit user consent.
3. **Simplicity Over Over-Engineering**: Prefer reliable, straightforward platform-native deployment mechanisms over complex, brittle custom orchestration scripts.
4. **Resilience & Verified Observability**: Design releases to be observable, testable, and safely reversible under failure conditions.
