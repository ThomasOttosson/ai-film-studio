# Disaster Recovery Plan

This document defines the disaster recovery approach for AI Film Studio.

## Scope

The plan covers failures affecting production services, databases, object storage,
rendering workers, queues, secrets, and deployment infrastructure.

## Recovery Priorities

1. Protect data integrity.
2. Restore authentication and core APIs.
3. Restore project and media access.
4. Restore editing and collaboration.
5. Restore rendering and non-critical background processing.

## Recovery Objectives

Each production component should have documented targets for:

- **Recovery Time Objective (RTO):** Maximum acceptable restoration time.
- **Recovery Point Objective (RPO):** Maximum acceptable data-loss window.

Targets must be reviewed after major architecture or dependency changes.

## Activation Criteria

Activate this plan when:

- A production region is unavailable.
- Data corruption affects normal operations.
- Primary infrastructure cannot be recovered within the incident target.
- A critical third-party dependency causes prolonged service disruption.
- A security event requires isolated environment recovery.

## Recovery Procedure

1. Declare the disaster and assign a recovery lead.
2. Freeze non-essential deployments and infrastructure changes.
3. Confirm the affected systems and latest valid recovery point.
4. Provision or activate the recovery environment.
5. Restore configuration, secrets, databases, and storage.
6. Start core services in dependency order.
7. Validate health checks, migrations, queues, and data integrity.
8. Run production smoke tests.
9. Gradually restore user traffic.
10. Monitor closely and communicate recovery status.

## Dependency Order

Recommended startup order:

1. Network, DNS, identity, and secret management
2. Databases and persistent storage
3. Queues and caches
4. Backend APIs
5. Realtime collaboration services
6. Frontend delivery
7. Rendering workers and background jobs
8. Monitoring and auxiliary services

## Failover Validation

Before directing traffic to a recovery environment:

- Confirm TLS and DNS configuration.
- Verify application secrets and permissions.
- Test authentication and authorization.
- Open and save an existing project.
- Upload and retrieve media.
- Submit and complete a render job.
- Verify logs, metrics, traces, and alerts.
- Confirm backups continue from the recovered environment.

## Communications

Recovery updates should include:

- Current user impact
- Systems affected
- Recovery actions completed
- Known risks
- Next milestone
- Estimated update cadence

Do not publish unverified root-cause claims during active recovery.

## Return to Primary Environment

Failback must be planned and treated as a controlled production change.

- Confirm the primary environment is stable.
- Reconcile data created during failover.
- Validate replication and consistency.
- Schedule a maintenance window when required.
- Shift traffic gradually.
- Monitor for regressions.
- Preserve the recovery environment until failback is verified.

## Testing and Maintenance

Run disaster recovery exercises at least annually and after major platform changes.

Each exercise should record:

- Scenario tested
- Actual recovery time
- Data-loss window
- Failed assumptions
- Manual steps
- Missing access or documentation
- Corrective actions, owners, and due dates