# Security Metrics

## Purpose

This document defines the security metrics used to evaluate the effectiveness, coverage, and maturity of security controls within AI Film Studio.

## Objectives

- Measure security performance consistently.
- Identify control gaps and negative trends.
- Support risk-based prioritization.
- Provide evidence for audits and reviews.
- Improve accountability across engineering and operations.

## Metric Principles

Security metrics should be:

- Actionable
- Measurable
- Repeatable
- Time-bound
- Assigned to an owner
- Interpreted with appropriate context

Metrics must not be used as substitutes for engineering judgment or risk assessment.

## Vulnerability Metrics

Track:

- Open vulnerabilities by severity
- Median time to remediation
- Percentage remediated within target
- Vulnerability recurrence rate
- Age of unresolved critical and high findings
- Internet-exposed vulnerable assets
- Exceptions and accepted risks past review date

Suggested remediation targets should align with `docs/VULNERABILITY_MANAGEMENT.md`.

## Dependency Security Metrics

Track:

- Known vulnerable direct dependencies
- Known vulnerable transitive dependencies
- Time from advisory publication to remediation
- Percentage of repositories with dependency scanning enabled
- Unsupported or end-of-life dependencies
- Dependency update backlog
- Failed dependency-review checks

## Secure Development Metrics

Track:

- Percentage of pull requests passing security checks
- Static analysis coverage
- Secret-scanning coverage
- Code review participation
- Threat models completed for high-risk changes
- Security defects found before production
- Security defects found after production
- Completion of required security training

## Identity and Access Metrics

Track:

- Privileged accounts
- Accounts without MFA
- Dormant accounts
- Overdue access reviews
- Temporary access past expiration
- Shared accounts
- Emergency-access usage
- Time to revoke access after role changes or departure

## Authentication Metrics

Track:

- Failed authentication attempts
- Account lockouts
- Suspicious login detections
- MFA challenge failure rates
- Credential-reset volume
- Authentication-related incidents
- Session revocation events

Authentication metrics should be interpreted carefully to distinguish user error from malicious activity.

## Secrets and Key Management Metrics

Track:

- Secrets approaching expiration
- Secrets past rotation date
- Exposed credentials detected
- Mean time to revoke exposed credentials
- Encryption keys approaching rotation
- Unmanaged secrets
- Workloads using embedded credentials
- Percentage of secrets stored in approved systems

## Network Security Metrics

Track:

- Internet-exposed services
- Unapproved open ports
- Firewall rule exceptions
- Overdue firewall reviews
- Blocked malicious traffic
- Suspicious outbound connections
- Insecure protocol usage
- Certificate expiration risk

## Logging and Detection Metrics

Track:

- Percentage of critical services sending required logs
- Telemetry ingestion failures
- Detection-rule coverage
- Detection-rule false-positive rate
- Mean time to acknowledge security alerts
- Mean time to investigate
- Mean time to contain
- Unresolved high-severity alerts
- Logging gaps affecting investigations

## Incident Response Metrics

Track:

- Security incidents by severity
- Mean time to detect
- Mean time to acknowledge
- Mean time to contain
- Mean time to recover
- Incidents with completed post-incident reviews
- Overdue corrective actions
- Recurring incident causes
- Incidents involving data exposure

## Data Protection Metrics

Track:

- Systems with documented data classification
- Unencrypted sensitive data stores
- Data-retention exceptions
- Overdue data deletion
- Unauthorized data-access events
- Data-loss prevention alerts
- Backup encryption coverage
- Restore tests involving protected data

## Cloud and Infrastructure Metrics

Track:

- Publicly accessible storage resources
- Unencrypted storage resources
- Misconfiguration findings
- Infrastructure-as-code scan coverage
- Privileged cloud identities
- Resources without owners
- Unsupported runtime or operating-system versions
- Configuration drift from approved baselines

## Security Testing Metrics

Track:

- Penetration tests completed
- High-risk findings from penetration tests
- Remediation status of test findings
- Security regression tests
- Abuse-case coverage
- Disaster recovery exercises with security scenarios
- Tabletop exercises completed
- Findings repeated across assessments

## Third-Party Risk Metrics

Track:

- Critical vendors assessed
- Overdue vendor reviews
- Vendors with unresolved high risks
- Contracts lacking required security terms
- Third-party incidents affecting the platform
- Unsupported third-party integrations
- Vendors with excessive access

## Compliance Metrics

Track:

- Control implementation status
- Control test pass rate
- Open audit findings
- Overdue audit remediation
- Policy review completion
- Evidence collection status
- Approved exceptions
- Exceptions past expiration

## Reliability and Security Correlation

Security reviews should consider operational metrics that may reveal security risk, including:

- Error-rate spikes
- Queue anomalies
- Unexpected resource consumption
- Unusual data-transfer volume
- Repeated service restarts
- Sudden configuration changes
- Monitoring or logging interruptions

## Severity and Targets

Each metric should define:

- Owner
- Data source
- Collection frequency
- Target
- Warning threshold
- Critical threshold
- Escalation path
- Review cadence

Targets should be risk-based and revised when the architecture or threat environment changes.

## Reporting Cadence

Recommended reporting:

- Critical operational metrics: continuous or daily
- Vulnerability and access metrics: weekly
- Security program metrics: monthly
- Governance and compliance metrics: quarterly
- Executive security summary: quarterly or after major incidents

## Dashboards

Security dashboards should:

- Show current status and trends
- Distinguish environments
- Highlight breaches of target
- Link to source findings
- Identify metric owners
- Avoid exposing sensitive details unnecessarily
- Preserve historical data for trend analysis

## Data Quality

Metric owners must validate:

- Data completeness
- Source reliability
- Timestamp accuracy
- Asset coverage
- Duplicate handling
- Severity consistency
- Changes to collection logic

Material changes to metric definitions should be documented.

## Escalation

Threshold breaches should trigger:

1. Validation of the metric.
2. Assignment of an accountable owner.
3. Risk assessment.
4. Corrective action.
5. Escalation when targets cannot be met.
6. Documented exception where formally accepted.
7. Follow-up verification.

## Metric Review

Metrics should be retired or revised when they:

- No longer reflect meaningful risk
- Encourage undesirable behavior
- Cannot be measured reliably
- Duplicate another metric
- Lack an accountable owner
- Do not support decisions or action

## Related Documents

- `docs/SECURITY_HARDENING.md`
- `docs/VULNERABILITY_MANAGEMENT.md`
- `docs/IDENTITY_AND_ACCESS_MANAGEMENT.md`
- `docs/KEY_MANAGEMENT.md`
- `docs/NETWORK_SECURITY.md`
- `docs/LOGGING_STANDARD.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/THIRD_PARTY_RISK_MANAGEMENT.md`
- `docs/RISK_REGISTER.md`
- `docs/AUDIT_GUIDE.md`

## Review

Review this document annually and after significant changes to the security program, platform architecture, threat model, or compliance obligations.