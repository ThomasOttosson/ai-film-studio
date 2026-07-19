# Data Classification

This document defines how information handled by AI Film Studio is classified and protected.

## Objectives

- Apply safeguards proportional to data sensitivity.
- Reduce unauthorized access and accidental disclosure.
- Support consistent retention, sharing, and disposal decisions.
- Clarify responsibilities for maintainers and operators.

## Classification Levels

### Public

Information approved for unrestricted distribution.

Examples:

- Published documentation
- Public release notes
- Public marketing material
- Open-source repository content

Required controls:

- Confirm publication approval where applicable.
- Ensure no secrets, personal data, or internal-only details are included.

### Internal

Non-public information intended for authorized contributors, maintainers, or operators.

Examples:

- Internal operational procedures
- Non-sensitive architecture notes
- Project planning records
- Routine service metrics

Required controls:

- Restrict access to authorized personnel.
- Share only through approved collaboration systems.
- Avoid public links unless explicitly approved.

### Confidential

Sensitive information that could cause material harm if disclosed or altered.

Examples:

- User project metadata
- Private media assets
- Customer support records
- Non-public security findings
- Commercial agreements
- Detailed production logs containing identifiers

Required controls:

- Enforce least-privilege access.
- Encrypt data in transit and at rest.
- Log and review administrative access.
- Use approved storage and transfer mechanisms.
- Apply documented retention limits.

### Restricted

Highly sensitive information requiring the strongest controls.

Examples:

- Authentication secrets
- API keys and signing keys
- Password hashes
- Encryption keys
- Recovery credentials
- Regulated personal data
- Unreleased vulnerability exploit details

Required controls:

- Store only in approved secret-management or protected data systems.
- Require strong authentication and narrowly scoped authorization.
- Prohibit inclusion in source control, tickets, chat, or ordinary logs.
- Rotate credentials after suspected exposure.
- Monitor access and investigate anomalies promptly.

## Default Classification

Information must be treated as **Internal** unless it is explicitly approved as Public or clearly requires a higher classification.

When uncertain, use the more restrictive classification until an owner reviews the data.

## Handling Requirements

### Collection

- Collect only data necessary for a defined purpose.
- Document the purpose and lawful or operational basis where applicable.
- Avoid collecting secrets or personal data in free-text fields unless required.

### Storage

- Use approved systems appropriate for the classification.
- Apply encryption, access controls, and backup protections.
- Do not store production data in local development environments without approval and safeguards.

### Transmission

- Use encrypted transport.
- Verify recipients before sharing Confidential or Restricted data.
- Do not send Restricted data through unapproved email or messaging services.

### Logging

- Do not log credentials, tokens, private keys, or full authentication headers.
- Minimize personal and project data in logs.
- Redact sensitive fields before ingestion into monitoring systems.

### Retention and Disposal

- Follow `docs/DATA_RETENTION_POLICY.md`.
- Delete data when its retention period expires or its purpose no longer applies.
- Ensure backups and replicas are addressed by the applicable deletion process.
- Dispose of Restricted data using verifiable secure deletion procedures where supported.

## Access Reviews

Access to Confidential and Restricted data should be reviewed periodically and after:

- Role changes
- Team departures
- Security incidents
- Major architectural changes
- Changes to third-party service providers

## Third Parties

Before sharing Confidential or Restricted data with a third party:

- Confirm a legitimate business or operational need.
- Review contractual and security protections.
- Limit the data to the minimum necessary.
- Define retention and deletion expectations.
- Record the approved data flow.

## Incident Handling

Suspected loss, exposure, or unauthorized access involving Confidential or Restricted data must be handled under `docs/INCIDENT_RESPONSE.md`.

Immediate actions may include:

- Revoking access
- Rotating credentials
- Preserving audit evidence
- Isolating affected systems
- Assessing notification obligations

## Responsibilities

Data owners assign classifications and approve access. Maintainers and operators apply the required controls. All contributors must report suspected misclassification or exposure promptly.

## Review

Review this document annually and after significant changes to data flows, storage systems, regulatory obligations, or security architecture.