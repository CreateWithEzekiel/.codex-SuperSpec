---
name: Backend API Security Review
description: Use this skill to review backend and API changes for authorization flaws, cross-user leakage, ownership gaps, internal metadata overexposure, artifact-access risks, and other endpoint or storage security issues before and after implementation.
---

# Backend API Security Review

Use this skill when the task involves reviewing backend or API behavior for security, privacy, ownership, or exposure risks.

## Core purpose

This skill exists to make backend and API security review a standard step instead of an optional afterthought.

Use it to:
- run a design-time security review before implementation begins
- run a code-truth security review after implementation is complete
- identify cross-user contamination and authorization gaps
- detect overexposure of internal metadata or storage references
- review whether public API responses reveal more than they need to

## Scope boundary

This skill is for authentication, authorization, ownership, exposure, artifact-access, and public-response review.

Use it to decide whether the backend or API is secure enough and whether it exposes too much.
Do not use it as the primary skill for broader backend workflow design, runtime-model selection, or architecture trade-off shaping before the security surface exists. That is the role of `Backend Architecture Governance Review`.

## When to use this skill

Use this skill when one or more of the following is true:
- a backend endpoint is added or changed
- async job status or orchestration APIs are added or changed
- blob, file, or storage references are returned through an API
- user ownership or company ownership boundaries matter
- IDs, foreign keys, or object references are accepted from the client
- the change spans multiple backend services or persistence layers

## Mandatory security passes

When this skill is active, perform both reviews where relevant:

1. pre-implementation design security review
2. post-implementation code security review

The first looks for flaws in the planned design.
The second looks for flaws in the written code.

## Required security checklist

Review the design or code against all relevant items below:

- authentication requirements
- authorization and ownership enforcement
- cross-user data exposure
- cross-company data exposure
- direct-object-reference risks
- child-record or related-record ownership scoping
- internal metadata overexposure
- blob, file, SAS, or artifact-access paths
- whether result references can be abused for unauthorized reads
- whether raw storage paths are exposed unnecessarily
- unsafe debug detail in public responses
- privilege escalation through retries, status endpoints, or orchestration helpers
- whether errors leak sensitive implementation details
- whether the public contract can be minimized safely

## Findings format

When using this skill, classify each reviewed point as one of:
- `Direct Exploit Risk`: a flaw that can plausibly lead to unauthorized access, mutation, or privilege escalation
- `Information Minimization Issue`: internal detail is overexposed even if it does not directly grant access
- `Residual Hardening Note`: not a clear vulnerability, but a defense-in-depth improvement worth considering

Then produce:
- `Security Surface Reviewed`: which endpoints, helpers, storage paths, and ownership boundaries were reviewed
- `Findings`: prioritized issues with severity, location, impact, and the narrowest good fix
- `Non-Findings Worth Noting`: things that were checked and look acceptable
- `Residual Risks`: assumptions, edge cases, or deferred hardening items
- `Recommended Fixes`: the concrete patch direction
- `Minimum Safe Patch`: the smallest acceptable fix if full tightening is deferred

When no findings exist, say that explicitly and still note residual risks or assumptions.

## Good outcomes

Good use of this skill results in:
- tighter ownership enforcement
- fewer accidental leaks through helper endpoints
- cleaner separation between internal orchestration data and FE-facing contracts
- safer blob and artifact access behavior
- a repeatable security review habit across future sprints

## Anti-patterns

Do not:
- treat a lack of obvious exploits as proof that the design is secure
- stop at top-level ownership checks without reviewing related child data
- expose internal orchestration detail just because it is convenient
- assume blob paths are harmless if access still feels indirect
- skip the design review and rely only on a final code pass
