# HTTP Status Codes & REST API Contract Standards

This reference documents standard HTTP status codes, use cases, and response envelope patterns for API endpoints developed within the framework.

---

## 1. Success Codes (2xx)

- **200 OK**: Standard response for successful `GET`, `PUT`, or `PATCH` requests returning payload data.
- **201 Created**: Successful resource creation from a `POST` request. Must return the newly created resource or a `Location` header.
- **202 Accepted**: Request accepted for background processing (asynchronous batch operations).
- **204 No Content**: Successful action returning no response body (typically `DELETE`).

---

## 2. Redirection Codes (3xx)

- **301 Moved Permanently**: Target resource assigned a new permanent URI.
- **304 Not Modified**: Conditional request (e.g., `If-None-Match` matching ETag). Informs client to use cached copy.

---

## 3. Client Error Codes (4xx)

- **400 Bad Request**: Malformed syntax, invalid JSON payload, or schema validation error.
- **401 Unauthorized**: Request lacks valid authentication credentials.
- **403 Forbidden**: Authenticated caller lacks authorization to access the specific resource.
- **404 Not Found**: Target resource does not exist.
- **409 Conflict**: Request cannot be completed due to a conflict with current resource state (e.g., duplicate unique key).
- **422 Unprocessable Entity**: Syntactically valid JSON, but fails semantic domain validation rules.
- **429 Too Many Requests**: Client has exceeded rate limit quota. Must include `Retry-After` header.

---

## 4. Server Error Codes (5xx)

- **500 Internal Server Error**: Unhandled server-side exception. Never leak internal stack traces to clients.
- **502 Bad Gateway**: Upstream service returned an invalid response.
- **503 Service Unavailable**: Server temporarily overloaded or undergoing maintenance.
- **504 Gateway Timeout**: Upstream gateway or database query timed out.

---

## 5. Standard Error Envelope Pattern

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request payload failed validation.",
    "details": [
      {
        "field": "email",
        "issue": "Must be a valid RFC 5322 email address"
      }
    ]
  }
}
```
