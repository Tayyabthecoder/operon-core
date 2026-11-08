# Database Normalization and Schema Integrity Guide

This reference provides architectural rules and practical guidelines for designing relational database schemas within the framework.

---

## 1. Normal Forms Hierarchy

### First Normal Form (1NF)
- Each table cell contains a single (atomic) value.
- No repeating groups or comma-separated lists in columns.
- Each record possesses a unique identifier (Primary Key).

### Second Normal Form (2NF)
- Satisfies 1NF.
- All non-key attributes are fully functionally dependent on the entire primary key (eliminates partial key dependencies on composite keys).

### Third Normal Form (3NF)
- Satisfies 2NF.
- No transitive dependencies: non-key attributes depend *only* on the primary key, not on other non-key attributes.

### Boyce-Codd Normal Form (BCNF)
- Stricter variant of 3NF.
- For every non-trivial functional dependency $X \rightarrow Y$, $X$ must be a superkey.

---

## 2. Intentional Denormalization Guidelines

Denormalization introduces controlled redundancy to satisfy stringent performance requirements:
1. **Read-Heavy Workloads**: Pre-aggregating summary counts (e.g., `comment_count` on posts) where join cost dominates latency.
2. **Historical Immutability**: Capturing invoice billing addresses at point of sale rather than pointing to mutable user profile tables.
3. **Transaction Boundaries**: Keeping denormalized fields synchronized via atomic database transactions or database triggers.

---

## 3. Data Integrity Invariants

- **Foreign Keys**: Always declare explicit foreign key constraints with appropriate `ON DELETE` rules (`RESTRICT`, `CASCADE`, `SET NULL`).
- **Check Constraints**: Enforce domain invariants at the schema level (e.g., `CHECK (price >= 0)`).
- **Indexing Strategy**: Index all foreign keys, unique constraint columns, and search filter predicates.
