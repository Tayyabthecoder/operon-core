# Database Documentation

This directory contains database schemas, entity-relationship models, data dictionaries, indexing strategies, and migration records.

---

## 1. Purpose & Scope
The artifacts stored in this directory define:
- **Persistent Data Models**: Relational schemas, document models, table definitions, and constraints modeling core domain entities.
- **Data Integrity & Normalization**: Normalization standards, foreign key relationships, referential integrity cascades, and check constraints.
- **Data Classification & PII**: Attribute-level sensitive data classification (PII, financial, credentials) for privacy and compliance.
- **Safe Schema Evolution**: Migration procedures, zero-downtime expand-and-contract plans, data backfill runbooks, and rollback scripts.

---

## 2. Expected Artifacts & Hierarchy
- **Database Schema Specifications**: Formal model specifications detailing tables, collections, columns, constraints, foreign keys, and indexes. Authored as `schema-[database-name].md`.
- **Data Dictionaries**: Comprehensive catalogs documenting data types, precision, nullability, enumerations, descriptions, and sensitivity tiers. Authored as `data-dictionary-[database-name].md`.
- **Entity-Relationship Diagrams (ERDs)**: Visual schema topologies illustrating entity cardinalities and associations via Mermaid.
- **Migration & Rollback Runbooks**: Detailed execution procedures for running, verifying, and rolling back database migrations.

---

## 3. Authoring Workflow & Life-cycle
1. **Schema Design**: Leverage the [database-design](../../.agents/skills/database-design/SKILL.md) and [database-migration](../../.agents/skills/database-migration/SKILL.md) skills.
2. **Template Adoption**: Structure schema documentation using the [Schema Template](../../.agents/templates/database/schema-template.md) and [Data Dictionary Template](../../.agents/templates/database/data-dictionary-template.md).
3. **Reference Verification**: Consult the [Database Normalization Guide](../../.agents/skills/database-design/references/normalization-guide.md).
4. **Migration Parity**: Never apply database migrations without documenting schema changes, rollback steps, and index impact in this directory.

---

## 4. Standards & Canonical Templates
- **Schema Specification Template**: [`.agents/templates/database/schema-template.md`](../../.agents/templates/database/schema-template.md)
- **Data Dictionary Template**: [`.agents/templates/database/data-dictionary-template.md`](../../.agents/templates/database/data-dictionary-template.md)
- **Database Engineering Rule**: [`.agents/rules/database.md`](../../.agents/rules/database.md)
- **Documentation Standards**: [`.agents/rules/documentation.md`](../../.agents/rules/documentation.md)

---

## 5. Database Schema Review Checklist
- [ ] Primary keys are declared for all tables (prefer UUIDv7 or auto-incrementing BIGINT).
- [ ] Foreign keys declare explicit `ON DELETE` and `ON UPDATE` constraints.
- [ ] Columns containing sensitive or PII data are explicitly tagged in the Data Dictionary.
- [ ] All foreign key columns and frequent query filter predicates are indexed.
- [ ] Migrations are reversible and tested against a rollback plan.
