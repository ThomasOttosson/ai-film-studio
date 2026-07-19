# Operations Manual

## Purpose

This manual defines the day-to-day operational procedures required to run AI Film Studio safely, reliably, and consistently in production.

## Scope

This manual applies to:

- Application services
- APIs and WebSocket infrastructure
- Rendering and media-processing workers
- Databases, caches, queues, and object storage
- CI/CD and deployment systems
- Monitoring, logging, and alerting platforms
- Backup and recovery systems
- Production support activities

## Operational Roles

### Service Owner

The service owner is accountable for service health, reliability targets, operational documentation, risk acceptance, and escalation decisions.

### On-Call Engineer

The on-call engineer responds to alerts, performs initial triage, mitigates incidents, escalates when required, and records operational actions.

### Platform Operator

The platform operator maintains infrastructure, executes approved changes, reviews capacity and health, and supports recovery activities.

### Security Contact

The security contact supports security alert investigation, credential-compromise response, evidence preservation, and escalation.

## Start-of-Day Checks

Operators should review:

1. Active incidents and unresolved alerts.
2. Service availability, latency, and error rates.
3. Failed background jobs and queue health.
4. Database health and storage capacity.
5. Backup completion and replication status.
6. Recent deployments and configuration changes.
7. Security alerts and access anomalies.
8. Certificate, domain, and secret expiration warnings.
9. Planned maintenance and high-risk events.

Material deviations should be recorded and assigned an owner.

## Service Health Review

Evaluate:

- Availability
- Request latency
- Error rate
- Resource saturation
- Queue age and depth
- Rendering completion time
- WebSocket stability
- Database utilization
- Storage consumption
- Dependency health

Compare current behavior with service-level objectives and normal baselines.

## Alert Handling

For every alert:

1. Acknowledge it.
2. Confirm whether it represents a real condition.
3. Identify affected services, environments, and users.
4. Check recent deployments and configuration changes.
5. Apply the relevant runbook.
6. Escalate if impact or uncertainty increases.
7. Record mitigation and follow-up work.
8. Close or tune the alert only after validation.

Alerts must not be permanently silenced without documented justification and ownership.

## Incident Triage

Initial triage should determine:

- Severity
- Start time
- Affected components
- User impact
- Security implications
- Data integrity risk
- Recent changes
- Available mitigations
- Required escalation

Use `docs/INCIDENT_RESPONSE.md` for formal incident management.

## Deployment Operations

Before deployment:

- Confirm approvals.
- Verify CI checks.
- Review database and configuration changes.
- Confirm rollback procedures.
- Check current incident status.
- Validate sufficient capacity.
- Communicate expected impact where applicable.

After deployment:

- Confirm service health.
- Review errors and latency.
- Validate critical user journeys.
- Verify background jobs and WebSocket connections.
- Monitor for delayed regressions.
- Record the result.

Failed or risky deployments should be rolled back according to `docs/DEPLOYMENT_CHECKLIST.md`.

## Routine Maintenance

Routine maintenance includes:

- Operating-system and runtime updates
- Dependency upgrades
- Database maintenance
- Certificate renewal
- Secret and key rotation
- Backup verification
- Storage cleanup
- Queue maintenance
- Monitoring and alert review
- Access review support
- Disaster recovery exercises

Maintenance must follow the change-management process.

## Backup Operations

Operators should verify:

- Scheduled backups completed.
- Backup copies are encrypted.
- Replication targets are healthy.
- Retention rules are applied.
- Restore tests occur on schedule.
- Backup failures generate alerts.

Follow `docs/BACKUP_AND_RESTORE.md`.

## Capacity Operations

Review capacity trends for:

- Compute
- Memory
- Database resources
- Object storage
- Network bandwidth
- Queue throughput
- Rendering workers
- Telemetry ingestion
- Backup storage

Document capacity risks before thresholds become critical.

## Database Operations

Database changes should:

- Be reviewed and tested.
- Use backward-compatible migration patterns where practical.
- Include rollback or roll-forward plans.
- Avoid long blocking operations during peak usage.
- Be monitored for replication lag and query regressions.
- Preserve recovery options.

Manual production data changes require explicit approval and an audit trail.

## Queue and Worker Operations

Monitor:

- Queue depth
- Oldest message age
- Retry volume
- Dead-letter queues
- Worker concurrency
- Processing duration
- Failure rate
- Resource saturation

Before replaying failed work, confirm that repeating the operation is safe.

## Access and Credential Operations

- Use individual identities.
- Require MFA for privileged access.
- Avoid shared administrative accounts.
- Use approved secret-management systems.
- Revoke temporary access after use.
- Record emergency access.
- Rotate exposed or suspected credentials immediately.

Follow `docs/IDENTITY_AND_ACCESS_MANAGEMENT.md` and `docs/KEY_MANAGEMENT.md`.

## Security Operations

Escalate:

- Suspicious authentication activity
- Unexpected privilege changes
- Secret exposure
- Unusual data export or deletion
- Malware or abuse detections
- Unauthorized configuration changes
- Attempts to disable logging or monitoring

Preserve relevant evidence before destructive changes when practical.

## Change Freeze

A change freeze may be declared during:

- Major incidents
- High-risk customer events
- Critical business periods
- Disaster recovery
- Security investigations
- Major migrations

Only approved emergency changes should proceed during a freeze.

## Emergency Changes

Emergency changes require:

- Clear operational or security justification
- An identified approver
- A documented implementation plan
- Validation after execution
- Retrospective review
- Follow-up documentation and testing

## End-of-Shift Handover

Communicate:

- Active incidents
- Degraded services
- Temporary mitigations
- Suppressed alerts
- Pending changes
- Capacity risks
- Security concerns
- Required follow-up actions
- Relevant dashboards and tickets

## Operational Records

Retain records for:

- Deployments
- Maintenance
- Incidents
- Emergency access
- Manual data changes
- Backup and restore tests
- Disaster recovery exercises
- Security-relevant actions
- Risk acceptances

Retention must follow `docs/DATA_RETENTION_POLICY.md`.

## Service Decommissioning

Before decommissioning:

1. Identify dependencies and data owners.
2. Notify stakeholders.
3. Remove traffic and scheduled workloads.
4. Archive or migrate required data.
5. Revoke credentials and access.
6. Remove monitoring and alerts.
7. Delete obsolete infrastructure.
8. Update inventories and documentation.
9. Confirm retention requirements.
10. Record final approval.

## Related Documents

- `docs/PLATFORM_OPERATIONS.md`
- `docs/RUNBOOK.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/DEPLOYMENT_CHECKLIST.md`
- `docs/OBSERVABILITY.md`
- `docs/LOGGING_STANDARD.md`
- `docs/BACKUP_AND_RESTORE.md`
- `docs/DISASTER_RECOVERY.md`
- `docs/CHANGE_MANAGEMENT.md`
- `docs/SERVICE_LEVEL_OBJECTIVES.md`

## Review

Review this manual annually and after material changes to the platform, operating model, incident process, or service architecture.