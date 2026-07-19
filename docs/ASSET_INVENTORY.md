# Asset Inventory

## Purpose

This document defines the minimum requirements for maintaining an accurate inventory of assets used by AI Film Studio.

## Scope

The inventory should cover:

- Cloud accounts and subscriptions
- Production and non-production environments
- Compute resources
- Databases and data stores
- Storage buckets and volumes
- Networks, domains, and certificates
- APIs and externally exposed endpoints
- Source-code repositories
- CI/CD systems
- Container registries and images
- Third-party services
- Software dependencies
- Secrets, keys, and service identities
- Monitoring and security tooling
- End-user and administrative devices where applicable

## Required Asset Metadata

Each tracked asset should include:

- Unique identifier
- Asset name
- Asset type
- Environment
- Business purpose
- Technical owner
- Business owner
- Data classification
- Criticality
- Location or provider
- Internet exposure
- Authentication method
- Lifecycle status
- Creation date
- Last review date
- Planned retirement date where applicable
- Related service or system
- Relevant documentation links

## Criticality Levels

### Critical

Failure or compromise may cause severe service disruption, material data exposure, safety risk, or significant legal or financial impact.

### High

Failure or compromise may significantly affect customers, operations, security, or compliance.

### Medium

Failure has a limited operational impact and can be recovered within normal procedures.

### Low

Failure has minimal impact and does not affect critical business operations.

## Lifecycle Status

Use the following status values:

- Planned
- Active
- Restricted
- Deprecated
- Retiring
- Retired
- Disposed

## Inventory Management

Asset records should be:

- Created before or during provisioning
- Updated after material configuration or ownership changes
- Reviewed periodically
- Reconciled against automated discovery data
- Retired when the asset is decommissioned
- Preserved where audit or legal requirements apply

## Automated Discovery

Where practical, inventories should be populated or validated using:

- Cloud-provider APIs
- Infrastructure-as-code state
- Source-control organization data
- Container registry metadata
- Dependency manifests and lockfiles
- Endpoint and vulnerability scanners
- Identity-provider records
- Certificate and domain inventories

Automated discovery does not replace ownership review or business-context validation.

## Ownership

Every active production asset must have an accountable owner.

Owners are responsible for:

- Maintaining accurate metadata
- Reviewing access
- Managing vulnerabilities
- Ensuring backups where required
- Supporting incident response
- Planning upgrades and retirement

Assets without a confirmed owner should be treated as a risk and escalated.

## Review Cadence

Recommended review frequency:

- Critical assets: quarterly
- High-criticality assets: every six months
- Medium- and low-criticality assets: annually
- Internet-facing assets: at least quarterly
- Assets involved in an incident: after the incident review

## Decommissioning

Before an asset is retired:

1. Confirm dependencies and consumers.
2. Migrate or archive required data.
3. Revoke credentials and access.
4. Remove network exposure.
5. Update DNS, certificates, and monitoring.
6. Terminate related resources.
7. Validate that billing has stopped.
8. Update the inventory status.
9. Retain required evidence.

## Exceptions

Inventory exceptions require:

- Documented justification
- Named owner
- Risk assessment
- Compensating controls
- Review or expiration date
- Appropriate approval

## Related Documents

- `docs/SERVICE_CATALOG.md`
- `docs/DATA_CLASSIFICATION.md`
- `docs/CONFIGURATION_MANAGEMENT.md`
- `docs/CONFIGURATION_BASELINE.md`
- `docs/IDENTITY_AND_ACCESS_MANAGEMENT.md`
- `docs/VULNERABILITY_MANAGEMENT.md`
- `docs/THIRD_PARTY_RISK_MANAGEMENT.md`
- `docs/RISK_REGISTER.md`

## Review

Review this document annually and after significant changes to infrastructure, asset-discovery tooling, ownership models, or compliance requirements.