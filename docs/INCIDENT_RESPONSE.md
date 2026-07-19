# Incident Response

This document defines the production incident response process for AI Film Studio.

## Severity Levels

### SEV-1 — Critical
- Complete service outage
- Confirmed security breach
- Data loss or corruption
- Rendering or editing unavailable for most users

### SEV-2 — Major
- Significant performance degradation
- A core workflow is unavailable
- Elevated error rates affecting many users
- Realtime collaboration is broadly impaired

### SEV-3 — Minor
- Limited feature degradation
- Small subset of users affected
- Workarounds are available
- Non-critical background jobs are delayed

## Response Process

1. **Detect and acknowledge** the incident.
2. **Assign an incident lead** and establish a communication channel.
3. **Assess severity, scope, and user impact.**
4. **Mitigate impact** using rollback, failover, feature flags, or temporary limits.
5. **Communicate updates** at a cadence appropriate to the severity.
6. **Resolve and verify** service health.
7. **Document the incident** and schedule a post-incident review.

## Roles

- **Incident Lead:** Coordinates response and makes operational decisions.
- **Technical Lead:** Investigates root cause and directs mitigation.
- **Communications Lead:** Publishes internal and external updates.
- **Scribe:** Records the timeline, actions, and decisions.

One person may hold multiple roles for smaller incidents.

## Communication Cadence

- SEV-1: Update stakeholders at least every 30 minutes.
- SEV-2: Update stakeholders at least every 60 minutes.
- SEV-3: Update when meaningful progress occurs.

Updates should include current impact, mitigation status, known risks, and the next action.

## Recovery Verification

Before closing an incident:

- Confirm health checks and key metrics are normal.
- Run production smoke tests.
- Verify queues and background jobs are processing.
- Confirm no ongoing data integrity issue.
- Monitor the recovered service for regressions.

## Post-Incident Review

SEV-1 and SEV-2 incidents require a blameless review covering:

- Incident summary
- Customer and business impact
- Detection method
- Timeline
- Root cause
- Contributing factors
- What worked and what did not
- Corrective actions, owners, and due dates

Corrective actions should be tracked until completion.