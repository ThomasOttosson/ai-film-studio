# Security Policy

## Supported Versions

Security fixes are applied to the latest version on the default branch and to the latest published release.

| Version | Supported |
|---|---|
| Latest release | Yes |
| Default branch | Yes |
| Older releases | No |

## Reporting a Vulnerability

Do not open a public GitHub issue for suspected security vulnerabilities.

Report vulnerabilities privately through GitHub Security Advisories:

1. Open the repository's **Security** tab.
2. Select **Advisories**.
3. Select **Report a vulnerability**.
4. Include clear reproduction steps, affected components, potential impact, and any suggested mitigation.

Please avoid accessing, modifying, or deleting data that does not belong to you. Do not perform denial-of-service testing or automated high-volume scanning without prior authorization.

## Response Process

After receiving a report, maintainers will:

1. Acknowledge the report.
2. Validate and assess its severity.
3. Prepare and test a fix.
4. Coordinate disclosure with the reporter.
5. Publish a security advisory and patched release when appropriate.

## Sensitive Information

Never commit secrets or credentials, including:

- API keys
- access tokens
- passwords
- private keys
- database connection strings
- cloud provider credentials
- production environment files

Use repository secrets and environment-specific secret management instead.

## Scope

The following are generally in scope:

- Authentication and authorization bypasses
- Cross-site scripting
- Injection vulnerabilities
- Server-side request forgery
- Remote code execution
- Sensitive data exposure
- Insecure WebSocket behavior
- Privilege escalation
- Dependency vulnerabilities with a demonstrated impact

The following are generally out of scope:

- Findings without a security impact
- Missing security headers without an exploitable scenario
- Reports based only on automated scanners
- Social engineering
- Physical attacks
- Denial-of-service testing
- Vulnerabilities in unsupported versions