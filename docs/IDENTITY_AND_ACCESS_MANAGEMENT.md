# docs/IDENTITY_AND_ACCESS_MANAGEMENT.md

# Identity and Access Management (IAM)

## Purpose

This document defines identity lifecycle, authentication, authorization, and privileged access requirements for AI Film Studio.

## Core Principles

- Least privilege
- Need-to-know access
- Separation of duties
- Strong authentication
- Default deny
- Continuous access review

## Identity Lifecycle

- Provision identities through approved processes.
- Modify access promptly after role changes.
- Disable accounts immediately upon departure.
- Remove inactive accounts after defined review periods.

## Authentication

- Require MFA for administrative and production access.
- Use SSO where available.
- Enforce strong password policies for local accounts.
- Prefer short-lived tokens over long-lived credentials.

## Authorization

Access should be role-based wherever practical.

Examples:

- Viewer
- Contributor
- Maintainer
- Administrator
- Security Administrator

Administrative access should be limited to the smallest practical group.

## Privileged Access

Privileged accounts should:

- Be dedicated to administrative work.
- Be monitored and logged.
- Avoid routine day-to-day usage.
- Require MFA.

## Service Accounts

- Assign a documented owner.
- Grant minimum required permissions.
- Rotate credentials regularly.
- Review permissions periodically.

## Access Reviews

Review privileged and production access at least quarterly.

Confirm:

- Business justification
- Correct role assignment
- Unused accounts
- Excessive permissions

## Logging

Log:

- Successful and failed authentication
- Privilege changes
- Role assignments
- Administrative actions
- Service account changes

Never log passwords, secrets, or authentication tokens.

## Related Documents

- docs/KEY_MANAGEMENT.md
- docs/DATA_CLASSIFICATION.md
- docs/SECURITY_HARDENING.md
- docs/AUDIT_GUIDE.md

## Review

Review annually and after major architectural or organizational changes.