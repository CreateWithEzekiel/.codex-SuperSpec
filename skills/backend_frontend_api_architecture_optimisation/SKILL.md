---
name: "Backend Frontend API Architecture Optimisation"
description: "Use when Codex needs to improve, review, or design frontend performance through backend/API architecture. Trigger for slow frontend loads, API latency, oversized responses, N+1 queries, pagination gaps, caching decisions, database connection pressure, JSON serialization overhead, payload compression, async logging, frontend/backend contract shaping, and performance-focused API design reviews."
---

# Frontend Backend API Optimisation

Use this skill to reason from frontend symptom to backend architecture. Assume Codex already knows the optimisation techniques. The skill's job is to start the right investigation, choose the smallest useful intervention, and protect correctness, security, and maintainability.

## Core Rule

Optimise the user-visible flow, not the technique list. Do not start by adding caching, compression, pooling, or serializers. Start by finding where the frontend waits, what backend work causes that wait, and which contract or execution change removes the most waste with the least architectural cost.

## First Pass

| Step | Question | Evidence to inspect | Decision pressure |
|---|---|---|---|
| 1 | What frontend moment feels slow? | Route, component, interaction, waterfall, loading state | Tie backend work to a user-visible delay |
| 2 | Which API call blocks that moment? | Endpoint, query params, request timing, payload size | Avoid optimising unrelated backend paths |
| 3 | What work happens behind the endpoint? | Handler, service, DB queries, external calls, serialization, logging | Find the actual bottleneck before choosing a fix |
| 4 | Is the contract asking for too much? | Response fields, nested data, list size, round trips | Prefer better API shape before infrastructure |
| 5 | Is work repeated or unbounded? | Query count, cacheability, pagination, fan-out | Remove waste before masking it |
| 6 | What correctness boundary can break? | Auth, tenant scope, ownership, freshness, retries | Performance must not weaken data safety |
| 7 | How will improvement be proven? | Before/after timings, query count, payload size, p95, frontend UX | Require measurable validation where practical |

## Optimisation Lens

| Lens | Look for | Consider when | Be careful of |
|---|---|---|---|
| API contract shape | Over-fetching, under-fetching, excessive nesting, UI doing backend composition | Frontend waits on several calls or parses/renders data it does not need | Breaking clients, hiding domain boundaries, returning internal fields |
| Pagination/windowing | Unbounded arrays, histories, logs, feeds, files, jobs, search results | Initial render needs only the first useful slice | Unstable ordering, expensive counts, cursors that leak or bypass filters |
| N+1 removal | Loops that call DB/storage/services, lazy ORM relationships, repeated similar SQL | Latency grows with item count | Unsafe batching, cross-tenant leakage, cartesian joins, changed null behavior |
| Caching | Repeated expensive reads, stable reference data, dashboards, aggregates | Data can be stale within a defined product tolerance | Incorrect cache keys, stale permissions, cross-user data exposure |
| Connection pooling | Connection creation per request, DB saturation, pool waits, concurrency spikes | Latency rises under load despite reasonable queries | Oversized pools, unreleased sessions, transaction leakage |
| Serialization | High CPU response building, huge model dumps, slow JSON conversion | Queries are fixed but response generation remains slow | Skipping schema control, precision/date changes, exposing internal fields |
| Compression | Large text/JSON transfer, slow network waterfall | Payload remains large after shaping and pagination | CPU overhead, double compression, tiny responses, sensitive reflected content |
| Async logging | Slow log sinks, heavy request-path logging, p95 spikes during log bursts | Logs are diagnostic and not business-critical persistence | Lost audit/billing events, unbounded queues, missing request correlation |

## Decision Order

| Priority | Prefer | Why |
|---|---|---|
| 1 | Remove unnecessary data and calls | Reduces backend, network, and frontend work at once |
| 2 | Bound work with pagination or scoped endpoints | Prevents performance from degrading as data grows |
| 3 | Fix query fan-out and backend execution waste | Improves scaling without changing product behavior |
| 4 | Add caching for safe repeated reads | Reduces repeated work after correctness boundaries are clear |
| 5 | Tune runtime overhead | Helps once data shape and query behavior are reasonable |
| 6 | Compress transfer | Useful for remaining large text payloads, but not a substitute for shaping |
| 7 | Move non-critical side effects off the request path | Improves tail latency when blocking I/O is proven |

## FE/BE Architecture Checks

| Concern | Check |
|---|---|
| Initial render | Does the first API response contain exactly what the first screen needs, not the entire domain object graph? |
| Progressive loading | Can secondary data load after the useful first paint without creating excessive round trips? |
| List/detail split | Are list endpoints lean and detail endpoints rich enough for the selected item? |
| Server-side composition | Should the backend provide a read model instead of forcing the frontend to stitch many calls? |
| Freshness | Which data must be real-time, near-real-time, or eventually consistent? |
| Mutation flow | After writes, which cached or paginated views become stale, and how does the UI recover? |
| Error model | Can the frontend distinguish empty, loading, partial, stale, forbidden, and failed states? |
| Versioning | Can the response contract evolve without breaking existing frontend code? |

## Security And Correctness Gate

Before recommending or implementing an optimisation, explicitly check:

| Boundary | Risk to rule out |
|---|---|
| Auth and ownership | Faster access must not bypass user, tenant, role, or object ownership checks |
| Cache keys | Keys must include every permission, tenant, filter, sort, page, locale, and version input that changes output |
| Batching | Batched queries must enforce the same authorization as per-item queries |
| Pagination | Cursors and limits must not expose hidden records or bypass filters |
| Serialization | Faster output paths must not leak internal or sensitive fields |
| Compression | Sensitive reflected responses may need compression disabled or reviewed |
| Logging | Async diagnostic logs must not replace durable audit, billing, or compliance records |
| Retries/idempotency | Performance changes around mutations must not duplicate writes or hide partial failure |

## Implementation Bias

| Situation | Bias |
|---|---|
| No measurement exists | Inspect code and add lightweight evidence before larger changes |
| Multiple fixes seem valid | Choose the one closest to the bottleneck and easiest to validate |
| Frontend is making many calls | Decide whether batching, a read endpoint, or better component loading is the real fix |
| Backend returns too much | Reduce fields or split contracts before relying on compression |
| Endpoint is slow with lists | Check pagination and N+1 before caching |
| Endpoint is slow only under load | Check DB pool pressure, external calls, queueing, and log sinks |
| Data is user-specific | Treat caching as security-sensitive by default |
| Change touches shared API contracts | Preserve backwards compatibility or name the versioning/migration path |

## Output Contract

When using this skill, answer with:

| Section | Content |
|---|---|
| Frontend symptom | The exact user-visible delay or interaction affected |
| Backend path | Endpoint, service path, data sources, and response shape involved |
| Bottleneck hypothesis | The strongest suspected cause and why |
| Recommended optimisation | The smallest change that should improve the flow |
| Why this over alternatives | One or two rejected options and the trade-off |
| Security/correctness checks | Ownership, freshness, contract, retry, and exposure risks |
| Implementation boundary | Files/modules likely touched and what should stay unchanged |
| Validation | Before/after checks: latency, query count, payload size, waterfall, p95, or targeted tests |
| Residual risk | What remains uncertain without production-like data or load |

## Stop Conditions

Do not proceed directly to implementation when:

| Condition | Action |
|---|---|
| The slow frontend moment is unclear | Ask for or inspect the affected route/interaction first |
| The endpoint cannot be identified | Trace the frontend network flow before backend edits |
| The optimisation could expose user or tenant data | Perform the security gate before coding |
| The change requires API contract redesign | Present the contract trade-off before modifying code |
| The fix depends on production scale assumptions | Mark assumptions and prefer a measurable, reversible change |

## Review Closeout

Close with the practical result: what flow improves, why the chosen backend change is the right one, what was intentionally not changed, and how Human can verify the improvement.
