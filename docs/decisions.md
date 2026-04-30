# Architecture Decisions

## ADR-001: Node.js, Fastify, and TypeScript

Fastify keeps request overhead low for high-throughput ingestion, while TypeScript gives the workflow and RCA rules strong compile-time contracts.

## ADR-002: Redis Streams as Queue

Redis is already required for caching, and Streams provide durable append, consumer groups, pending entries, and simple local Docker operation. This avoids adding RabbitMQ unless routing complexity grows.

## ADR-003: Split Raw and Transactional Storage

MongoDB stores raw high-volume signals because schemas can evolve quickly. PostgreSQL remains the source of truth for incident lifecycle, RCA, and MTTR because those updates need transactions.

## ADR-004: Redis Locks for Debounce Race Control

The debounce threshold is counted in Redis, then protected by a short `NX` lock. This keeps duplicate incident creation out of PostgreSQL even with multiple workers.

## ADR-005: WebSocket Fanout Through Redis Pub/Sub

Each API instance can accept WebSocket clients. Redis Pub/Sub distributes incident changes across instances so frontend updates continue to work after horizontal scaling.
