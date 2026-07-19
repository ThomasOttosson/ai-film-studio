# Key Management

## Purpose

This document defines how AI Film Studio creates, stores, distributes, rotates, revokes, and destroys cryptographic keys and related secrets.

## Objectives

- Protect data confidentiality and integrity.
- Prevent unauthorized use of cryptographic material.
- Support reliable key rotation and recovery.
- Minimize the impact of key compromise.
- Maintain auditable ownership and lifecycle records.

## Scope

This standard applies to:

- Encryption keys
- Signing keys
- TLS certificates and private keys
- API credentials
- Service account credentials
- Session-signing secrets
- Backup encryption keys
- Recovery credentials

## Principles

- Never store production keys in source control.
- Use managed key or secret-management services where available.
- Apply least privilege and separation of duties.
- Use different keys for different environments and purposes.
- Prefer short-lived credentials over long-lived static secrets.
- Automate rotation and renewal where practical.
- Treat key metadata as sensitive when it reveals system structure or ownership.

## Key Ownership

Every production key must have:

- A documented owner
- A defined purpose
- An approved storage location
- An access policy
- A rotation schedule
- A revocation procedure
- A recovery or replacement plan
- A lifecycle status

## Key Generation

Keys must:

- Be generated using approved cryptographic libraries or managed services.
- Use cryptographically secure random number generation.
- Meet current organizational algorithm and key-length requirements.
- Be generated in the system where they will be protected whenever practical.
- Never be derived from predictable values, timestamps, usernames, or reused passwords.

## Storage

### Production

Production keys must be stored in an approved:

- Key Management Service
- Hardware Security Module
- Secret-management platform
- Certificate-management platform

Plaintext production keys must not be stored in:

- Source repositories
- Container images
- Build artifacts
- Shared documents
- Issue trackers
- Chat systems
- Unencrypted local files
- Application logs

### Development and Testing

Development and test environments must use separate, non-production keys. Test keys must not grant access to production systems or data.

## Access Control

Access to keys must:

- Be granted to identities rather than shared accounts.
- Follow least privilege.
- Require strong authentication.
- Be limited to required operations, such as encrypt, decrypt, sign, or verify.
- Be reviewed periodically.
- Be revoked promptly after role changes or departures.

Where supported, applications should use keys through service APIs without retrieving raw key material.

## Distribution

When key distribution is unavoidable:

- Use encrypted and authenticated channels.
- Verify the intended recipient.
- Transfer key material separately from any required passphrase.
- Record the transfer and recipient.
- Remove temporary copies immediately after use.

## Rotation

Keys must be rotated:

- According to documented schedules
- Before certificate expiration
- After suspected or confirmed compromise
- After unauthorized disclosure
- After significant access-control failures
- When cryptographic algorithms or providers are deprecated
- When required by contractual or regulatory obligations

Rotation procedures should support overlapping validity where necessary to avoid service interruption.

## Revocation

Compromised or obsolete keys must be revoked or disabled as soon as practical.

Revocation activities should include:

1. Identify affected systems and data.
2. Disable the key or credential.
3. Issue a replacement.
4. Update dependent services.
5. Invalidate affected sessions or tokens where applicable.
6. Review logs for unauthorized use.
7. Document the incident and remediation.

## Backup and Recovery

Critical keys may be backed up only when required for recovery.

Backups must:

- Be encrypted.
- Be access controlled.
- Be stored separately from primary systems.
- Be tested through documented recovery exercises.
- Follow the same or stronger protection level as the original key.
- Be deleted when the associated key is retired and retention requirements permit.

Keys used solely for ephemeral authentication should generally be replaced rather than restored.

## Key Destruction

Retired key material must be destroyed using approved provider deletion or cryptographic erasure mechanisms.

Before destruction:

- Confirm the key is no longer required for decryption, verification, recovery, or legal retention.
- Verify dependent systems have migrated.
- Record approval and completion.
- Account for replicas, backups, caches, and exported copies.

## Logging and Monitoring

Key-management systems should log:

- Key creation
- Access-policy changes
- Administrative access
- Rotation
- Enablement and disablement
- Export attempts
- Deletion scheduling and completion
- Failed or anomalous operations

Logs must not contain raw key material or secret values.

Alerts should be configured for high-risk events, including unexpected exports, policy changes, repeated failures, and use from unusual identities or locations.

## Certificate Management

Certificates must:

- Use approved certificate authorities.
- Be inventoried with owners and expiration dates.
- Be renewed before expiration.
- Use automated issuance and renewal where practical.
- Be revoked after compromise or decommissioning.
- Avoid wildcard scope unless justified and approved.

## Emergency Access

Emergency access to key-management systems must:

- Be limited to designated personnel.
- Require strong authentication.
- Be logged and reviewed.
- Be revoked after the emergency.
- Be tested periodically without exposing key material.

## Incident Response

Suspected key compromise must be handled under `docs/INCIDENT_RESPONSE.md`.

The response should consider:

- Credential revocation
- Key rotation
- Certificate replacement
- Session invalidation
- Data exposure assessment
- Audit-log preservation
- User or stakeholder notification obligations

## Audit and Review

Key inventories and access policies should be reviewed at least annually and after material system changes.

The review should confirm:

- Ownership remains accurate.
- Rotation schedules are being followed.
- Access remains necessary.
- Deprecated algorithms are not in use.
- Retired keys are disabled or destroyed.
- Recovery procedures remain valid.

## Related Documents

- `docs/SECURITY_HARDENING.md`
- `docs/THREAT_MODEL.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/BACKUP_AND_RESTORE.md`
- `docs/DATA_CLASSIFICATION.md`
- `docs/CONFIGURATION_MANAGEMENT.md`
- `docs/AUDIT_GUIDE.md`

## Review

Review this document annually and after significant changes to cryptographic standards, infrastructure, providers, or regulatory requirements.