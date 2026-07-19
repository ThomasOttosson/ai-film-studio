# API Versioning Policy

This document defines the API versioning policy for AI Film Studio.

## Goals

- Preserve compatibility for existing integrations.
- Make breaking changes explicit and predictable.
- Provide a clear migration path between versions.
- Keep supported versions secure and maintainable.

## Version Format

Public APIs use a major version identifier in the request path:

```text
/api/v1/projects
/api/v2/projects
```

Minor, backward-compatible improvements do not create a new path version.

## Backward-Compatible Changes

The following changes may be released within an existing major version:

- Adding optional request fields
- Adding response fields
- Adding new endpoints
- Adding new enum values when clients are expected to handle unknown values
- Improving validation without rejecting previously valid requests
- Fixing behavior that clearly contradicts published documentation

Clients should ignore unknown response fields and avoid relying on response-field order.

## Breaking Changes

The following changes require a new major API version:

- Removing or renaming an endpoint
- Removing or renaming a request or response field
- Changing a field type or meaning
- Making an optional field required
- Changing authentication requirements
- Changing status-code semantics
- Introducing stricter limits that invalidate previously supported usage
- Changing pagination, ordering, or idempotency behavior incompatibly

## Deprecation Process

Before retiring an API version or capability:

1. Mark it as deprecated in documentation.
2. Publish the recommended replacement and migration instructions.
3. Add deprecation and sunset headers where practical.
4. Announce the planned retirement date.
5. Maintain the deprecated version for the stated support window.
6. Monitor remaining usage and contact affected integrators where possible.
7. Remove the version only after the announced sunset date.

## Support Window

A superseded major API version should normally remain supported for at least
12 months after the successor reaches general availability, unless continued
support creates an urgent security, legal, or reliability risk.

Emergency changes may use a shorter timeline. Such exceptions must be documented
and communicated as early as possible.

## Experimental APIs

Experimental endpoints must be clearly labeled and may change without the normal
compatibility guarantees. They should use an explicit namespace or feature flag,
for example:

```text
/api/experimental/...
```

Experimental APIs must not be presented as stable production contracts.

## Version Lifecycle

API versions progress through these states:

- **Experimental:** No compatibility guarantee
- **Active:** Recommended for new integrations
- **Maintenance:** Security and critical fixes only
- **Deprecated:** Supported temporarily; migration required
- **Retired:** No longer available

## Documentation Requirements

Each supported API version must document:

- Base path
- Authentication
- Request and response schemas
- Error format
- Pagination behavior
- Rate limits
- Idempotency behavior
- Changelog
- Deprecation status

## Client Responsibilities

API consumers should:

- Pin integrations to an explicit major version.
- Handle unknown response fields safely.
- Avoid depending on undocumented behavior.
- Monitor deprecation notices.
- Test migrations before a version reaches its sunset date.

## Governance

Breaking-change proposals require review from the relevant code owners and
maintainers. The review must include migration impact, rollout strategy,
documentation updates, observability, and rollback planning.