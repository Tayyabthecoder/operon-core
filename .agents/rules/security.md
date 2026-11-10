---
trigger: always_on
description: Apply secure coding practices when implementing, modifying, reviewing, or testing authentication, authorization, input validation, data access, APIs, sessions, file uploads, secrets, external integrations, and security-sensitive application features.
---

# Application Security and Vulnerability Prevention

This rule establishes strict engineering standards for designing, implementing, modifying, and reviewing security-sensitive software components. Apply these principles to safeguard data confidentiality, maintain system integrity, and eliminate common application vulnerabilities.

## 1. Secure by Design & Defense in Depth

- **Default to Least Privilege**: Grant users, service accounts, and internal components only the minimum permissions necessary to perform their legitimate functions.
- **Defense in Depth**: Implement layered security controls. Never rely on a single defensive barrier (e.g., combining network isolation with application-level authorization and database access controls).
- **Explicit Trust Boundaries**: Identify boundaries separating clients, backend services, third-party integrations, and storage tiers. Treat data crossing any trust boundary as potentially malicious.
- **Established Security Controls**: Rely on proven, well-maintained framework security mechanisms rather than writing custom authentication, cryptography, or sanitization logic.
- **No Compromises for Convenience**: Never bypass, suppress, or disable security controls, TLS verification, or authorization checks to resolve development friction or force a test to pass.

## 2. Authentication

- **Trusted Auth Mechanisms**: Implement authentication using established, well-maintained libraries, framework modules, or vetted identity providers (e.g., OAuth 2.0 / OIDC).
- **Robust Password Hashing**: Never store plaintext or reversibly encrypted passwords. Use memory-hard, salted, slow-hashing algorithms (such as Argon2id, bcrypt, or scrypt) with appropriate work factors.
- **Prevent User Enumeration**: Return consistent error messages and response times for failed authentication, password resets, and account registration to avoid exposing user existence.
- **Credential Stuffing & Brute-Force Defenses**: Implement rate limiting, progressive delays, or account lockout mechanisms on login, registration, and recovery endpoints.
- **Secure Password Reset Flows**: Generate cryptographically random, short-lived, single-use tokens for password resets and verification flows; invalidate tokens immediately upon use.
- **Server-Side Enforcement**: Validate all credentials strictly on the server or trusted authentication boundary. Never rely on frontend route guards or hidden UI elements as security controls.

## 3. Authorization & Access Control

- **Server-Side Authorization**: Enforce authorization on the server for every protected endpoint, RPC method, GraphQL query/mutation, and background job. Deny access by default.
- **Prevent Insecure Direct Object References (IDOR)**: Verify that the authenticated user explicitly owns or is authorized to access the requested resource ID, tenant ID, or file key before reading or modifying it.
- **Prevent Privilege Escalation**: Prevent horizontal (accessing other users' resources) and vertical (accessing administrative capabilities) escalation by deriving permissions from verified server-side session contexts.
- **Never Trust Client Claims**: Never accept roles, user IDs, permission flags, or tenant identifiers passed directly from client payloads, query parameters, or mutable cookies.
- **Non-HTTP Boundaries**: Ensure background workers, scheduled cron tasks, message consumers, and internal administrative tools enforce identical authorization checks.

## 4. Input Validation & Output Encoding

- **Strict Server-Side Validation**: Validate all incoming data (request bodies, query parameters, headers, cookies, file payloads, and webhook events) on the server against explicit allowlists and schemas.
- **Enforce Constraints**: Validate data types, string lengths, numerical ranges, allowed character sets, and enum values. Reject invalid input with standard, safe error responses.
- **Context-Aware Output Encoding**: Encode all dynamic data rendered in the user agent according to its specific output context (HTML body, attribute, JavaScript block, CSS, or URL) to prevent Cross-Site Scripting (XSS).
- **Safe HTML Sanitization**: When user-generated HTML is explicitly required (e.g., rich-text editors), sanitize it using an established, battle-tested library (e.g., DOMPurify) configured with a strict tag/attribute allowlist.
- **Zero Client Trust**: Treat client-side validation as a UX convenience, never as an application security control.

## 5. Database & Query Security

- **Parameterized Queries**: Execute all database queries using parameterized queries, prepared statements, or safe ORM mappings. Never concatenate or interpolate untrusted strings into executable SQL.
- **Dynamic SQL Identifiers**: When dynamic table names, column names, or sort orders cannot be parameterized, validate them against strict server-side allowlists before query construction.
- **Least Privileged Database Access**: Connect applications to databases using service accounts with the minimal permissions required (e.g., disallowing DDL operations for standard web runtimes).
- **Enforce Authorization at Query Time**: Filter queries by tenant ID or user ownership to prevent unauthorized data exposure at the database layer.
- **Redact Database Diagnostics**: Never leak database connection strings, query details, table names, or raw database exceptions in client-facing error responses.

## 6. Browser & Client-Side Security

- **Mitigate XSS**: Avoid dangerous browser execution sinks (e.g., `innerHTML`, `outerHTML`, `eval()`, `setTimeout(string)`, or unsanitized template interpolation).
- **Security Headers**: Configure modern browser security headers across all responses:
  - `Content-Security-Policy` (CSP) with restrictive script, style, and object sources.
  - `X-Content-Type-Options: nosniff`.
  - `X-Frame-Options: DENY` or `SAMEORIGIN` (and CSP `frame-ancestors`) to prevent clickjacking.
  - `Strict-Transport-Security` (HSTS) with preloading and subdomains enabled.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
- **Credential Storage**: Avoid storing sensitive authentication tokens, refresh tokens, or personal identifiers in browser `localStorage` or `sessionStorage` where they are vulnerable to script injection.

## 7. CSRF & Session Security

- **CSRF Defenses**: Protect state-changing operations against Cross-Site Request Forgery (CSRF) using synchronized anti-CSRF tokens, framework-provided CSRF middleware, or custom headers with verified origin headers.
- **Secure Cookie Flags**: Set session and authentication cookies with `HttpOnly` (preventing script access), `Secure` (restricting to HTTPS), and `SameSite=Strict` or `SameSite=Lax`.
- **Session Lifecycle & Fixation**: Regenerate session identifiers immediately upon successful authentication, role change, or password reset.
- **Session Invalidation**: Ensure logout endpoints completely terminate the server-side session and invalidate associated refresh tokens rather than merely deleting client-side cookies.

## 8. API & Transport Security

- **Protected API Endpoints**: Authenticate and authorize every API route. Apply granular Cross-Origin Resource Sharing (CORS) configurations, avoiding `Access-Control-Allow-Origin: *` with credentials.
- **Prevent Mass Assignment**: Explicitly bind and validate incoming request payloads to dedicated Data Transfer Objects (DTOs) with allowlisted fields to prevent unwanted entity mutations.
- **Data Minimization in Responses**: Serialize and return only the specific attributes authorized for the requester; do not dump raw domain entities or database models containing sensitive attributes.
- **Rate Limiting & DoS Protection**: Implement rate limiting, payload size caps, and pagination limits across public and protected endpoints to protect against resource exhaustion.
- **Safe Public Diagnostics**: Ensure unhandled exceptions return generic error identifiers and status codes without stack traces, environment details, or internal file paths.

## 9. File Uploads & File Processing

- **Multi-Vector Validation**: Validate uploaded files by checking file extensions, declared MIME types, maximum file sizes, and binary signature magic bytes.
- **Safe Storage & Renaming**: Never store files using client-supplied filenames. Generate unique server-side UUIDs and store uploads outside the public web root.
- **Execution Prevention**: Store files on dedicated object storage (e.g., Cloud Storage, S3) or non-executable directories to prevent uploaded scripts from executing on the server.
- **Path Traversal Protection**: Sanitize file paths and reject requests containing path traversal sequences (`../`, null bytes, absolute paths) when handling file system operations.
- **Authorized Downloads**: Route sensitive file downloads through authenticated endpoints that enforce ownership and permission checks before streaming.

## 10. Secrets & Sensitive Data Management

- **Zero Hardcoded Secrets**: Never commit private keys, passwords, API credentials, encryption keys, or access tokens into source code, sample configs, or documentation.
- **Externalized Configuration**: Inject secrets via environment variables, trusted secret stores, or container orchestration vaults.
- **Masking & Redaction**: Automatically redact credentials, authentication headers, credit card numbers, and Personally Identifiable Information (PII) from logs and tracing systems.
- **Sample Configurations**: Provide template files (e.g., `.env.example`) containing clearly marked placeholders rather than actual values.
- **Compromise Remediation**: If a secret is exposed, immediately revoke and rotate the credential rather than merely removing the committed string.

## 11. Cryptography & Key Management

- **Standard Cryptographic Algorithms**: Use modern, standardized cryptographic libraries and algorithms (e.g., AES-256-GCM, ChaCha20-Poly1305, Ed25519, RSA-OAEP). Never attempt to create custom encryption or hashing algorithms.
- **Cryptographically Secure Randomness**: Generate security-sensitive tokens, keys, salt values, and identifiers using Cryptographically Secure Pseudorandom Number Generators (CSPRNG).
- **Transport Encryption**: Enforce TLS 1.2 or TLS 1.3 for all internal and external communication. Disallow insecure cipher suites and unencrypted fallback protocols.
- **No Insecure Modes**: Never use insecure cipher modes (e.g., ECB mode) or broken hash functions (e.g., MD5, SHA-1) for security-critical operations.

## 12. SSRF & Command Injection Prevention

- **Server-Side Request Forgery (SSRF) Defenses**: When fetching user-provided URLs, validate schemes (`http`/`https`), resolve DNS, and block private IP spaces, loopbacks, and cloud metadata endpoints (e.g., `127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`).
- **Eliminate Command Injection**: Avoid executing external shell processes. When subprocess execution is unavoidable, pass arguments as arrays to parameterized process APIs without shell interpolation.
- **No Dynamic Code Evaluation**: Never use dynamic evaluation primitives (`eval()`, `Function()`, `exec()`) on strings derived from external input.

## 13. Security Logging & Auditing

- **Audit Critical Events**: Log authentication attempts, authorization rejections, credential modifications, permission escalations, and sensitive data modifications with timestamps and principal IDs.
- **Sanitized Log Content**: Ensure log messages never contain passwords, session tokens, authorization headers, or customer financial records.
- **Tamper-Resistant Logging**: Ensure failed security operations produce audit records without disclosing exploitable internal diagnostics to the client.

## 14. Supply-Chain & Dependency Security

- **Vetted Dependencies**: Select maintained, reputable packages. Maintain deterministic package lockfiles (`package-lock.json`, `poetry.lock`, `Cargo.lock`, etc.).
- **Vulnerability Scanning**: Proactively audit dependencies for known vulnerabilities and CVEs using standard security scanning tools.
- **Restricted Execution**: Never execute arbitrary remote scripts directly from URLs (`curl | sh`).
- **Timely Patching**: Keep critical dependencies and security patches updated without delaying necessary security upgrades.

## 15. Deployment & Environment Hardening

- **Environment Segregation**: Maintain distinct configurations for development, testing, staging, and production environments.
- **Disable Debugging in Production**: Ensure verbose error screens, debug bars, and interactive development consoles are disabled in production builds.
- **Protect Admin Interfaces**: Restrict administrative portals, metrics endpoints, and database management tools behind VPNs, IP allowlists, and multi-factor authentication.

## 16. Security Testing & Verification

- **Negative Testing**: Author automated security tests that verify rejection of unauthorized access, expired tokens, forged payloads, and SQL/XSS injection attempts.
- **Verify Boundaries**: Test access control across tenants and roles, confirming that horizontal and vertical privilege boundaries hold under edge conditions.
- **Honest Test Reporting**: Never weaken assertions or disable security tests to pass builds; report all executed verification checks accurately.

## 17. Threat Modeling & Risk Management

- **Asset & Flow Identification**: Map data assets, trust boundaries, and potential attack vectors before implementing complex or sensitive features.
- **Holistic Threat Analysis**: Consider business-logic flaws (e.g., race conditions in balance transfers, checkout price manipulation) alongside standard technical vulnerabilities.
- **Prioritize Impact**: Address high-severity security risks immediately rather than deferring remediation with superficial patches.

## 18. Security Decision Principles

When evaluating security implementations:
1. **Security & Correctness Precedence**: Security, data integrity, and compliance take absolute priority over ease of development, aesthetic style, or rapid delivery.
2. **Standardized Over Improvised**: Always favor established platform tools, trusted libraries, and industry standards over homegrown security code.
3. **Transparent Limitations**: If a requested feature cannot be secured safely within the existing architecture, stop and explain the security risk and propose a hardened alternative.
4. **Authorization Required**: Obtain explicit user approval before modifying access control policies, altering production secrets, or introducing breaking security changes.

## 19. Security Issue Response Protocol

When a vulnerability or exposed secret is discovered during any task:
1. **Stop**: Pause the current change; do not build further on vulnerable code.
2. **Report**: Tell the user what was found, where, and its severity, redacting any secret values.
3. **Fix Critical First**: Resolve critical issues before resuming other work, using the `security-review` skill or `security-auditor` subagent for analysis.
4. **Rotate Exposed Secrets**: Recommend revoking and rotating any credential that may have been exposed (Section 10); removing it from code is not enough.
5. **Search for Siblings**: Search the codebase for the same pattern elsewhere and fix or report every instance.

*Adapted from ECC `common/security` (MIT); see THIRD_PARTY_NOTICES.md.*
