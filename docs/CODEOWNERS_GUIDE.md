# CODEOWNERS_GUIDE.md

This document explains how to maintain the project's CODEOWNERS file.

## Responsibilities

The CODEOWNERS file automatically requests reviews from designated owners when matching files change.

## Recommendations

- Keep ownership aligned with active maintainers.
- Assign critical infrastructure to multiple reviewers.
- Review ownership after major refactors.
- Avoid assigning inactive contributors.

## Protected Areas

Recommended protected paths include:

- frontend/
- backend/
- infrastructure/
- .github/
- docs/
- load/

## Best Practices

- Require CODEOWNERS review on protected branches.
- Pair CODEOWNERS with branch protection rules.
- Review ownership quarterly.