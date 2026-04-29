---
name: Task Track n Log
description: Use this skill for multi-step repository work that needs durable task decomposition, dependency-aware sequencing, accepted-decision capture, closeout logging, and reliable recovery after automatic context compaction. Use when Codex must maintain or restore `.repo_executive_context/xx_sprintname_task_track_n_log.md`, break a repo objective into reviewable tasks, preserve accepted implementation truth between steps, compare workflow-intent docs against current code truth, or resume a phased architecture/implementation program without losing continuity.
---

# Task Track n Log

This skill teaches Codex how to run multi-step repo programs with durable continuity.

## Core intent

Use this skill to:
- reduce the impact of context loss after automatic compaction
- reduce implementation discontinuity across long repo programs
- improve future intent capture and task success
- make `.repo_executive_context/xx_sprintname_task_track_n_log.md` the primary durable execution memory for each sprint
- preserve accepted decisions, closeout notes, and next-step context in the repo instead of leaving them only in chat history

## Mandatory first reads

For any multi-step repo program, load context in this order when relevant:

1. founder working style
2. coding personalisation
3. repo `.repo_executive_context/xx_sprintname_task_track_n_log.md` for the active sprint
4. repo `.repo_executive_context/project_memory.md` if it exists
5. any workflow-intent document explicitly referenced by the user
6. any detailed spec document linked from the task log `Spec` section
7. relevant AST summaries before full source files

Rules:
- Treat the active `xx_sprintname_task_track_n_log.md` sprint log as the first durable repo file to read for a multi-step program.
- Treat the task log `Spec` section as the condensed program-truth summary for the active program.
- Treat `project_memory.md` as secondary and reserved for reusable cross-program guardrails.
- Treat workflow-intent markdown files as time-bound intent guides that must be compared against current implemented truth.
- Treat any detailed spec linked from the task log as required context for architecture-heavy programs, not optional reference material.

## When to use this skill operationally

Use this skill when:
- the user objective actually contains multiple dependent tasks
- implementation should be reviewed and accepted in steps
- architecture, contracts, or workflow boundaries are evolving over time
- future Codex may need to resume after context compaction
- accepted decisions need to survive beyond the current thread context
- workflow-intent docs must be compared against code truth and accepted clarifications

## Task decomposition workflow

When this skill is active:

1. Determine whether the objective is truly multi-step.
2. If yes, break it into dependency-aware tasks before implementation.
3. Keep each task narrow enough to review independently.
4. Do not mix unrelated scopes inside one task.
5. For each task, define:
   - dependency
   - review status
   - goal
   - process
   - outcome
   - notes
6. Prefer progressing one accepted task at a time unless the user explicitly wants batching.
7. If a later task depends on an earlier task, do not begin the later task until the earlier task is accepted.

Preferred task granularity:
- small enough to review comfortably
- large enough to produce meaningful progress
- narrow enough that a rejected task does not force wide rollback

## Required task log discipline

Use `.repo_executive_context/xx_sprintname_task_track_n_log.md` as the primary durable execution memory for the active multi-step sprint.

File naming rules:
- Store sprint logs in `.repo_executive_context/`.
- Name each sprint log `xx_sprintname_task_track_n_log.md`.
- Use a two-digit incremental prefix for `xx`, starting with `01`.
- Use a short lowercase sprint name with spaces or punctuation converted to underscores.
- Example: `.repo_executive_context/01_auth_retry_task_track_n_log.md`.
- When a new sprint is formed, create the next numbered sprint log and treat it as the active task log.
- Do not overwrite previous sprint logs when starting a new sprint.
- If the user names a sprint, use that sprint name; otherwise infer a short descriptive sprint name from the objective.
- If multiple sprint logs exist and the user does not name one, treat the highest-numbered sprint log as the active log.

## When a Spec section is required

Add a `## Spec` section inside the active `.repo_executive_context/xx_sprintname_task_track_n_log.md` between `## Current State` and `## Tasks` when the active multi-step program has any of the following:

- architecture or workflow design that future Codex must preserve
- endpoint, payload, contract, schema, or state-model decisions
- async vs sync boundary decisions
- source-of-truth ordering that affects implementation
- FE/BE navigation or ownership rules
- acceptance rules that are too important to leave only in task notes

Purpose of the `Spec` section:
- preserve implementation-ready program truth inside the task log itself
- let future Codex recover the active program without depending only on a separate spec doc
- summarize the key accepted rules that all remaining tasks must inherit

The `Spec` section is a concise durable summary, not a full replacement for a dedicated spec doc.

### Required `Spec` structure

Use this structure when relevant:

```md
## Spec
### Program Type
[Short description of what kind of program this is.]

### Accepted Architecture / Workflow
- [Key accepted flow, orchestration, or sequencing rules.]

### Contracts / Payload / Schema
- [Important endpoint, table, payload, or interface rules.]

### Source-of-Truth Rules
- [What takes precedence when docs, code, and prior intent differ.]

### Constraints and Non-Goals
- [Important boundaries, exclusions, and guardrails.]

### Linked Detailed Spec
- [Path to a dedicated detailed spec doc if one exists.]
```

Rules:
- Keep `Spec` concise and implementation-relevant.
- If a separate detailed spec exists, the `Spec` section must summarize it and link its repo path.
- If no separate detailed spec exists, the `Spec` section must still capture the minimum accepted program truth required for safe continuation.
- Do not duplicate the entire detailed spec into the task log.
- Update the `Spec` section when accepted program-level truth changes.

## Spec completeness gate

Before implementation begins for any architecture-heavy or workflow-heavy multi-step program, Codex must assess whether the available spec is implementation-ready.

A spec is implementation-ready only when the remaining tasks can be executed without making hidden architectural assumptions that could materially affect:
- service boundaries
- ownership
- sequencing
- async vs sync behavior
- data contracts
- payload shape
- persistence shape
- retry/error handling
- result navigation
- permissions/user isolation
- source-of-truth precedence
- non-goals and excluded scope

If any of those are unclear, under-specified, conflicting, or only implied, Codex must not silently guess.

Instead Codex must:
1. identify the missing or ambiguous decisions
2. record them in the task log `Spec` section or task `Notes`
3. ask the user targeted follow-up questions before proceeding with implementation
4. mark the affected task as blocked or pending clarification when needed

Codex may proceed without further questions only when:
- the missing detail is genuinely non-material to the implementation, or
- the accepted code truth already resolves it clearly, or
- the user explicitly authorizes a reasonable bounded assumption

When bounded assumptions are used, Codex must:
- state them clearly
- keep them minimal
- record them in the durable task log
- avoid treating them as accepted truth until the user confirms them

### Required architecture blindspot review

When preparing or reviewing a program spec, Codex must actively check for common blindspots, including:

- system boundary ownership
- actor entry points and call direction
- step sequencing and wait points
- duplicate-submit behavior
- idempotency and retry rules
- failure states and recovery path
- status transitions
- schema/table ownership
- endpoint and payload contracts
- result read path
- permission and cross-user isolation
- stale artifact or stale state detection
- API contract minimization						   
- non-goals and deferred design items

If one or more of these are missing and they materially affect implementation, Codex must raise them before proceeding.

### Required security review gates

For any backend, API, storage, database, or orchestration program, Codex must perform both of the following:

1. a pre-implementation design security review
2. a post-implementation code security review

These reviews must explicitly consider, where relevant:

- cross-user contamination
- unauthorized reads or writes
- internal metadata overexposure
- blob or storage access paths
- ownership enforcement
- direct-object-reference risks
- whether the public contract exposes more internal detail than necessary

If no findings are found, Codex must still state that explicitly and note any residual risks or assumptions.

### Required Task Log Format

Use this structure for `.repo_executive_context/xx_sprintname_task_track_n_log.md`:

```md
# Task Track N Log

## Objective
[One clear statement of the overall multi-step objective.]

## Current State
- Current task: Task N
- Overall status: In Progress | Completed | Blocked
- Last updated: YYYY-MM-DD

## Spec
### Program Type
[Short description of what kind of program this is.]

### Accepted Architecture / Workflow
- [Key accepted flow, orchestration, or sequencing rules.]

### Contracts / Payload / Schema
- [Important endpoint, table, payload, or interface rules.]

### Source-of-Truth Rules
- [What takes precedence when docs, code, and prior intent differ.]

### Constraints and Non-Goals
- [Important boundaries, exclusions, and guardrails.]

### Linked Detailed Spec
- [Path to a dedicated detailed spec doc if one exists.]

## Tasks
- [ ] Task 1: [Short task title]
  - Depends on: None
  - Review: Pending
  - Goal: [What this task is meant to achieve.]
  - Process: [How the task should be carried out.]
  - Outcome: [What success looks like once completed.]
  - Notes: [Important decisions, constraints, code truth, doc truth, or future dependency notes.]

- [x] Task 2: [Short task title]
  - Depends on: Task 1
  - Review: Accepted by [Reviewer]
  - Goal: [What this task was meant to achieve.]
  - Process: [How the task was carried out.]
  - Outcome: [What was successfully achieved.]
  - Notes: [Accepted decisions, what changed, and what future tasks now depend on.]

## Next Task
Task N: [Concrete next task title]
```

Formatting rules:
- Keep exactly one `Objective` section.
- Keep exactly one `Current State` section.
- Add exactly one `Spec` section when the program is architecture-heavy, workflow-heavy, or contract-heavy.
- Use ordered task numbering such as `Task 1`, `Task 2`, and so on.
- Use markdown checkboxes:
  - `[ ]` for not yet accepted
  - `[x]` for accepted/completed
- For every task, always include:
  - `Depends on`
  - `Review`
  - `Goal`
  - `Process`
  - `Outcome`
  - `Notes`
- Keep `Next Task` updated at all times.
- If the program is complete, say so explicitly in `Next Task`.
- If a task is blocked, state the blocker clearly in `Notes`.

Content rules:
- `Objective` should describe the full program, not just the current task.
- `Current State` should reflect the real active task and overall program state.
- `Spec` should capture the minimum accepted program truth needed to safely continue future tasks.
- `Goal` should explain why the task exists.
- `Process` should describe the intended or completed execution path.
- `Outcome` should describe the success condition or what was achieved.
- `Notes` must preserve the details future Codex is most likely to lose after compaction.

`Notes` must capture:
- accepted user decisions
- code truth established or changed
- doc truth established or changed
- ownership or architectural boundary clarifications
- implementation constraints discovered during the task
- what the next task now depends on
- whether the task was code-changing, docs-only, or mixed

Update and closeout rules:
- Update the file immediately after every accepted task.
- If implementation is complete but still awaiting review, record that clearly in `Notes` and leave `Review: Pending`.
- When moving to the next task, update:
  - `Current State`
  - `Spec` if accepted program-level truth changed
  - task checkbox and review state
  - accepted-task notes
  - `Next Task`
- After each accepted task, record:
  - that the task was accepted
  - the shortest accurate summary of what changed
  - implementation truth and doc truth now established
  - any rule or decision future tasks must inherit

Source-of-truth rules for this file:
- The active `xx_sprintname_task_track_n_log.md` is the primary durable execution memory for the active multi-step sprint.
- The `Spec` section is the primary condensed program-truth summary inside the task log.
- It should preserve enough detail that future Codex can resume safely without relying on prior chat history.
- It should capture accepted decisions and closeout facts, not just task names.
- The task log is not a vague checklist.

## Context restoration protocol

When resuming a repo program after compaction or interruption:

1. read the active `.repo_executive_context/xx_sprintname_task_track_n_log.md`
2. identify:
   - objective
   - current task
   - completed accepted tasks
   - pending next task
3. read the task log `Spec` section and identify any linked detailed spec
4. read `.repo_executive_context/project_memory.md` for reusable guardrails
5. reload any workflow-intent document relevant to the current task
6. read any linked detailed spec required for the active program
7. read AST summaries for the relevant services/files
8. only then read full source files needed for the active task

Do not assume conversation history survived.
Rebuild context from repo memory first.

## Source-of-truth guidance

Use this source-of-truth order when there is tension between documents:

1. current accepted code truth
2. current accepted task outcomes in the active `xx_sprintname_task_track_n_log.md`
3. reusable guardrails in `project_memory.md`
4. implementation truth docs such as architecture maps and runbooks
5. workflow-intent docs such as `zeroinventory workflow.md`

Interpretation rules:
- the active `xx_sprintname_task_track_n_log.md` is primary execution memory for the active program.
- `project_memory.md` is secondary cross-program memory.
- architecture maps and runbooks are implementation-truth documentation.
- workflow markdown files are intent/reference documents, not permanent sole truth.
- when workflow wording and current accepted implementation differ, preserve both clearly, but treat accepted code truth as current truth.

## Anti-patterns to prevent

Do not:
- skip task decomposition on obviously multi-step work
- continue into a dependent task before the prerequisite task is accepted
- leave accepted decisions only in chat history
- treat the task log as a checkbox list with no closeout detail
- dump all task-level detail into `project_memory.md`
- treat workflow-intent docs as permanent sole truth without checking current code and accepted clarifications
- keep implementing after a task without updating the durable log
- widen the active task beyond the accepted plan without explicitly re-framing the program

## Practical operating pattern

Use this loop for multi-step repo work:

1. ground in repo truth
2. decompose into dependency-aware tasks
3. implement one narrow task
4. let the user review and accept
5. update the active `xx_sprintname_task_track_n_log.md`
6. restore from repo memory before the next task if context becomes thin

## Output expectation when using this skill

When reporting progress, make it easy to review:
- what was completed
- what was accepted
- what changed in code truth
- what changed in doc truth
- what is next
- what still remains



