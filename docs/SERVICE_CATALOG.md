# Service Catalog

## Purpose

This document defines the inventory and ownership model for services within AI Film Studio.

## Objectives

- Maintain a complete inventory of production services.
- Clearly identify ownership and operational responsibilities.
- Support incident response, change management, and capacity planning.
- Improve dependency visibility.

## Required Service Metadata

Each service should have:

- Service name
- Description
- Business owner
- Technical owner
- Repository
- Deployment environment(s)
- Criticality
- Dependencies
- Data classification
- Runbook location
- Monitoring dashboard
- Alert configuration
- SLO reference
- Disaster recovery tier

## Service Categories

- Frontend
- Backend APIs
- Authentication
- Media Processing
- Storage
- Databases
- Background Workers
- Infrastructure
- CI/CD
- Monitoring and Observability

## Ownership

Every production service must have a primary owner and a backup owner.

## Lifecycle

Each service should be identified as one of:

- Planned
- Development
- Production
- Deprecated
- Retired

## Review

The service catalog should be reviewed after major architectural changes and at least annually.

## Related Documents

- `docs/PLATFORM_OPERATIONS.md`
- `docs/OPERATIONS_MANUAL.md`
- `docs/SERVICE_LEVEL_OBJECTIVES.md`
- `docs/RUNBOOK.md`
- `docs/ARCHITECTURE_DECISIONS.md`