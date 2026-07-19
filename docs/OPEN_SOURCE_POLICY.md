# Open Source Policy

## Purpose

This policy defines how AI Film Studio evaluates, uses, contributes to, and releases open-source software.

## Scope

This policy applies to:

- Application dependencies
- Development and build tools
- Container images
- Infrastructure modules
- Copied source code and snippets
- Forked repositories
- Internal projects proposed for public release
- Employee contributions made on behalf of the project

## Principles

Open-source software must be used in a way that:

- Respects license obligations
- Protects confidential information and intellectual property
- Minimizes security and supply-chain risk
- Preserves maintainability
- Provides appropriate attribution
- Supports reproducible builds

## Dependency Approval

Before introducing a new dependency, contributors should evaluate:

- Functional necessity
- License compatibility
- Project maintenance activity
- Security history
- Release cadence
- Community health
- Availability of supported alternatives
- Dependency size and transitive dependency impact
- Provenance and package authenticity

Dependencies with unclear ownership, abandoned maintenance, suspicious release activity, or incompatible licensing must not be adopted without documented approval.

## License Requirements

Permissive licenses are generally preferred, including:

- MIT
- BSD-2-Clause
- BSD-3-Clause
- Apache-2.0
- ISC

Copyleft, source-available, custom, or commercially restricted licenses require explicit legal and project-owner review before use.

License obligations must be satisfied for source distributions, binaries, containers, hosted services, documentation, and other relevant delivery formats.

## Prohibited Use

Do not:

- Remove copyright or license notices
- Copy code without confirming its license
- Use packages with unknown or missing licenses
- Publish confidential or proprietary material
- Depend on unofficial packages that impersonate trusted projects
- Bypass dependency review or security scanning
- Incorporate code whose terms conflict with the project license or distribution model

## Attribution

Required notices and attributions must be retained in the repository and included in distributed artifacts where applicable.

A third-party notices file should be generated or updated for releases that redistribute open-source components.

## Security Review

Open-source components are subject to:

- Dependency scanning
- Vulnerability monitoring
- Provenance verification
- Integrity checks
- Version pinning where appropriate
- Review of transitive dependencies
- Timely remediation or replacement

Critical dependencies should have identified maintainers and contingency plans.

## Version Management

Dependencies should:

- Use explicit version constraints
- Be updated through reviewed pull requests
- Include lockfiles where supported
- Avoid unverified pre-release versions in production
- Be removed when no longer required

Automated dependency updates must pass the same testing and review requirements as other changes.

## Forks and Patches

Forking an upstream project should be a last resort.

Any maintained fork must document:

- Reason for the fork
- Upstream repository
- Local modifications
- Responsible owner
- Synchronization strategy
- Exit or upstream-contribution plan

Security patches applied locally must be tracked until incorporated upstream or the dependency is replaced.

## Contributions to External Projects

Contributions made on behalf of AI Film Studio must:

- Contain no secrets, customer data, or confidential information
- Follow the external project's contribution rules
- Be reviewed when they include substantial project-owned work
- Avoid creating unsupported commitments
- Respect contributor license agreements and developer certificates of origin

## Releasing Internal Software

Before publishing an internal project as open source:

1. Confirm ownership and authorization.
2. Remove secrets, credentials, private endpoints, and internal data.
3. Review commit history and generated artifacts.
4. Perform security and dependency scans.
5. Select an approved license.
6. Add contribution and governance documentation.
7. Define maintenance ownership.
8. Confirm that public release does not expose sensitive architecture or controls.
9. Obtain required legal and security approvals.

## Software Bill of Materials

Production releases should generate a software bill of materials where supported.

The bill of materials should identify:

- Component names
- Versions
- Package sources
- Licenses
- Dependency relationships
- Integrity or provenance information where available

## Exceptions

Exceptions require:

- A documented business or technical justification
- Risk assessment
- Named owner
- Compensating controls
- Approval from the appropriate maintainer or security owner
- Expiration or review date

## Enforcement

Non-compliant components may be blocked, removed, replaced, or isolated from production use.

Material violations should be handled through the project's security, incident, or governance processes as appropriate.

## Related Documents

- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `docs/DEPENDENCY_MANAGEMENT.md`
- `docs/VULNERABILITY_MANAGEMENT.md`
- `docs/SECURE_DEVELOPMENT_LIFECYCLE.md`
- `docs/THIRD_PARTY_RISK_MANAGEMENT.md`
- `docs/RELEASE_PROCESS.md`

## Review

Review this policy annually and after significant changes to licensing obligations, distribution practices, dependency tooling, or the project's open-source strategy.