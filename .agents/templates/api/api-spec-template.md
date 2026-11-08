# API Specification: [Service or API Name]

## 1. Document Control & Overview
- **API Title**: `[e.g., TaskFlow REST API]`
- **Version**: `1.0.0`
- **Protocol & Paradigm**: `[REST / JSON HTTP / GraphQL / gRPC]`
- **Base URL**: `https://api.example.com/v1` (Production) / `http://localhost:3000/v1` (Development)
- **Status**: `[Draft / Review / Approved / Deprecated]`
- **Last Updated**: YYYY-MM-DD
- **Author / Team**: `[Team Name]`

## 2. Global Conventions & Standards
- **Content-Type**: `application/json` (unless binary upload/download)
- **Character Encoding**: `UTF-8`
- **Date/Time Format**: ISO 8601 UTC string (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Identifier Format**: UUIDv4 (`[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`)
- **Casing Convention**:
  - Request body & JSON fields: `camelCase` (or `snake_case` based on project rule)
  - Query parameters: `camelCase` (or `snake_case`)
  - HTTP Headers: `Kebab-Case` (e.g., `X-Correlation-ID`)

## 3. Authentication & Authorization
- **Scheme**: `Bearer <JWT>` in HTTP `Authorization` header
- **Token Acquisition**: `POST /v1/auth/login`
- **Role & Scope Mapping**:
  - `admin`: Full administrative access to all resources.
  - `user`: Standard access restricted to tenant/owned resources.
  - `viewer`: Read-only access to authorized resources.

## 4. Standard Response & Error Envelopes

### 4.1 Success Response Envelope (Single Resource)
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "createdAt": "2026-11-01T00:00:00.000Z"
  }
}
```

### 4.2 Success Response Envelope (Paginated Collection)
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasMore": true
  }
}
```

### 4.3 Error Response Envelope (RFC 9457 Problem Details)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters.",
    "details": [
      {
        "field": "title",
        "issue": "String must contain at least 1 character"
      }
    ]
  }
}
```

### 4.4 Global Error Codes Catalog
| HTTP Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `BAD_REQUEST` / `VALIDATION_ERROR` | Malformed JSON or input validation failure. |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing, expired, or invalid authorization token. |
| `403 Forbidden` | `FORBIDDEN` | Authenticated caller lacks permission for this resource. |
| `404 Not Found` | `NOT_FOUND` | Resource does not exist or caller cannot access it. |
| `409 Conflict` | `CONFLICT` | Concurrent edit conflict or unique constraint collision. |
| `422 Unprocessable`| `UNPROCESSABLE_ENTITY` | Semantic or business logic validation failure. |
| `429 Too Many Req` | `RATE_LIMITED` | Rate limit threshold exceeded. |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | Unexpected server defect. |

---

## 5. Endpoints Catalog

### 5.1 [Resource Name] — [Operation Name]
- **Method & Path**: `POST /v1/resources`
- **Summary**: Creates a new resource within the authenticated context.
- **Authentication**: Required (`Bearer <JWT>`)
- **Required Roles / Scopes**: `admin`, `user`
- **Idempotency**: Supported via `Idempotency-Key` request header.

#### Request Parameters
- **Headers**:
  - `Authorization` (`string`, Required): Bearer token.
  - `Idempotency-Key` (`string`, Optional): Unique request UUID.
- **Path Parameters**: None
- **Query Parameters**: None

#### Request Body (`application/json`)
```json
{
  "title": "Example Resource",
  "description": "Optional detailed description.",
  "status": "pending"
}
```

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `title` | `string` | Yes | 1..255 characters | Display name of the resource. |
| `description` | `string` | No | Max 2000 characters | Optional narrative description. |
| `status` | `string` | No | Enum: `["pending", "active"]`, default: `pending` | Initial resource status. |

#### Response: `201 Created`
- **Headers**: `Location: /v1/resources/123e4567-e89b-12d3-a456-426614174000`
- **Body (`application/json`)**:
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Example Resource",
    "description": "Optional detailed description.",
    "status": "pending",
    "createdAt": "2026-11-01T00:00:00.000Z",
    "updatedAt": "2026-11-01T00:00:00.000Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid payload syntax or validation error.
- `401 Unauthorized`: Missing or invalid credentials.
- `409 Conflict`: Resource with matching unique key already exists.

---

### 5.2 [Resource Name] — List Resources
- **Method & Path**: `GET /v1/resources`
- **Summary**: Retrieves a paginated list of resources matching optional filters.
- **Authentication**: Required (`Bearer <JWT>`)
- **Required Roles / Scopes**: `admin`, `user`, `viewer`

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | `integer` | No | `1` | Page number (1-based index). |
| `limit` | `integer` | No | `20` | Items per page (min: 1, max: 100). |
| `status` | `string` | No | None | Filter by status enum. |
| `sortBy` | `string` | No | `createdAt` | Field to sort by: `["createdAt", "title"]`. |
| `sortOrder` | `string` | No | `desc` | Direction: `["asc", "desc"]`. |

#### Response: `200 OK`
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Example Resource",
      "status": "pending",
      "createdAt": "2026-11-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasMore": false
  }
}
```

---

## 6. Rate Limiting & Protection
- **Standard Quota**: 100 requests per minute per IP / authenticated user.
- **Headers Returned**:
  - `X-RateLimit-Limit`: Maximum requests permitted in window.
  - `X-RateLimit-Remaining`: Remaining request quota.
  - `X-RateLimit-Reset`: Unix timestamp when quota resets.
- **Exceeded Response**: `429 Too Many Requests` with `Retry-After` header.

## 7. Webhooks & Event Notifications (Optional)
- **Signature Verification**: HMAC-SHA256 signature in `X-Signature-SHA256` header.
- **Payload Structure**:
```json
{
  "id": "evt_123e4567-e89b-12d3-a456-426614174000",
  "event": "resource.created",
  "timestamp": "2026-11-01T00:00:00.000Z",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```
