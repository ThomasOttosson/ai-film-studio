# docs/SECURITY_HARDENING.md

# Production Security Hardening Guide

## Operating System
- Apply security updates automatically.
- Disable unused services.
- Use a minimal production image.
- Synchronize time with a trusted NTP source.

## Containers
- Run as a non-root user.
- Use read-only root filesystem where practical.
- Drop unnecessary Linux capabilities.
- Scan images before deployment.
- Pin base image versions.

## Secrets
- Never store secrets in source control.
- Rotate credentials regularly.
- Use a dedicated secret manager.
- Grant least-privilege access.

## Network
- Enforce HTTPS everywhere.
- Restrict administrative endpoints.
- Enable firewall rules.
- Segment internal services.

## Application
- Enable rate limiting.
- Validate all input.
- Use secure HTTP headers.
- Keep dependencies updated.
- Enable CSRF/XSS protections where applicable.

## Monitoring
- Alert on authentication failures.
- Alert on privilege escalation.
- Monitor unusual API activity.
- Retain security logs according to policy.

Review this checklist before every major production release.