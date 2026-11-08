# API Documentation

This directory contains application programming interface specifications, contract definitions, schema definitions, and endpoint documentation.

---

## 1. Purpose & Scope
The artifacts stored in this directory define:
- **Formal Endpoint Contracts**: REST, GraphQL, and RPC interface definitions establishing exact URIs, HTTP methods, headers, parameters, and payloads.
- **Request & Response Envelopes**: Typed request DTOs, success payloads, pagination structures, and consistent error envelopes.
- **Authentication & Rate Limiting Protocols**: Required credential formats (Bearer JWT, API keys), permission scopes, and rate limit response headers.
- **Machine-Readable Schemas**: OpenAPI 3.1 specifications acting as single sources of truth for client generation and contract testing.

---

## 2. Expected Artifacts & Hierarchy
- **API Specifications & Contracts**: Comprehensive endpoint definitions detailing HTTP methods, URIs, query parameters, request bodies, response payloads, status codes, and error models. Authored as `API-[module-name]-spec.md`.
- **OpenAPI / Swagger Definitions**: Machine-readable OpenAPI 3.x specifications (`openapi.json` or `openapi.yaml`) synchronized with active route handlers.
- **Integration & Webhook Guides**: Integration recipes, webhook signing protocols, payload examples, and retry policies.

---

## 3. Authoring Workflow & Life-cycle
1. **Design First**: Leverage [api-development](../../.agents/skills/api-development/SKILL.md) and [api-documentation](../../.agents/skills/api-documentation/SKILL.md) skills.
2. **Template Adoption**: Structure endpoint documentation using the [API Specification Template](../../.agents/templates/api/api-spec-template.md).
3. **Reference Verification**: Consult the [HTTP Status Codes Reference](../../.agents/skills/api-development/references/http-status-codes.md) for RFC compliance.
4. **Code-Contract Synchronization**: Whenever route handlers, validation schemas, or controller logic change, update API specs in this directory synchronously.

---

## 4. Standards & Canonical Templates
- **API Spec Template**: [`.agents/templates/api/api-spec-template.md`](../../.agents/templates/api/api-spec-template.md)
- **API Design Rule**: [`.agents/rules/api-design.md`](../../.agents/rules/api-design.md)
- **Documentation Standards**: [`.agents/rules/documentation.md`](../../.agents/rules/documentation.md)
- **Backend Standards**: [`.agents/rules/backend.md`](../../.agents/rules/backend.md)

---

## 5. API Contract Review Checklist
- [ ] Endpoints use pluralized nouns for resources (e.g., `/api/v1/users`).
- [ ] HTTP verbs align with semantic operations (`GET` read, `POST` create, `PUT` replace, `PATCH` update, `DELETE` remove).
- [ ] Standard error envelope is utilized for all error responses (4xx, 5xx).
- [ ] Pagination parameters (`page`, `limit` or cursor) and metadata are documented for list endpoints.
- [ ] Authentication, authorization scopes, and rate limits are explicitly specified.
