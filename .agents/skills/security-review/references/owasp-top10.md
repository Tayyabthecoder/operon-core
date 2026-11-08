# OWASP Top 10 Vulnerabilities Reference Guide

This reference provides a practical mapping of OWASP Top 10 vulnerabilities, detection patterns, and mitigation strategies for agent-assisted security audits.

---

## 1. A01:2021 — Broken Access Control
- **Description**: Restrictions on what authenticated users are allowed to do are not properly enforced.
- **Common Flaws**: IDOR (Insecure Direct Object Reference), missing function-level access control, bypassing JWT authorization checks.
- **Verification**: Check server-side authorization middleware on all routes. Verify resource ownership before mutations.
- **Mitigation**: Implement role-based (RBAC) or attribute-based (ABAC) access control. Deny by default.

---

## 2. A02:2021 — Cryptographic Failures
- **Description**: Sensitive data exposure in transit or at rest due to weak or absent cryptography.
- **Common Flaws**: Plaintext password storage, weak hashing algorithms (MD5, SHA1), hardcoded encryption keys.
- **Verification**: Ensure passwords use slow salted hashes (bcrypt, Argon2id, scrypt). Enforce TLS 1.3 in transit.
- **Mitigation**: Rotate keys regularly. Never commit private keys, keystores, or `.env` files into source control.

---

## 3. A03:2021 — Injection
- **Description**: Untrusted user data is sent to an interpreter as part of a command or query.
- **Common Flaws**: SQL injection via string concatenation, command injection via `child_process.exec`, NoSQL injection.
- **Verification**: Audit all database queries and shell executions. Ensure parameterized queries or ORM abstractions.
- **Mitigation**: Use parameterized queries exclusively. Never pass unsanitized input to child process spawners or shell interpreters.

---

## 4. A04:2021 — Insecure Design
- **Description**: Flaws originating from missing or ineffective security design patterns before code implementation.
- **Common Flaws**: Lack of rate limiting on password resets, business logic flaws, absent threat modeling.
- **Mitigation**: Apply defense in depth. Establish threat modeling during the specification and planning phase.

---

## 5. A05:2021 — Security Misconfiguration
- **Description**: Default configurations, open cloud storage permissions, verbose error messages with stack traces in production.
- **Verification**: Disable directory listing, ensure debugging headers are disabled in production, secure CORS policies.
- **Mitigation**: Automate environment hardening and configuration auditing across environments.

---

## 6. A06:2021 — Vulnerable and Outdated Components
- **Description**: Dependencies with known vulnerabilities (CVEs) running in production.
- **Verification**: Run `npm audit` or equivalent dependency scanners regularly.
- **Mitigation**: Keep dependencies pinned and patched. Automate lockfile integrity validation.

---

## 7. A07:2021 — Identification and Authentication Failures
- **Description**: Weak authentication mechanisms permitting brute-force attacks, credential stuffing, or session hijacking.
- **Verification**: Verify session invalidation upon logout, enforce session timeouts, use secure HTTP-only cookies.
- **Mitigation**: Implement multi-factor authentication (MFA) and rate limiting on all authentication entry points.

---

## 8. A08:2021 — Software and Data Integrity Failures
- **Description**: Code and infrastructure that does not protect against integrity violations (untrusted CI/CD plugins, insecure deserialization).
- **Mitigation**: Verify cryptographic signatures of downloaded artifacts. Restrict CI/CD pipeline write permissions.

---

## 9. A09:2021 — Security Logging and Monitoring Failures
- **Description**: Insufficient logging of authentication events, high-value transactions, or critical authorization failures.
- **Mitigation**: Log all authentication successes and failures with structured metadata. Redact sensitive values.

---

## 10. A10:2021 — Server-Side Request Forgery (SSRF)
- **Description**: Web application fetches a remote resource without validating the user-supplied URL.
- **Mitigation**: Validate destination hostnames against an explicit allowlist. Restrict access to internal metadata endpoints.
