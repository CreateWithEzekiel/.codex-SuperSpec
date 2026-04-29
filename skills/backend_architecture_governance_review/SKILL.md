---
name: Backend Architecture Governance Review
description: Use this skill for backend, API, database, storage, async workflow, and multi-service architecture sprints that need an implementation-ready spec, proactive blindspot surfacing, explicit trade-off review, and governance checks before coding begins.
---

# Backend Architecture Governance Review

Use this skill when the task involves backend architecture, service orchestration, async workflows, runtime progression, persistence design, API contracts, or implementation-heavy governance decisions.

## Core purpose

This skill exists to make backend architecture work more deliberate before implementation starts.

Use it to:
- force proactive blindspot identification without waiting for the user to ask
- tighten architecture-heavy specs until they are implementation-ready
- surface trade-offs and non-obvious downstream constraints early
- reduce sprint drift caused by hidden assumptions
- make governance and architecture review a normal part of backend delivery

## Scope boundary

This skill is for architecture, workflow, runtime, persistence, sequencing, ownership-boundary, and contract-shaping review.

Use it to decide how the backend should work.
Do not use it as the primary skill for code-level vulnerability review, authorization flaw hunting, or endpoint exposure analysis after implementation. That is the role of `Backend API Security Review`.

## When to use this skill

Use this skill when one or more of the following is true:
- the task changes backend architecture or service boundaries
- the task introduces or modifies async workflows or orchestration logic
- the task defines or changes database tables, schemas, blob layout, or job stores
- the task introduces or changes endpoint contracts, payload shapes, or result navigation
- the task spans multiple services or backend subsystems
- the task is large enough that implementation depends on accepted architectural truth

## Mandatory review sequence

When this skill is active, follow this sequence before implementation:

1. restate the real backend objective in operational terms
2. identify the actor entry points and call direction
3. define the source-of-truth ordering across code, docs, and spec
4. surface blindspots proactively
5. turn accepted answers into an implementation-ready spec
6. explicitly review non-goals and deferred scope
7. only then proceed into task-by-task implementation

Do not wait for the user to ask for blindspots. Surface them yourself.

## Required blindspot checklist

Review the spec or proposed design against all relevant items below:

- system boundary ownership
- actor entry points and public control plane
- allowed service-to-service call direction
- step sequencing and wait points
- sync vs async boundary decisions
- duplicate-submit behavior
- retry and idempotency rules
- failure states and recovery path
- status transitions and lifecycle truth
- runtime model and worker progression
- table/schema ownership and row semantics
- endpoint and payload contracts
- result read path and navigation model
- permission and cross-user isolation
- stale artifact or stale state detection
- API contract minimization
- operational dependencies and deployment assumptions
- non-goals and deferred design items

If a blindspot materially affects implementation, raise it before coding.

## Required output shape

When using this skill, produce:
- `Objective`: the backend change being designed or governed
- `Proposed Scope`: what is in scope and what is intentionally out of scope
- `Blindspots`: the non-obvious risks or missing decisions that need to be surfaced
- `Trade-offs`: what is gained, what is lost, and what future constraints follow
- `Recommended Direction`: the preferred architecture or workflow decision
- `Open Decisions`: only the unresolved items that materially block implementation
- `Implementation Gate`: whether the spec is ready for coding or still needs clarification

## Good outcomes

Good use of this skill results in:
- an implementation-ready backend spec
- fewer hidden assumptions during coding
- fewer user-driven rescue questions later
- cleaner task decomposition
- stronger continuity between architecture and implementation

## Anti-patterns

Do not:
- jump from a rough architecture idea straight into code
- assume retry, ownership, or result navigation rules without surfacing them
- leave architecture-critical truth only in chat history
- produce only generic option lists without a recommendation
- blur public API contracts with internal storage details unless intentional
