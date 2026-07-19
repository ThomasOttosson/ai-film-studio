# docs/PERFORMANCE_TUNING.md

# Performance Tuning Guide

This guide summarizes production performance optimization practices for AI Film Studio.

## Frontend

- Lazy-load routes and heavy components.
- Optimize bundle size with code splitting.
- Compress static assets.
- Cache immutable assets aggressively.
- Avoid unnecessary re-renders.

## Backend

- Enable response compression.
- Profile slow endpoints regularly.
- Use connection pooling.
- Cache frequently requested data.
- Paginate large result sets.

## Database

- Monitor slow queries.
- Maintain indexes.
- Archive stale data when appropriate.
- Review execution plans after schema changes.

## Realtime

- Monitor active WebSocket connections.
- Batch frequent updates where possible.
- Detect reconnect storms.
- Track message latency.

## Rendering Pipeline

- Autoscale rendering workers.
- Prioritize interactive jobs.
- Monitor queue depth and throughput.
- Detect failed or stalled jobs.

## Continuous Review

Review performance metrics after each production release and before major feature launches.