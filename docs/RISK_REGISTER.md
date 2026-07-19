# docs/RISK_REGISTER.md

# Risk Register

This document tracks significant risks for AI Film Studio and recommended mitigations.

| ID | Risk | Impact | Likelihood | Mitigation |
|----|------|--------|------------|------------|
| R-001 | Service outage | High | Medium | Redundant infrastructure, monitoring, incident response |
| R-002 | Data loss | High | Low | Automated backups, restore testing, disaster recovery |
| R-003 | Security vulnerability | High | Medium | Dependency scanning, code review, patch management |
| R-004 | Performance degradation | Medium | Medium | Load testing, observability, capacity planning |
| R-005 | Third-party dependency failure | Medium | Medium | Vendor review, graceful degradation, retries |
| R-006 | Regulatory changes | Medium | Low | Periodic compliance reviews |

## Review Process

- Review quarterly.
- Update after major incidents.
- Record newly identified risks during architecture reviews.

## Risk Ownership

Each risk should have:
- An assigned owner
- A mitigation plan
- A review date
- A current status