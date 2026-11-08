# Deployment Runbook: [Service or Application Name]

## 1. Release Overview & Parameters
- **Application / Service**: `[Service Name]`
- **Target Environment**: `[Staging / Production / UAT]`
- **Release Version / Tag**: `v1.0.0`
- **Target Git Commit SHA**: `[e.g., abc1234]`
- **Deployment Window**: `YYYY-MM-DD HH:MM - HH:MM UTC`
- **Release Lead / Operator**: `[Name / Role]`
- **Deployment Model**: `[Container / PaaS / Static / Kubernetes / Serverless]`

## 2. Pre-Deployment Readiness Checklist
All items must be confirmed before proceeding to execution.

| Check | Item | Verification Method | Status |
|---|---|---|---|
| PR-01 | **Build & Package** | Production bundle compiled cleanly without dev dependencies (`npm run build`). | `[ ] Verified` |
| PR-02 | **Automated Tests** | Full test suite passed with exit code 0 (`npm test`). | `[ ] Verified` |
| PR-03 | **Dependency Audit** | Zero critical/high unmitigated security CVEs (`npm audit`). | `[ ] Verified` |
| PR-04 | **Database Backup** | Fresh database snapshot completed and verified within RPO window. | `[ ] Verified` |
| PR-05 | **Database Migrations** | Pending migrations audited for locks; backwards-compatible DDL. | `[ ] Verified` |
| PR-06 | **Environment Secrets** | All required env vars configured in secret manager/vault. | `[ ] Verified` |
| PR-07 | **Approval Gate** | Explicit user / stakeholder deployment authorization obtained. | `[ ] Verified` |

## 3. Environment Configuration & Secrets Checklist
Ensure required environment variables exist in target environment without exposing secret values:

| Variable Name | Required | Description | Configured? |
|---|---|---|---|
| `NODE_ENV` | Yes | Set to `production`. | `[ ] Yes` |
| `PORT` | Yes | Application port (e.g., `3000`). | `[ ] Yes` |
| `DATABASE_URL` | Yes | Secret connection string to target database. | `[ ] Yes` |
| `JWT_SECRET` | Yes | Secret signing key for JWT tokens. | `[ ] Yes` |
| `LOG_LEVEL` | No | Log verbosity (default `info`). | `[ ] Yes` |

## 4. Step-by-Step Deployment Execution Sequence

### Phase 1: Pre-Execution
1. **Notify Stakeholders**: Announce deployment window commencement.
2. **Snapshot Persistence**:
   ```bash
   # Execute backup command or cloud snapshot
   pg_dump -Fc -h db.internal -U app_user -d app_db > backup_pre_deploy.dump
   ```

### Phase 2: Database Migration Execution
3. **Run Safe Migrations**:
   ```bash
   npm run db:migrate:status
   npm run db:migrate:up
   ```
   *Rule: If migration fails or locks tables unexpectedly, immediately abort and trigger migration rollback.*

### Phase 3: Application Rollout
4. **Deploy Application Artifact / Container**:
   ```bash
   # Deploy container image or trigger rolling update
   docker compose pull app
   docker compose up -d --no-deps --build app
   ```
5. **Verify Process Startup**:
   ```bash
   docker compose logs --tail=50 app
   ```

---

## 5. Post-Deployment Verification (PDV) & Health Probes

| Probe ID | Verification Check | Target / Command | Expected Result | Verified? |
|---|---|---|---|---|
| PDV-01 | **Liveness Probe** | `curl -f http://localhost:3000/health/live` | HTTP `200 OK`, `{"status":"ok"}` | `[ ] Yes` |
| PDV-02 | **Readiness Probe** | `curl -f http://localhost:3000/health/ready` | HTTP `200 OK`, `{"db":"connected"}` | `[ ] Yes` |
| PDV-03 | **Smoke Test (Auth)** | `POST /v1/auth/login` | HTTP `200 OK` with valid JWT token | `[ ] Yes` |
| PDV-04 | **Smoke Test (Read)** | `GET /v1/resources` | HTTP `200 OK` with JSON envelope | `[ ] Yes` |
| PDV-05 | **Error Logs** | Check application logs for 5xx errors | Zero unexpected exceptions or crashes | `[ ] Yes` |

---

## 6. Rollback & Contingency Plan

### 6.1 Rollback Triggers
Initiate rollback immediately if any of the following occur:
- Health check endpoints fail to report `200 OK` within 3 minutes of rollout.
- Unhandled 5xx HTTP errors exceed 1% of total traffic.
- Database migration fails, corrupts data, or introduces blocking locks.
- Critical business workflow fails smoke test.

### 6.2 Rollback Procedure
1. **Revert Application Container / Binary**:
   ```bash
   # Re-deploy previous known-stable image / commit
   docker compose pull app:v[PREVIOUS_STABLE]
   docker compose up -d app
   ```
2. **Revert Database Migrations (if backward-incompatible)**:
   ```bash
   npm run db:migrate:down
   ```
   *Note: If data was transformed or columns dropped, restore from `backup_pre_deploy.dump`.*
3. **Verify Restored Application Health**:
   ```bash
   curl -f http://localhost:3000/health/ready
   ```
4. **Post-Incident Communication**: Document cause of deployment failure and log incident.
