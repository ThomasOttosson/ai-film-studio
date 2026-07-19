# Control Ownership

## Purpose

This document defines accountability for operational, security, compliance, and engineering controls within AI Film Studio.

## Scope

This standard applies to controls covering:

- Security
- Privacy
- Reliability
- Availability
- Change management
- Access management
- Vulnerability management
- Backup and recovery
- Incident response
- Third-party risk
- Software delivery
- Documentation governance

## Ownership Roles

### Control Owner

The control owner is accountable for:

- Defining the control objective
- Ensuring the control is implemented
- Maintaining supporting procedures
- Reviewing control effectiveness
- Approving exceptions
- Coordinating remediation

### Control Operator

The control operator is responsible for:

- Performing recurring control activities
- Collecting required evidence
- Escalating failures or deviations
- Following approved procedures

### Evidence Owner

The evidence owner ensures that control evidence is:

- Complete
- Accurate
- Protected
- Retained for the required period
- Available for review

### Approver

The approver independently reviews significant exceptions, risk acceptance, and control changes.

## Required Control Metadata

Each control should include:

- Control identifier
- Control name
- Objective
- Description
- Control owner
- Control operator
- Evidence owner
- Frequency
- Systems in scope
- Required evidence
- Related risks
- Related policies or standards
- Last review date
- Next review date
- Current status

## Control Status

Use the following status values:

- Designed
- Implemented
- Operating
- Needs Improvement
- Remediation in Progress
- Exception Approved
- Retired

## Ownership Requirements

- Every active control must have a named owner.
- Ownership must be reassigned before an owner leaves the role.
- Shared ownership should be avoided unless responsibilities are explicitly divided.
- Critical controls must have a documented backup owner or escalation path.
- Ownership records must be reviewed at least annually.

## Control Reviews

Control owners should periodically confirm:

1. The control objective remains relevant.
2. The control is operating as designed.
3. Evidence is complete and retained.
4. Dependencies and systems in scope are current.
5. Exceptions remain valid.
6. Remediation actions are progressing.
7. Documentation reflects actual practice.

## Exceptions

Control exceptions require:

- Documented justification
- Risk assessment
- Compensating controls
- Named owner
- Approval
- Expiration or review date
- Remediation plan where applicable

## Escalation

Control failures that create significant risk must be escalated through the incident, risk, or change-management process as appropriate.

## Related Documents

- `docs/COMPLIANCE_MATRIX.md`
- `docs/RISK_REGISTER.md`
- `docs/AUDIT_GUIDE.md`
- `docs/CHANGE_MANAGEMENT.md`
- `docs/SECURITY_METRICS.md`
- `docs/DOCUMENTATION_GOVERNANCE.md`

## Review

Review this document annually and after significant changes to governance, compliance requirements, organizational ownership, or control frameworks.