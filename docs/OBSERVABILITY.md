# docs/OBSERVABILITY.md

# Observability Guide

This document outlines the observability strategy for AI Film Studio.

## Objectives

- Detect issues before users report them.
- Provide actionable telemetry.
- Minimize mean time to detect (MTTD).
- Minimize mean time to recover (MTTR).

## Pillars

### Metrics
Track:
- API latency
- Error rates
- Request throughput
- Queue depth
- Render duration
- WebSocket connections
- Resource utilization

### Logs
Requirements:
- Structured JSON logging
- Correlation/request IDs
- Log levels
- Sensitive data redaction

### Traces
Capture:
- API requests
- Database queries
- External service calls
- Background jobs
- Rendering pipeline

## Alerting

Critical alerts should cover:
- High error rate
- Elevated latency
- Service unavailable
- Failed deployments
- Queue backlog
- Database connectivity
- Disk exhaustion

## Dashboards

Recommended dashboards:
- Service health
- API performance
- Infrastructure
- Background workers
- Rendering pipeline
- User activity

## Retention

- Metrics: according to operational requirements.
- Logs: retain per compliance policy.
- Traces: retain sampled production traces for troubleshooting.

Review observability coverage regularly as the platform evolves.