# Data Dictionary: [Database or System Name]

## 1. Document Overview
- **Database Engine & Version**: `[e.g., PostgreSQL 16]`
- **Last Updated**: YYYY-MM-DD
- **Target Schema / Environment**: `[e.g., public / production]`
- **Data Classification Standards**:
  - `Public`: Non-sensitive data suitable for public consumption.
  - `Internal`: Proprietary operational data for authenticated system users.
  - `Confidential`: Sensitive business or financial data.
  - `PII / Restricted`: Personally Identifiable Information requiring encryption and strict access auditing.

## 2. Table Index & Entity Summaries

| Table Name | Schema | Domain / Module | Sensitivity | Purpose Summary |
|---|---|---|---|---|
| `[table_a]` | public | [Domain] | Internal | [Brief description of stored records] |
| `[table_b]` | public | [Domain] | PII / Restricted | [Brief description of stored records] |

## 3. Data Dictionary Entries

### 3.1 Table: `[table_a]`
- **Description**: Detailed business purpose of table.
- **Primary System of Record**: `[Core Application]`
- **Estimated Row Count**: `[Volume]`

| Column Name | Data Type | Nullable | Primary / Foreign Key | Default | Allowable Values / Enums | Data Classification | Description & Business Rules |
|---|---|---|---|---|---|---|---|
| `id` | `UUID` | No | PK | `gen_random_uuid()` | UUIDv4 | Internal | Surrogate primary key. |
| `name` | `VARCHAR(100)` | No | None | None | 1–100 chars | Internal | Entity display name. |
| `status` | `VARCHAR(20)` | No | None | `'PENDING'` | `PENDING`, `ACTIVE`, `ARCHIVED` | Internal | Current operational status. |
| `created_at` | `TIMESTAMPTZ` | No | None | `CURRENT_TIMESTAMP` | Valid ISO 8601 | Internal | UTC creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | No | None | `CURRENT_TIMESTAMP` | Valid ISO 8601 | Internal | UTC last-modified timestamp. |

---

### 3.2 Table: `[table_b]`
- **Description**: Detailed business purpose of table.
- **Primary System of Record**: `[Core Application]`
- **Estimated Row Count**: `[Volume]`

| Column Name | Data Type | Nullable | Primary / Foreign Key | Default | Allowable Values / Enums | Data Classification | Description & Business Rules |
|---|---|---|---|---|---|---|---|
| `id` | `UUID` | No | PK | `gen_random_uuid()` | UUIDv4 | Internal | Surrogate primary key. |
| `table_a_id` | `UUID` | No | FK (`table_a.id`) | None | Valid `table_a` ID | Internal | Parent entity reference. Deletion action: RESTRICT. |
| `email` | `VARCHAR(255)` | No | None | None | Valid email format | PII / Restricted | User email address. Must be unique per tenant. |
| `is_verified` | `BOOLEAN` | No | None | `FALSE` | `TRUE`, `FALSE` | Internal | Email verification state. |

## 4. Enumerated Types & Standard Value Sets

### Enum: `[enum_name]`
| Value | Description | Lifecycle Notes |
|---|---|---|
| `'PENDING'` | Initial state upon submission. | Awaiting review or verification. |
| `'ACTIVE'` | Fully operational and active. | Normal working state. |
| `'ARCHIVED'` | Soft-deleted or deactivated. | Read-only state for compliance. |

## 5. Security & Compliance Notes
- **PII Columns**: Columns designated as `PII / Restricted` must never appear in raw application logs or open metric tags.
- **Encryption Requirements**: Data at rest encrypted via AES-256; sensitive fields (e.g., auth tokens) hashed using approved cryptographic algorithms.
- **Retention & Purging**: Inactive records retained according to the statutory data retention policy before automated purging.
