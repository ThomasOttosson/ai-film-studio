# On-Call Guide

## Purpose

This guide defines expectations and procedures for engineers participating in the on-call rotation for AI Film Studio.

## Responsibilities

The on-call engineer is responsible for:

- Acknowledging production alerts promptly.
- Assessing customer impact.
- Restoring service as quickly and safely as possible.
- Escalating when additional expertise is required.
- Documenting actions taken during incidents.

## Before Your Shift

- Verify access to dashboards, logs, and runbooks.
- Confirm notification channels are working.
- Review ongoing incidents and maintenance windows.
- Read the previous handover.

## Alert Response

For each alert:

1. Acknowledge the alert.
2. Verify whether it represents a real issue.
3. Assess severity and customer impact.
4. Follow the appropriate runbook.
5. Escalate if necessary.
6. Record actions and outcomes.

## Escalation

Escalate immediately if:

- Service-level objectives are at risk.
- Security events are suspected.
- Data integrity may be affected.
- Recovery exceeds expected timelines.
- Additional domain expertise is required.

## Communication

During major incidents:

- Provide regular status updates.
- Record timelines and decisions.
- Notify stakeholders through approved channels.
- Avoid speculation until facts are confirmed.

## Shift Handover

Include:

- Active incidents
- Outstanding alerts
- Temporary mitigations
- Pending follow-up actions
- Known operational risks

## After an Incident

Complete:

- Incident documentation
- Root cause analysis (where applicable)
- Corrective action tracking
- Runbook updates if improvements are identified

## Related Documents

- `docs/OPERATIONS_MANUAL.md`
- `docs/PLATFORM_OPERATIONS.md`
- `docs/RUNBOOK.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/SERVICE_LEVEL_OBJECTIVES.md`

## Review

Review this guide annually and after significant operational or incident-management changes.