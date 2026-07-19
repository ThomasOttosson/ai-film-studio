# docs/DEPRECATION_POLICY.md

# Deprecation Policy

This policy defines how features, APIs, and configuration options are deprecated.

## Principles

- Prefer backward compatibility whenever possible.
- Communicate changes early and clearly.
- Provide documented migration paths.
- Avoid removing functionality without prior notice.

## Deprecation Process

1. Identify the feature to be deprecated.
2. Document the replacement, if applicable.
3. Mark the feature as deprecated in documentation and release notes.
4. Emit runtime warnings where appropriate.
5. Maintain compatibility throughout the published deprecation period.
6. Remove the feature only after the announced end-of-support date.

## Recommended Timeline

- Announcement: at least one major release before removal.
- Maintenance: bug fixes and security updates only.
- Removal: next scheduled major release unless otherwise documented.

## Documentation

Every deprecated feature should include:
- Reason for deprecation
- Recommended replacement
- Migration guidance
- Planned removal version

## Exceptions

Security, legal, or critical reliability issues may require accelerated removal.
Such exceptions should be documented and communicated as soon as practical.