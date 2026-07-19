# Release Process

This document defines the standard release process for AI Film Studio.

## Objectives

- Produce repeatable and auditable releases.
- Protect the default branch from unverified changes.
- Communicate changes clearly.
- Support safe rollback when needed.

## Release Types

AI Film Studio follows semantic versioning:

- **Patch** releases contain backward-compatible fixes.
- **Minor** releases contain backward-compatible features.
- **Major** releases may contain breaking changes.

Pre-release versions may use identifiers such as `alpha`, `beta`, or `rc`.

## Preconditions

Before starting a release:

- The target branch must be up to date.
- Required CI checks must pass.
- Security and dependency findings must be reviewed.
- Release notes and migration guidance must be prepared.
- Known critical defects must be resolved or explicitly accepted.
- The release checklist must be completed.

See `docs/RELEASE_CHECKLIST.md` for the detailed verification list.

## Release Steps

1. Select the release version.
2. Confirm the intended commit on the default branch.
3. Update `CHANGELOG.md`.
4. Update version references where applicable.
5. Run automated tests, builds, and security checks.
6. Create a signed or annotated Git tag.
7. Push the tag to the canonical repository.
8. Allow the release workflow to build and publish artifacts.
9. Verify published artifacts and deployment health.
10. Publish release notes.

## Release Notes

Release notes should include:

- Version and release date
- User-visible improvements
- Fixed defects
- Security-related changes
- Breaking changes
- Deprecations
- Migration instructions
- Known limitations

Do not disclose sensitive vulnerability details before coordinated remediation.

## Verification

After publication, verify:

- Artifacts are available and have expected checksums.
- Container images use the intended version tag.
- Production health checks pass.
- Critical user workflows function correctly.
- Monitoring shows no significant regression.
- Database or configuration migrations completed successfully.

## Rollback

Rollback should be considered when a release causes:

- Significant service degradation
- Data integrity risk
- Authentication or authorization failures
- Critical workflow failures
- Unacceptable security exposure

Use the most recently verified release and follow `docs/DEPLOYMENT_CHECKLIST.md`, `docs/RUNBOOK.md`, and incident-response procedures.

## Hotfixes

Hotfixes should:

- Contain the smallest safe change.
- Receive expedited review without bypassing required checks.
- Include regression coverage when practical.
- Be documented in `CHANGELOG.md`.
- Be followed by reconciliation with active development branches.

## Responsibilities

The release owner coordinates the release and confirms completion. Code owners review affected areas, while operations and security stakeholders participate when the release changes infrastructure, authentication, data handling, or other high-risk components.

## Records

Retain release notes, tags, workflow results, approvals, and relevant incident records according to repository governance and retention policies.