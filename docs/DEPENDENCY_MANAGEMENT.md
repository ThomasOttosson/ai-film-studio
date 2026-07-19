# docs/DEPENDENCY_MANAGEMENT.md

# Dependency Management

This document defines dependency management practices for AI Film Studio.

## Objectives

- Keep dependencies current and secure.
- Minimize unnecessary packages.
- Maintain reproducible builds.

## Policy

- Prefer actively maintained dependencies.
- Pin versions where appropriate.
- Review new dependencies before adoption.
- Remove unused dependencies promptly.

## Security

- Run automated dependency scanning.
- Monitor security advisories.
- Patch critical vulnerabilities as soon as practical.
- Verify package integrity when supported.

## Update Process

1. Review available updates.
2. Assess compatibility and changelogs.
3. Execute automated tests.
4. Perform manual verification for critical paths.
5. Merge after review and CI approval.

## Third-Party Licenses

Ensure all dependencies use licenses compatible with the project's LICENSE and distribution model.

## Review

Review dependency health regularly and at least monthly.