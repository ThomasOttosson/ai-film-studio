# docs/API_STYLE_GUIDE.md

# API Style Guide

This guide defines conventions for designing and evolving APIs in AI Film Studio.

## Design Principles

- Prefer consistent, predictable interfaces.
- Use resource-oriented URLs.
- Make operations idempotent where appropriate.
- Return meaningful HTTP status codes.
- Version breaking changes explicitly.

## Naming

- Use lowercase, kebab-case resource paths.
- Use nouns for resources.
- Use verbs only where resource semantics are not practical.

Examples:

- GET /projects
- POST /projects
- GET /projects/{id}
- PATCH /projects/{id}

## Request & Response

- Accept and return JSON.
- Validate all inputs.
- Return structured error objects.
- Include stable identifiers.

## Error Format

```json
{
  "error": {
    "code": "validation_error",
    "message": "Human-readable description"
  }
}
```

## Pagination

Prefer cursor-based pagination for large collections.

## Security

- Require authentication for protected endpoints.
- Validate authorization on every request.
- Never expose secrets or internal implementation details.

## Compatibility

Maintain backward compatibility within a major API version. Deprecations should follow the repository's deprecation policy.

## Documentation

Every endpoint should document:
- Purpose
- Parameters
- Request examples
- Response examples
- Error conditions
- Authentication requirements