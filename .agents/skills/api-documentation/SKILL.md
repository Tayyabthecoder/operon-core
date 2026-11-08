---
name: api-documentation
description: Creates, audits, validates, and maintains accurate API documentation based on actual implementations and approved contracts. Use when documenting endpoints, request and response schemas, authentication, error codes, pagination, webhooks, API versioning, integration examples, or OpenAPI specifications, and when detecting mismatches between documentation and API behavior.
---

# API Documentation Skill

This skill guides the AI coding agent to inspect, author, validate, update, and maintain accurate API documentation grounded in actual implementations and approved contracts. It covers REST, JSON HTTP APIs, internal services, versioned contracts, OpenAPI specifications, webhooks, and client integration guides.

## 1. Purpose and Core Principles

API documentation serves as the contract between backend services and consumers (frontend developers, partner integrators, testers, and client services):

- **Reflect Verified Reality**: Base documentation on actual route handlers, middleware, validators, serializers, and tests. Never invent endpoints, parameters, fields, status codes, or business logic.
- **Integration Contract**: Explain required headers, schemas, auth, success responses, errors, pagination, rate limits, and safe testing.
- **Clarity & Consistency**: Use uniform terminology, exact casing (`camelCase`, `snake_case`), ISO 8601 UTC timestamps, and standard error envelopes.
- **Security & Privacy**: Never include real tokens, passwords, private keys, database URLs, or customer records. Use synthetic placeholders (`https://api.example.com`, `YOUR_ACCESS_TOKEN`, `usr_syn_1024`). Segregate public APIs from internal services.
- **Report Discrepancies**: When code contradicts an approved PRD, SRS, or OpenAPI file, explicitly report the mismatch rather than guessing.

*Scope Boundary*: Focuses on authoring and validating API contracts. For implementation, use [api-development](../api-development/SKILL.md); for architectural standards, use [api-design.md](../../rules/api-design.md); for security audits, use [security-review](../security-review/SKILL.md); for testing, use [testing-qa](../testing-qa/SKILL.md).

## 2. Defining Documentation Scope

Before drafting documentation, establish clear parameters:
- **Target Service & Domain**: Identify the specific service or bounded context (e.g., Catalog vs. Checkout).
- **Intended Audience**: Internal frontend engineers, microservices, mobile apps, partners, or public consumers.
- **In-Scope vs. Excluded Endpoints**: Specify whether the task covers the entire API, a resource (`/api/v1/books/*`), or a single route. Document partial coverage explicitly.
- **Source of Truth**: Identify authority: code-first (controllers), spec-first (OpenAPI YAML), or requirements-first (approved contracts).
- **Output Formats**: OpenAPI 3.0/3.1 specs, Markdown reference files (`docs/api/`), README quickstarts, or interactive catalogs.

## 3. API Discovery Workflow

Discover actual API behavior systematically across three steps:

```mermaid
graph TD
    A[Step A: Route Discovery] --> B[Step B: Execution Path Tracing]
    B --> C[Step C: Contract Confirmation]
    C --> D[Document & Validate]
```

- **Step A (Identify Routes)**: Inspect router definitions, annotations, gateway manifests, and route registries. Determine HTTP methods, path templates (`GET /api/v1/books/{id}`), route parameters, nested routes, version prefixes (`/api/v1/`), active middleware, and public vs. private boundaries.
- **Step B (Trace Execution Path)**: Trace each endpoint through middleware (auth, rate limits), ingress validation (DTOs, schemas), controller handlers (logic, services), serialization (DTOs, masking), and exception filters (status codes, errors).
- **Step C (Confirm Contract Details)**: Verify observable behaviors against code and tests: mandatory vs. optional parameters, defaults, success status codes (`200`, `201`, `204`), error formats, and failure conditions. Mark unverified behaviors as `Requires Verification`.

## 4. Standardized Endpoint Documentation Structure

Document each API endpoint using this modular template:

```markdown
### [Operation Name]
**`[METHOD]`** `[PATH]`
[Summary of endpoint purpose and business operation.]

#### Authentication & Authorization
- **Auth**: `Bearer Token` | `API Key (Header: X-API-Key)` | `Public`
- **Permissions**: `books:read`, `role:admin` | **Scope**: Tenant/user-isolated.

#### Parameters & Body
- **Path**: `id` (`string, uuid`, Required) — Target book identifier.
- **Query**: `include_reviews` (`boolean`, Optional, default: `false`).
- **Body (`application/json`)**: `title` (`string`, Req, 1..255 chars), `price` (`number`, Req, >= 0.00).

#### Responses
- **`200 OK`** (`application/json`): `{ "data": { "id": "uuid", "title": "Clean Code" } }`
- **`400 Bad Request`** (`application/problem+json`): Input validation failure.
- **`401 Unauthorized`**: Missing or invalid credentials.
- **`404 Not Found`**: Resource does not exist or caller lacks access.

#### Considerations
- **Idempotency**: Safe read-only request (`GET`).
- **Rate Limit**: Standard tier (100 req/min). Returns `429 Too Many Requests`.
```

## 5. HTTP Methods and Status Codes

Follow exact HTTP semantics based on verified route behavior:

| Method | Semantics & Idempotency | Success Status Codes |
| :--- | :--- | :--- |
| `GET` | Safe, idempotent read operations. | `200 OK` (with JSON body) |
| `POST` | Unsafe, non-idempotent creation/action. | `201 Created` (with `Location`), `200 OK`, `202 Accepted` |
| `PUT` | Idempotent complete resource replacement. | `200 OK` (updated body) or `204 No Content` |
| `PATCH`| Partial mutation of specific fields. | `200 OK` (updated body) or `204 No Content` |
| `DELETE`| Idempotent resource removal. | `200 OK` (summary) or `204 No Content` (strictly empty body) |
| `HEAD` | Identical to `GET`, headers only. | `200 OK` (zero content bytes) |

- **No Body on 204**: A `204 No Content` response MUST NOT contain any body bytes.
- **No 200 for Errors**: Never document synthetic `200 OK` responses containing error payloads.
- **401 vs. 403**: `401 Unauthorized` means unauthenticated; `403 Forbidden` means authenticated but unauthorized.
- **Accurate Failure Codes**: Document `409 Conflict` for collisions, `422 Unprocessable Entity` for domain validation, and `429 Too Many Requests` for rate throttling.

## 6. Request and Response Schema Documentation

Represent data models with rigorous field-level accuracy:
- **Field Name & Casing**: Preserve exact wire naming (`isbn_13` vs `isbn13` vs `isbn`).
- **Data Types**: Specify primitive types (`string`, `integer`, `number`, `boolean`), formats (`uuid`, `date-time`, `email`), arrays (`array[string]`), and complex nested objects.
- **Presence vs. Nullability**: Distinguish required non-nullable, required nullable (`null` allowed), optional, and empty collections (`[]`, not `null`).
- **Constraints & Enums**: Document enum values (`["draft", "published"]`), string bounds (lengths, regex), and numeric ranges (`minimum: 0`).
- **Read-Only / Write-Only**: Mark system IDs and timestamps as `readOnly`; mark passwords/secrets as `writeOnly`.
- **Serializers vs. Database Tables**: Document transformed DTOs and exclude private columns (`password_hash`, internal IDs).

## 7. Authentication and Authorization Documentation

Document client security requirements without exposing infrastructure secrets:
- **Bearer Tokens (JWT / OAuth2)**: Header: `Authorization: Bearer <token>`. Document acquisition endpoint, expiration, and required claims.
- **API Keys**: Header: `X-API-Key: <key>` or query parameter `?api_key=<key>`. Document generation and scoping.
- **Session Cookies & CSRF**: Cookie: `session_id=<id>` with required anti-CSRF header (`X-CSRF-Token: <token>`) for state-changing requests.
- **Authorization Policies**: Document permission strings, roles (`Admin`, `Editor`), OAuth scopes (`books:write`), and tenant boundaries. Synthetic placeholder: `Authorization: Bearer YOUR_SYNTHETIC_TOKEN`.

## 8. Validation Rules and Error Contracts

Document how the API responds to invalid requests using structured problem envelopes:

### Standard Error Representation (RFC 9457)
```json
{
  "type": "https://api.example.com/errors/validation-failed", "title": "Validation Failed", "status": 422,
  "detail": "Payload failed validation constraints.", "instance": "/api/v1/books",
  "errors": [{ "field": "isbn", "code": "INVALID_FORMAT", "message": "ISBN must be 13 digits." }]
}
```

- **Validation Checklist**: Specify which validation rules trigger `400 Bad Request` (syntactic/malformed JSON) vs. `422 Unprocessable Entity` (semantic/domain violations).
- **Machine-Readable Codes**: List stable error codes (`BOOK_NOT_FOUND`, `DUPLICATE_ISBN`) and expected client recovery actions.

## 9. Pagination, Filtering, Sorting, and Search

Document collection endpoints with explicit query parameters and envelope structures:

- **Offset / Limit**: `?offset=20&limit=10` or `?page=2&page_size=20`. Document default limit and hard maximum ceiling.
- **Cursor / Keyset**: `?cursor=eyJpZCI6MTA0fQ==&limit=50`. Document cursor encoding, stability, and continuation.
- **Envelope Structure**:
  ```json
  {
    "data": [{ "id": "1", "title": "Book A" }],
    "meta": { "page": 2, "page_size": 20, "total_records": 142, "total_pages": 8 },
    "links": { "self": "/api/v1/books?page=2", "next": "/api/v1/books?page=3", "prev": "/api/v1/books?page=1" }
  }
  ```
- **Filtering & Sorting**: Document filter operators (exact, range, multi-value) and sort syntax (`?sort=-created_at,title`).

## 10. API Versioning, Deprecation, and Compatibility

Document versioning mechanics and lifecycle policies:
- **Versioning Strategies**: URI Path (`/api/v1/books`), Custom Header (`X-API-Version: 2026-10-01`), or Media Type (`Accept: application/vnd.company.v2+json`).
- **Compatibility**: Backward-compatible: optional parameters, added fields. Breaking: renamed/removed fields, tighter validation, type/status changes.
- **Deprecation**: Document sunset timeline, migration link, and headers: `Deprecation: true`, `Sunset: <date>`, and `Link: <...>; rel="deprecation"`.

## 11. OpenAPI Specification Authoring and Maintenance

When maintaining OpenAPI (`openapi.yaml` or `openapi.json`), adhere to OpenAPI 3.0 or 3.1 standards:

```yaml
openapi: 3.1.0
info: { title: "Book API", version: "1.0.0" }
paths:
  /books/{id}:
    get:
      summary: Get book by ID
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      responses:
        '200':
          description: Book details
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Book' }
components:
  schemas:
    Book:
      type: object
      required: [id, title, price]
      properties:
        id: { type: string, format: uuid }
        title: { type: string }
        price: { type: number }
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
```

- **Reusable Components (`$ref`)**: Centralize common schemas (`ErrorResponse`, `PaginationMeta`), parameters, and security definitions under `components/`.
- **Single Source of Truth**: Never maintain competing OpenAPI files for the same service. If code annotations generate the spec, update the code; if spec-first, edit the master YAML.

## 12. Multi-Language Integration Examples

Provide realistic, copy-pasteable examples for client integrations using synthetic credentials:

```bash
# cURL
curl -s -X POST "https://api.example.com/v1/books" -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" -d '{"title":"Clean Code","isbn":"9780132350884","price":39.99}'
```

```typescript
// TypeScript (fetch)
const res = await fetch('https://api.example.com/v1/books', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_ACCESS_TOKEN', 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Clean Code', isbn: '9780132350884', price: 39.99 }),
});
const data = await res.json();
```

```python
# Python (requests)
import requests
res = requests.post("https://api.example.com/v1/books",
  headers={"Authorization": "Bearer YOUR_ACCESS_TOKEN"}, json={"title":"Clean Code","price":39.99}, timeout=10)
```

## 13. Webhooks and Asynchronous Operations

Document asynchronous jobs and webhook notifications with exact event schemas and security:
- **Asynchronous Operations**: Return `202 Accepted` with status polling link: Header `Location: /api/v1/tasks/tsk_9104`, body `{"task_id": "tsk_9104", "status": "processing"}`. States: `pending`, `processing`, `completed`, `failed`.
- **Webhook Event Envelope**:
  ```json
  {
    "event_id": "evt_syn_5829104", "event_type": "book.published", "timestamp": "2026-10-24T12:00:00Z",
    "data": { "book_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "title": "Clean Code" }
  }
  ```
- **Webhook Security & Retries**: Document HMAC-SHA256 signature headers (`X-Signature-SHA256: hex_digest`), timestamp replay protection, exponential retry backoff, and consumer idempotency via `event_id`.

## 14. Rate Limits, Idempotency, Caching, and Concurrency

Document operational behaviors when part of the public contract:
- **Rate Limiting**: Document headers `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (epoch seconds), and `Retry-After` on `429 Too Many Requests`.
- **Idempotency Keys**: Document header `Idempotency-Key: <uuid>` for mutations (`POST`). Identical keys return cached responses without re-execution. Document TTL.
- **Caching & Concurrency**: Document `Cache-Control`, `ETag`/`If-None-Match` (`304 Not Modified`), and optimistic locking via `If-Match` returning `412` or `409`.

## 15. Serialization, Data Types, and File Handling

Document specific serialization quirks that cause integration failures:
- **Timestamps**: All timestamps MUST be ISO 8601 strings in UTC (`YYYY-MM-DDTHH:mm:ssZ`).
- **Financial Values**: Document whether prices are strings (`"45.00"`), decimals, or integer cents (`4500`) to avoid IEEE-754 float rounding errors.
- **64-bit Integers (BigInt)**: Large 64-bit IDs must serialize as strings (`"182749102847291048"`) to avoid JavaScript integer truncation (> $2^{53}-1$).
- **File Uploads / Downloads**: Document `multipart/form-data` endpoints, file size limits (e.g., `10MB`), allowed MIME types, binary streams (`application/octet-stream`), `Content-Disposition`, and HTTP `Range` requests (`206 Partial Content`).

## 16. Documentation Formats and File Layout

Store and organize documentation following project repository conventions:
- `docs/api/README.md` (overview, auth, errors), `openapi.yaml` (master spec), `resources/*.md` (endpoints by domain), `webhooks.md` (events), `guides/*.md` (integration walkthroughs).

Keep machine-readable specifications (`openapi.yaml`) synchronized with human-readable markdown guides. Never duplicate full schema definitions manually across multiple files.

## 17. Drift Detection and Inconsistency Resolution

Documentation drift occurs when code evolves while documentation remains static. Execute this 7-step resolution process when mismatches are detected:

```mermaid
graph TD
    A[1. Source of Truth] --> B[2. Cross-Compare]
    B --> C[3. Identify Stale Side]
    C --> D[4. Report Mismatch]
    D --> E[5. Update Authorized Doc]
    E --> F[6. Validate Fix]
    F --> G[7. Audit References]
```

1. **Source of Truth**: Identify whether code or spec is authoritative based on governance.
2. **Cross-Compare**: Compare route declarations, handlers, DTOs, and test assertions against documentation.
3. **Identify Stale Side**: Determine whether documentation is outdated or code introduced an unauthorized change.
4. **Report Mismatch**: Detail exact file paths, line numbers, and discrepancy specifics.
5. **Update Authorized Document**: Update only authorized documentation files; never modify backend code during a doc task.
6. **Validate Fix**: Run schema linters or doc builds to verify correction.
7. **Audit References**: Check READMEs, client examples, and companion guides for stale references.

## 18. Documentation Validation and Testing

Validate documentation structure, syntax, and contract fidelity:
- **Syntax & Schema Validation**: Validate OpenAPI YAML/JSON with CLI linters (Spectral, Redocly CLI, Swagger CLI).
- **Broken Reference Checking**: Verify all `$ref: '#/components/...'` links resolve to defined schemas.
- **Example Validation**: Verify that request and response examples conform strictly to declared JSON schemas.
- **Route-to-Doc Audit**: Compare registered framework routes with documented endpoints to detect omitted or orphaned paths.
- **Static vs. Runtime Distinction**: Structural linting passing does NOT guarantee runtime correctness. State clearly whether documentation was verified via static code inspection or live endpoint execution.

## 19. Security, Privacy, and Synthetic Placeholders

Protect credentials, customer records, and internal architecture:
- **Zero Real Credentials**: Never commit actual API keys, passwords, JWT secrets, or private certificates.
- **Standard Synthetic Placeholders**: Hosts (`https://api.example.com`), Tokens (`Bearer YOUR_ACCESS_TOKEN`), API Keys (`X-API-Key: syn_live_abc123xyz789`), Emails (`user@example.com`), UUIDs (`9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d`).
- **Customer Privacy**: Never sanitize real database dumps for documentation. Author synthetic records from scratch.
- **Incident Protocol**: If existing docs expose a secret, do NOT repeat it. Note the location, report the leak immediately, and recommend token revocation.

## 20. Practical Decision Guide

Apply targeted actions across common API documentation scenarios:

| Scenario | Recommended Action |
| :--- | :--- |
| **New endpoint** | Trace route, handler, validator, serializer, tests; write docs with cURL/TS examples. |
| **Payload modified** | Update schemas, examples; evaluate backward-compatibility risks. |
| **Integration issue** | Clarify auth headers, parameter casing, required vs optional fields; provide verified cURL. |
| **Spec/code mismatch** | Identify source of truth; report discrepancy before editing. |
| **Inconsistent errors** | Document observed errors honestly; propose RFC 9457 standardization. |
| **Ambiguous field rule** | Inspect validator schemas (Zod, Pydantic) and tests instead of guessing. |
| **Multi-role access** | Document required permissions, role matrices, and middleware guards. |
| **Pagination unclear** | Inspect query handlers, DB `limit`/`offset`/cursor logic, and response metadata. |
| **Zero docs exist** | Create clean `docs/api/README.md` and OpenAPI 3.1 YAML covering verified public endpoints. |
| **Existing OpenAPI** | Extend existing spec; never introduce competing duplicate files. |
| **Shared internal/public** | Isolate internal admin endpoints (`/api/internal/*`) in separate restricted docs. |
| **Validation fails** | Fix broken `$ref`, invalid YAML indentation, or schema type mismatches. |
| **Breaking change** | Document breaking impact, migration path, and `@deprecated`/`Sunset` headers. |
| **Unverifiable runtime** | Document static findings; tag unverified behaviors as `Requires Verification`. |

## 21. Remediation Boundaries and Change Safety

Follow strict safety boundaries when performing API documentation tasks:
- **Read-Only Code Policy**: Do not modify backend controller logic, routing files, or database models during documentation tasks.
- **No Speculative Fabrications**: Do not invent endpoints, fields, or status codes to fill gaps.
- **Preserve User Changes**: Check git working tree before editing documentation files; preserve existing modifications.
- **No Production Probing**: Never execute live destructive requests (`DELETE`, `POST`, `PUT`) against production environments.
- **Minimal Dependencies**: Use existing documentation tools and linters; avoid introducing heavy npm/python doc tooling unprompted.

## 22. Expected API Documentation Report Format

Conclude substantive documentation tasks with a structured diagnostic report:

```markdown
# API Documentation Report: [Service Name]
- **Scope**: Documented endpoints under `/api/v1/...` (Target: Frontend/Partners).
- **Artifacts**: `docs/api/openapi.yaml`, `docs/api/resources/...`.
- **Verification**: Verified routes (`src/routes/...`), validation (`src/validators/...`), and DTOs against code/tests.
- **Discrepancies**:
  - `[DISC-01]`: Route returns `200` instead of `201`; documented observed behavior, flagged for fix.
- **Validation**: OpenAPI syntax passed; example schema conformity passed.
```

## 23. Alignment with Existing Rules and Skills

This skill integrates with repository governance rules and development skills:
- **Rules**: [core-workflow.md](../../rules/core-workflow.md), [change-safety.md](../../rules/change-safety.md) (inspect first, no code mutation in doc tasks); [api-design.md](../../rules/api-design.md) (REST standards, RFC 9457); [documentation.md](../../rules/documentation.md) (`docs/api/` layout); [security.md](../../rules/security.md) (zero secret leaks).
- **Companion Skills**: [api-development](../api-development/SKILL.md) (implementation); [security-review](../security-review/SKILL.md) (security analysis); [testing-qa](../testing-qa/SKILL.md) (contract tests).

## 24. Final Validation Checklist

Before finalizing API documentation, verify all 10 criteria:

- [ ] **1. Route Reality**: Every route, method, and parameter verified against code or approved specs.
- [ ] **2. HTTP Semantics**: Status codes (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `422`) match code; no body on `204`.
- [ ] **3. Detailed Schemas**: Types, nullability, requirement rules, bounds, and enums documented.
- [ ] **4. Auth & Scopes**: Authentication schemes, required scopes/roles, and tenant isolation specified.
- [ ] **5. Error Contracts**: Machine-readable error codes and RFC 9457 structures specified.
- [ ] **6. Synthetic Examples**: Examples (cURL, TS, Python) use safe placeholders with zero real secrets or PII.
- [ ] **7. Operational Signals**: Pagination, sorting, filtering, rate limits, and idempotency documented.
- [ ] **8. Valid OpenAPI**: OpenAPI 3.0/3.1 specs use valid syntax, reusable `$ref`, and pass linting.
- [ ] **9. Discrepancies Surfaced**: Code-contract mismatches explicitly reported rather than hidden.
- [ ] **10. Safe Scope**: No backend application code, routing, or database files modified.
