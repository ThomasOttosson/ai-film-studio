# Audit and Assurance Guide

## Purpose

This guide defines how AI Film Studio prepares for, supports, and responds to internal and external audits.

## Objectives

- Demonstrate that documented controls are implemented and operating.
- Provide complete, accurate, and traceable evidence.
- Reduce disruption to engineering and operations.
- Track findings through verified remediation.

## Scope

Audits may cover:

- Security and access control
- Software development practices
- Change and release management
- Incident response
- Availability and resilience
- Data protection and retention
- Third-party risk
- Regulatory or contractual obligations

## Roles

### Audit Coordinator

The audit coordinator:

- Serves as the primary contact.
- Confirms scope, timeline, and evidence requirements.
- Assigns evidence owners.
- Tracks requests, findings, and deadlines.
- Reviews submissions for completeness and sensitivity.

### Control Owners

Control owners:

- Explain how controls operate.
- Provide current evidence.
- Identify exceptions or known gaps.
- Support remediation activities.

### Reviewers

Security, legal, privacy, or engineering reviewers validate evidence before release when sensitive information is involved.

## Audit Preparation

Before an audit:

1. Confirm the audit scope and applicable period.
2. Identify control and evidence owners.
3. Review relevant policies and procedures.
4. Validate that evidence is accessible and current.
5. Resolve obvious documentation inconsistencies.
6. Establish a secure evidence-sharing method.
7. Record deadlines and dependencies.

## Evidence Standards

Evidence should be:

- Relevant to the requested control.
- Limited to the applicable audit period.
- Complete enough to demonstrate operation.
- Traceable to a system, owner, or approved record.
- Reviewed for secrets, personal data, and unrelated customer information.
- Preserved without unauthorized modification.

Examples include:

- Approved pull requests
- CI/CD records
- Access review records
- Change tickets
- Incident reports
- Backup test results
- Monitoring reports
- Training records
- Vendor review records
- Policy approval history

## Evidence Handling

- Share evidence only through approved channels.
- Apply least-privilege access.
- Redact information not required for the audit.
- Do not provide credentials, private keys, tokens, or raw secret values.
- Record what was shared, with whom, and when.
- Retain evidence according to the data retention policy and audit obligations.

## Interviews and Walkthroughs

During interviews:

- Answer accurately and within the agreed scope.
- Describe actual practice rather than intended practice.
- Avoid guessing; verify uncertain details.
- Document follow-up questions and owners.
- Escalate requests that may expose restricted information.

## Findings Management

Each finding should include:

- Description
- Affected control or requirement
- Risk rating
- Root cause
- Remediation owner
- Target completion date
- Corrective action
- Validation evidence
- Closure approval

## Remediation Priorities

Prioritize findings based on:

- Potential impact
- Likelihood of exploitation or failure
- Regulatory or contractual exposure
- Number of affected users or systems
- Availability of compensating controls

Critical findings should be escalated immediately and handled under the incident response or vulnerability management process when applicable.

## Exceptions

Any inability to satisfy an audit request should be documented with:

- The reason
- The affected requirement
- Existing compensating controls
- Risk acceptance or remediation plan
- Responsible approver
- Review or expiration date

## Audit Closure

At audit completion:

1. Confirm all evidence requests are resolved.
2. Review draft findings for factual accuracy.
3. Assign remediation owners and deadlines.
4. Record accepted risks and exceptions.
5. Track corrective actions to closure.
6. Capture lessons learned.
7. Update policies, procedures, and controls where required.

## Related Documents

- `docs/RISK_REGISTER.md`
- `docs/CHANGE_MANAGEMENT.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/DATA_RETENTION_POLICY.md`
- `docs/THIRD_PARTY_RISK_MANAGEMENT.md`
- `docs/SECURE_DEVELOPMENT_LIFECYCLE.md`
- `docs/VULNERABILITY_MANAGEMENT.md`

## Review

Review this guide annually and after significant audits, regulatory changes, or material changes to the control environment.