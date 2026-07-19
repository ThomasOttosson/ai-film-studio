# docs/RUNBOOK.md

# Production Runbook

## Purpose

This runbook provides operational procedures for maintaining AI Film Studio in production.

## Daily Checks

- Verify all services are healthy.
- Review error rates and latency.
- Confirm scheduled jobs completed.
- Check disk, memory, and CPU utilization.
- Ensure backups completed successfully.

## Before Deployment

- Confirm CI/CD pipeline is green.
- Verify rollback artifacts exist.
- Review open incidents.
- Confirm monitoring dashboards are operational.

## Rollback Procedure

1. Pause new deployments.
2. Roll back to the last known good release.
3. Verify application health.
4. Execute smoke tests.
5. Resume traffic.
6. Continue monitoring.

## High CPU Usage

- Identify affected service.
- Review recent deployments.
- Check queue backlog.
- Scale workers if appropriate.
- Capture diagnostics before restarting services.

## Database Issues

- Check connectivity.
- Verify replication status.
- Review slow queries.
- Restore from backup only after incident approval.

## Security Event

- Isolate affected systems.
- Rotate credentials if required.
- Preserve logs and evidence.
- Follow the Incident Response process.
- Complete a post-incident review.

## Escalation

Escalate immediately when:
- Customer impact is widespread.
- Data integrity is at risk.
- Recovery exceeds documented RTO.
- A security incident is suspected.

Review and update this runbook after every major release.