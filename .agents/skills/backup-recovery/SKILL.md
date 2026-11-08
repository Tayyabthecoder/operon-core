---
name: backup-recovery
description: Plans, manages, validates, restores, and troubleshoots backups for databases, application files, configuration, and infrastructure. Use when designing backup schedules, defining recovery objectives, verifying backup integrity, restoring deleted or corrupted data, preparing disaster recovery procedures, or testing recovery readiness.
---

# Backup and Recovery Skill

This skill guides the AI coding agent to plan, manage, validate, restore, and troubleshoot backups across databases, application files, object storage, configuration, and infrastructure assets.

## 1. Purpose and Core Principles

A backup ensures business continuity and data preservation:

- **Useful Only If Recoverable**: Never equate cron jobs, 0 exit codes, or archive files with recoverable data. Distinguish 7 states: *1. Scheduled* $\rightarrow$ *2. Started* $\rightarrow$ *3. Completed* $\rightarrow$ *4. Exists* $\rightarrow$ *5. Verified* $\rightarrow$ *6. Restored in sandbox* $\rightarrow$ *7. Objectives met*.
- **Protect Existing State**: Never overwrite active databases or buckets during unverified restores. Always capture a destination safety snapshot first.
- **Understand Before Acting**: Verify environment, volume, tenants, timestamps, encryption keys, and traffic before executing commands.
- **Least Destructive Approach**: Prefer targeted record extraction, forward repair, or table restoration over full-instance replacement.
- **Report Evidence Honestly**: Never claim recoverability, drill success, or RPO/RTO compliance without empirical test logs. Disclose gaps transparently.

*Scope Boundary*: Focuses on backup planning, integrity validation, and recovery. For migrations, see [database-migration](../database-migration/SKILL.md); for modeling, see [database-design](../database-design/SKILL.md).

## 2. Scope of Protected Assets

A disaster recovery plan encompasses all stateful assets required to restore a service:

- **Databases & Logs**: Relational tables, schemas, indexes, sequences, constraints, document oplogs, and WAL/binlogs (unbroken sequence for PITR).
- **Files & Storage**: User uploads, avatars, document attachments, exports, and persistent object buckets.
- **Application State**: Session stores, persistent queues, background jobs, and cache rewarming state.
- **Configuration & Secrets**: `.env` templates, secret manager references, TLS certs, and KMS key roles.
- **Infrastructure & Metadata**: IaC manifests (Terraform, Dockerfiles, K8s), migration history, seed data, and DNS.

*Boundary*: Never assume database backups capture uploaded files. Separate reproducible build artifacts from primary business records. Exclude temporary caches.

## 3. Existing Procedure Assessment

Audit current backup posture across 12 criteria before proposing changes:

- **Assets & Frequency**: Databases, volumes, and buckets covered; cadence (full, diff, incremental, snapshot).
- **Engine & Target**: Logical dump vs. physical binary vs. snapshot; local disk vs. offsite cloud storage.
- **Integrity & Retention**: Checksum validation and sandbox test restore status; GFS retention and pruning rules.
- **Security & Access**: Encryption in transit (TLS) and at rest (AES-256/KMS); least-privilege storage RBAC.
- **Isolation & Immutability**: WORM / Object Lock protection; account separation; air-gapped copies.
- **Runbooks & Gaps**: Documented restore procedures; testing cadence; uncovered disaster scenarios.

*Rule*: Do not infer a job works just because a script exists. Do not assume cloud defaults meet recovery needs.

## 4. Recovery Objectives: RPO and RTO

Recovery Point Objective (RPO) and Recovery Time Objective (RTO) must reflect business impact:

- **Recovery Point Objective (RPO)**: Maximum acceptable data loss measured backwards in time. An RPO of 15 minutes mandates continuous transaction-log (WAL) archiving; an RPO of 24 hours is satisfied by daily full backups.
- **Recovery Time Objective (RTO)**: Maximum acceptable duration from disaster declaration to service resumption. Includes triage, provisioning, download, decompression, index rebuilds, validation, and cutover.
- **Operational Reality**: Do not equate backup download time with total recovery time. Never invent business-approved RPO/RTO targets; document existing measured capabilities and flag discrepancies.

## 5. Backup Strategies and Trade-offs

| Strategy | Characteristics & Trade-offs | Primary Use Case |
| :--- | :--- | :--- |
| **Full** | Complete self-contained dataset; high storage and I/O. | Small DBs, weekly baselines. |
| **Differential** | Cumulative changes since full; size grows until next full. | Mid-sized relational DBs. |
| **Incremental** | Fast, minimal daily storage; broken link breaks chain. | Large DBs, high-churn files. |
| **Physical** | Raw disk copy; fastest restore; engine-version locked. | High-volume DBs (>100GB). |
| **Logical** | SQL dump; human-readable, portable; slow on large DBs. | Dev seeds, schema exports. |
| **Snapshot** | Storage volume capture; instant; requires filesystem freeze. | Virtualized disks, cloud EBS. |
| **PITR** | Base backup + log stream; sub-minute recovery. | Critical transactional OLTP. |

*Replication Caution*: Read-replicas provide High Availability (HA), NOT backups. Dropped tables, ransomware, or corrupted migrations replicate instantly to all replicas.

## 6. Scheduling, Frequency, and Resource Contention

- **Workload Phasing**: Run heavy full backups during lowest-traffic windows (e.g., 02:00 UTC Sunday).
- **Staggered Execution**: Never run DB dumps, file archiving, and log rotations at the same minute.
- **Lock-Free Execution**: Use non-blocking snapshot modes (`--single-transaction` in `mysqldump`, continuous archiving in PostgreSQL).
- **Timezone Safety**: Schedule jobs in UTC to prevent double-runs or skipped runs during DST shifts.
- **Overlap Prevention**: Use file locks (`flock`, systemd `Type=oneshot`, K8s concurrency policies) to prevent overlapping runs.

## 7. Consistency Guarantees and Application Quiescing

Uncoordinated file copies of running database processes produce corrupt, unusable blocks:

- **Crash Consistency**: Storage capture like power loss. Requires journal/WAL replay on boot; discards unwritten memory buffers.
- **Database Consistency**: ACID integrity guaranteed. Committed transactions preserved, uncommitted rolled back via native tools.
- **Application Consistency**: App buffers flushed, background queues paused, and pending requests completed before snapshotting.
- **Cross-Resource Consistency**: Synchronization between DB IDs and external object storage (e.g., S3 upload before DB commit).
- *Warning*: Never copy live database data files while the database engine is actively writing.

## 8. Multi-Tiered Verification and Integrity Validation

Enforce verification across 7 progressive confidence tiers:

- **Tier 1 (Execution)**: Process exit code is 0 and generated file size exceeds baseline thresholds.
- **Tier 2 (Cryptographic)**: Store SHA-256 hashes on creation; verify against destination storage.
- **Tier 3 (Structure)**: Test archive decompression without extracting (`tar -tzf`, `pg_restore --list`).
- **Tier 4 (Log Continuity)**: Ensure WAL or binlog segments form an unbroken sequence of LSNs.
- **Tier 5 (Restoration)**: Spin up an ephemeral container or sandbox DB and execute full restore.
- **Tier 6 (Invariants)**: Query restored database for table counts, primary keys, and foreign key integrity.
- **Tier 7 (Application E2E)**: Boot application against restored data in sandbox; verify auth, read, write.

## 9. Encryption, Key Management, and Secrets Protection

Backup archives contain complete organizational data and are primary targets for data exfiltration:

- **Encryption Everywhere**: Encrypt in transit via TLS 1.3 and at rest using AES-256 or asymmetric encryption (GPG, Cloud KMS).
- **Asymmetric Encryption**: Public key encrypts archives; private decryption key resides strictly in KMS/Vault.
- **Key Separation**: Never store encryption keys or passphrases in the same bucket or server as backups.
- **Key Rotation**: Retain auditable retired keys so historical backups remain decryptable.
- **Zero Secrets in Logs**: Sanitize scripts. Use restricted configs (`chmod 600`) or secret injection to prevent password exposure.

## 10. Storage Architecture, Isolation, and the 3-2-1 Rule

Implement defense-in-depth storage topology to survive infrastructure destruction and ransomware:

- **3-2-1 Framework**: Maintain 3 copies across 2 media/systems, with 1 off-site in an independent cloud account/region.
- **Immutability (WORM)**: Enable Object Lock (S3 Compliance Mode, GCS Bucket Lock) so compromised credentials cannot delete backups.
- **Network Air-Gapping**: Pull from prod or push via write-only IAM (`s3:PutObject` allowed, delete actions denied).

## 11. Retention Lifecycles and Pruning Dependencies

Orchestrate backup lifecycle management using the Grandfather-Father-Son (GFS) rotation scheme:

- **Cadence**: Retain 7 daily (Son), 4 weekly (Father), and 12 monthly / 3-7 yearly archives (Grandfather).
- **Pruning Safety Rules**: Never delete base backups if incremental archives depend on them; retain logs for the base backup lifespan; verify retention counts before pruning; handle GDPR deletion via crypto-shredding (discarding tenant keys).

## 12. Database-Native Methodologies

| Engine | Backup Mechanism | PITR & Log Mechanics | Safe Restoration Procedure |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | `pg_dump -Fc -Z 6`; `pg_basebackup -Ft -z`. | Continuous WAL (`WAL-G`/`pgBackRest`). | Stop PG $\rightarrow$ restore base $\rightarrow$ set `recovery.signal` $\rightarrow$ replay. |
| **MySQL / MariaDB** | `mysqldump --single-transaction` or XtraBackup. | Binary logging (`log_bin`); `mysqlbinlog`. | Restore full dump $\rightarrow$ apply binlogs in sequence. |
| **SQLite** | `sqlite3 active.db ".backup 'backup.db'"`. | N/A (atomic file snapshot). | Replace file when closed. Never `cp` live DB in WAL mode. |
| **SQL Server** | `BACKUP DATABASE [AppDB] TO DISK = '...'`. | Log tailing (`BACKUP LOG`). | Restore full (`NORECOVERY`) $\rightarrow$ diff $\rightarrow$ logs $\rightarrow$ `RECOVERY`. |
| **MongoDB / NoSQL** | `mongodump --archive=backup.gz --oplog`. | Oplog tailing for point consistency. | `mongorestore --archive=backup.gz --gzip --oplogReplay --drop`. |

## 13. Application Files, Uploads, and Object Storage

- **Metadata Synchronization**: Coordinate backup timing when DB rows store object keys (`s3_key: "uploads/avatar.jpg"`). Restoring DB without files leaves dead references.
- **Bucket Versioning**: Enable object versioning on S3/GCS so deletions create delete markers rather than erasing files.
- **Cross-Region Replication**: Replicate media buckets to an offsite region with independent lifecycle rules.
- **Permissions & Symlinks**: When backing up local folders (`/var/www/uploads`), preserve permissions and symlinks (`tar -cpzf`). Exclude cache folders.

## 14. Configuration, Infrastructure, and Dependencies

- **Configuration Auditing**: Version control non-sensitive configs, Nginx/Caddy files, systemd units, and Dockerfiles.
- **Secrets Architecture**: Back up secret references, `.env.example` templates, and KMS policies. Never commit raw `.env` files.
- **Infrastructure as Code (IaC)**: Maintain Terraform or K8s manifests in source control; verify automated provisioning.
- **DNS and Routing**: Document DNS records and TLS certificate configs to enable rapid traffic cutover during outages.

## 15. Safe 8-Step Restoration Workflow

Restoration carries high operational risk. Follow this structured sequence:

- **Step A: Objectives & Approval**: Determine failure cause, timestamp ($T_{\text{target}}$), and loss limits. Obtain user approval.
- **Step B: Select Source**: Choose recovery source (PITR, full, snapshot, selective). Avoid corrupted recent backups.
- **Step C: Verify Source & Target**: Validate archive checksum and destination host to prevent accidental overwrite.
- **Step D: Sandbox Isolation**: Capture target safety snapshot. Restore to sandbox first. Disable outbound emails/webhooks.
- **Step E: Native Restore**: Run native restore tool with non-sensitive logging. Monitor disk/IO; abort on conflicts.
- **Step F: Validation**: Verify row counts (`users`, `orders`), foreign keys, constraints, and timestamps.
- **Step G: Cutover**: Boot app in maintenance mode, smoke test (auth, read, write), re-enable workers, switch traffic.
- **Step H: Document**: Record recovery point, actual RPO/RTO metrics, missing data, and root cause in incident report.

## 16. Disaster Recovery Scenarios and Playbooks

| Scenario | Immediate Containment | Recommended Recovery Path |
| :--- | :--- | :--- |
| **Record Drop** | Stop log purging; isolate service. | Do NOT overwrite prod DB. Restore to sandbox $\rightarrow$ export dropped rows $\rightarrow$ insert to prod. |
| **Corruption** | Freeze writes; identify clean point. | Locate oldest clean backup prior to corruption $\rightarrow$ replay clean logs $\rightarrow$ reconcile. |
| **Failed Migration** | Halt migration; do not rollback. | Inspect schema. If DDL committed implicitly, forward-repair or restore pre-migration snapshot. |
| **Ransomware** | Disconnect network; preserve RAM/disk. | Rebuild host from clean IaC $\rightarrow$ pull verified immutable/WORM backup $\rightarrow$ rotate credentials. |
| **Region Outage** | Declare disaster; notify team. | Spin up secondary region via IaC $\rightarrow$ attach replicated storage/DB $\rightarrow$ update DNS routing. |

## 17. Recovery Testing, Game Days, and Drills

- **Automated Restore Verification**: Scheduled worker downloads the latest backup daily, restores it in a container, and checks row counts.
- **Tabletop Walkthroughs**: Quarterly playbook review with engineering teams to validate roles, contacts, and steps.
- **Game Day Simulations**: Semi-annual drills where mock disaster is declared in staging. Measure actual RTO.
- **Testing Guardrails**: Never conduct unannounced destructive tests in production. Isolate test restore VPCs.

## 18. Observability, Telemetry, and Failure Alerting

- **Critical Alert Triggers**:
  - `BackupJobFailed`: Non-zero exit code on scheduled backup runner.
  - `BackupMissing / StaleBackup`: Zero valid backup artifacts generated within $1.5\times$ scheduled frequency.
  - `ArtifactSizeAnomaly`: Backup size dropped by $>20\%$ (omission) or increased by $>200\%$ (bloat).
  - `WALArchivingLag`: Number of pending WAL/binlog segments waiting to be shipped exceeds threshold.
  - `StorageQuotaThreshold`: Backup destination storage capacity exceeds 85%.
  - `RestoreTestFailed`: Automated sandbox restore drill failed invariant validation.
- **Alert Sanitization**: Failure notifications must include error codes and asset tags, but NEVER leak passwords or secret keys.

## 19. Version Compatibility and Schema Migration Alignment

- **Code vs. Database Lock**: Check application version at backup timestamp. Restoring older DB under newer code can cause crashes.
- **Migration State Verification**: Query migration tracking table (`schema_migrations`, `alembic_version`) after restore to verify state.
- **Controlled Re-migration**: If restoring older DB state, run pending migrations forward step-by-step using [database-migration](../database-migration/SKILL.md).
- **Extension & Collation Alignment**: Verify target DB instances run matching major versions, charsets (`UTF8MB4`), and extensions (`pg_trgm`, `postgis`).

## 20. Security Incident, Ransomware, and Compromise Recovery

- **Assume Backup Contamination**: Attackers often establish persistence weeks prior to ransomware. Scan candidate backups for backdoors and rogue cron jobs.
- **Preserve Forensic Evidence**: Never wipe or restore over a compromised machine immediately. Take forensic memory dumps and disk snapshots.
- **Credential Rotation**: Before restoring service, rotate ALL database passwords, API keys, TLS certs, and SSH keys.
- **Clean Infrastructure Deployment**: Never restore binaries from unverified backups. Deploy clean OS from source control; restore only pure data.

## 21. Production-Grade Backup Scripting and Automation

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
BACKUP_DIR="/var/backups/db"; TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
TARGET_FILE="${BACKUP_DIR}/app_db_${TIMESTAMP}.dump"; TMP_FILE="${TARGET_FILE}.tmp"
trap 'rm -f "${TMP_FILE}"; echo "[-] Failed. Cleaned tmp." >&2' ERR
pg_dump -Fc -Z 6 -f "${TMP_FILE}" "${DATABASE_NAME}"
mv "${TMP_FILE}" "${TARGET_FILE}"
sha256sum "${TARGET_FILE}" > "${TARGET_FILE}.sha256"
find "${BACKUP_DIR}" -type f -name "app_db_*.dump" -mtime +7 -delete
```

- **Atomic Writes**: Dump to `.tmp` and rename on completion to prevent partial archives.
- **Strict Error Handling**: Use `set -euo pipefail` or `try/catch` to fail immediately on errors.
- **Pre-flight & Secrets**: Check disk space (`df -h`); inject credentials via restricted files (`chmod 600`) or standard credential helpers (`~/.pgpass`). Never hardcode secrets.

## 22. Practical Decision Guide

| Scenario | Immediate Action & Safe Strategy |
| :--- | :--- |
| **Failed job** | Inspect logs and free disk (`df -h`); fix cause before retry. |
| **Unverified** | Spin up sandbox DB; test restore and verify record counts. |
| **Record deleted** | Restore to sandbox; export dropped rows and re-insert. |
| **Corrupted DB** | Halt writes; locate clean base + WAL/binlog for PITR. |
| **Bad migration** | Inspect schema; forward-repair or restore pre-migration snapshot. |
| **Prod restore** | Verify approval; capture safety snapshot of current prod first. |
| **PII in backup** | Enforce KMS/GPG, restrict bucket IAM, audit access logs. |
| **Missing files** | Sync S3/GCS versions with database asset keys. |
| **Stale backup** | Alert team; fix cron/disk; run immediate manual backup. |
| **Lost key** | Search KMS/escrow; never delete encrypted archives. |
| **Post-restore crash** | Verify schema migration version, DB extensions, and configs. |
| **Storage full** | Prune oldest grandfather archives; keep base chains intact. |
| **Ransomware** | Isolate host; rebuild from IaC; restore immutable WORM backup. |
| **Slow restore** | Profile bottleneck (I/O vs network); parallel restore (`-j`). |

## 23. Change Safety and Authorization Boundaries

- **Strict Separation of Authoring vs. Execution**: Authoring backup scripts, runbooks, or restoration plans is safe. Executing restorations, overwriting databases, or deleting archives requires explicit user authorization.
- **Zero Unprompted Data Destruction**: Never run `DROP DATABASE`, `TRUNCATE`, or overwrite volumes without direct confirmation.
- **Environment Verification**: Always confirm target hostname, port, and database name. Never assume a database named `dev` or `test` is disposable without verifying.
- **Preserve Investigation State**: Before executing a recovery that overwrites corrupt data, archive the corrupt state for root cause investigation.
- **Preserve Clean Git Working Tree**: Never leave temporary backup dumps, unencrypted SQL files, or scratch scripts in application repositories.

## 24. Expected Backup and Recovery Report Format

```markdown
# Backup and Recovery Report: [Scope / Asset]
- **Summary**: Verified backup and tested PITR for PostgreSQL 16 database.
- **Source & Target**: Source: `s3://db-backups/prod/app_db_20261024T020000Z.dump` (SHA-256 verified) | Target: Sandbox (`sandbox.internal:5432/app_test`).
- **Actions Taken**: Downloaded base backup, verified checksum, booted isolated PG 16 container, ran `pg_restore -j 2`, and replayed WAL segments to checkpoint.
- **Integrity & Validation**: Archive valid, 142 tables restored, foreign keys intact, 524,110 user records verified, smoke test PASSED.
- **RPO & RTO**: Target RPO: 15m (Actual: 4m via WAL) | Target RTO: 60m (Actual: 28m total recovery).
- **Remaining Risks**: Secondary backup bucket lacks Object Lock WORM compliance; recommend enabling immutability.
- **Execution Status**: Sandbox verification COMPLETED. No changes applied to production.
```

## 25. Alignment with Existing Rules and Companion Skills

- **Rules**: [database.md](../../rules/database.md) (ACID, data safety); [change-safety.md](../../rules/change-safety.md) (authorization for destructive ops); [security.md](../../rules/security.md) (zero secrets in code, encryption).
- **Companion Skills**: [database-migration](../database-migration/SKILL.md) (schema evolution, pre-migration snapshots); [database-design](../database-design/SKILL.md) (modeling, constraints); [environment-configuration](../environment-configuration/SKILL.md) (secrets, env vars); [logging-monitoring](../logging-monitoring/SKILL.md) (telemetry, backup alerts); [debugging](../debugging/SKILL.md) (failure diagnosis).

## 26. Final Validation Checklist

Before concluding any backup or recovery task, verify these 10 criteria:

- [ ] **1. Recoverability**: Distinguishes backup creation from verified restoration.
- [ ] **2. Asset Scope**: Covers DBs, WAL/logs, uploads, configs, and KMS keys.
- [ ] **3. Realistic RPO/RTO**: Empirical targets; download time $\ne$ total recovery time.
- [ ] **4. Consistency**: Enforces ACID/app-consistent backups; no live file copy.
- [ ] **5. Multi-Tiered**: Validates from SHA-256 to sandbox application boot.
- [ ] **6. Encryption & Keys**: Encrypts at rest/transit; isolates decryption keys.
- [ ] **7. 3-2-1 & WORM**: Independent failure domains, cross-account, Object Lock.
- [ ] **8. Safe Workflow**: Steps A-H, sandbox first, disable outbound webhooks.
- [ ] **9. Authorization**: Explicit sign-off for destructive operations/restores.
- [ ] **10. Scope Discipline**: Guidance only; zero unauthorized live execution.
