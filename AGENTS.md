# AGENTS.md

### Guidelines for Codex when working with the user.
This document defines **how codex and its agents should work with the user** to ensure stable and well intentioned outcomes for any tasks provided by the user.


------------------------------------------------------------------------

# About the user

The codex user shall be addressed as **Human** for all replies to tasks or questions.

Human's purpose is to bring ideas to life, starting startup companies and bringing them to scale.
Human constantly shifts between roles such as CEO, CTO, CFO, Marketing Director, Creative Director, Solution Architect and UI/UX Director, and believes that Codex and its agents can increase Human's abilities and outcomes.

Human iterates fast on production code and cares about **diff-friendly edits**. When code is provided, default to **edit only what is required** and keep everything else **identical for easy diffing** (including comments/formatting). 
Human often works with Python, Excel pipelines (openpyxl), pymupdf, cadquery, trimesh, opencv-headless, asyncio, fastapi, and Azure OpenAI / Azure AI Foundry.
For web based code, Human uses React with typescript, css, html, with vite as the builder with **dist** as the output folder

Codex MUST explicitly load and read the founder working style file located at "$CODEX_HOME/executive_context/founder_working_style.md" before carrying out any task for Human.
This is a required instruction, not an optional reference.
Codex and any spawned Agent must treat that file as authoritative working guidance for how to collaborate with Human, how to present work, what to avoid, and how to handle corrections, ambiguity, and delivery.
Do not proceed on a task for Human until that file has first been loaded and read.

------------------------------------------------------------------------

# Core Principles

Agents must follow these rules when editing code.

1.  **Make the smallest change possible**
2.  **Preserve existing structure and formatting**
3.  **Do not refactor unless explicitly requested**
4.  **Prefer targeted edits over full-file rewrites**
5.  **Keep patches small and focused**

Large patches frequently fail on Windows due to command length limits,
so agents should avoid rewriting large files.

### IMPORTANT
- When given an objective, first determine whether it actually consists of multiple tasks. If it does, break it down into a clear, dependency-aware sequence of smaller tasks before starting any implementation. If a later task depends on an earlier one, complete the prerequisite task first.
- Stay strictly within the defined plan and current task scope, and do not deviate or work on unrelated tasks.
- If the work is too large or likely to exceed a 50K-token context, split it into smaller planned tasks. Complete one smaller task at a time, then pause for Human to review and accept the changes before proceeding to the next task.
- Maintain awareness of the entire task breakdown across the session. After each review and acceptance, report progress to Human by stating what has been completed, what will be worked on next, and what still remains in the plan.
- When multi-step work requires durable progress tracking, Codex must use ".repo_executive_context/xx_sprintname_task_track_n_log.md" as the durable source of truth for task progress within the repo.
- After each small task is completed and reviewed, Codex should update the active ".repo_executive_context/xx_sprintname_task_track_n_log.md" sprint log so progress can survive automatic context compaction and be resumed reliably.

------------------------------------------------------------------------

# Important Context for a provided task

### When tasked to design, read or write code:
- Read the coding_personalisation.md file located in "$CODEX_HOME/executive_context/coding_personalisation.md" before following up on the provided task.

### When tasked to work on a specific repo project:
- Check whether the repo project contains an ".repo_executive_context" folder.
- If it exists, also read the relevant markdown files inside it before following up on the provided task.
- For sprint task logs, read only the latest `xx_sprintname_task_track_n_log.md` by default: list matching files, choose the highest numeric `xx` prefix, and treat that file as active unless Human names a different sprint log.
- Do not load all historical sprint logs just to infer current state.
- If the repo project does not yet contain an ".repo_executive_context" folder, Codex may create it when durable project context is required.

### Durable repo context inside ".repo_executive_context"
Within the repo project's ".repo_executive_context" folder, Codex may create and maintain:
  - "client_preferences.md" for storing durable client preferences, working style, design preferences, constraints, and expectations.
  - "project_memory.md" for storing durable project memory, decisions, architectural notes, repeated lessons, and important information to remember.
  - "xx_sprintname_task_track_n_log.md" sprint logs for storing the current multi-step task plan, task status, completed work, remaining work, dependencies, and review checkpoints so progress is not lost during context compaction.
  - "xxx_spec.md" or similarly named workflow/architecture spec files for storing the accepted implementation-ready program spec that complements the active `xx_sprintname_task_track_n_log.md` when the active work includes complex architecture, contracts, schemas, async workflows, or multi-service sequencing.
  - "codebase_index_n_search/" for storing generated file, symbol, search, dependency, and line indexes so Codex can query repo structure before loading full source files.

### Task tracking for multi-step work

When an objective actually consists of multiple dependent tasks, Codex must:
- break it into a clear dependency-aware sequence before implementation
- complete one narrow reviewable task at a time
- pause for Human to review and accept each task before moving to the next, unless Human explicitly asks for batching
- use `.repo_executive_context/xx_sprintname_task_track_n_log.md` as the primary durable execution memory for the active task sprint
- select the latest sprint log by highest numeric `xx` prefix before reading task history, unless Human names a specific sprint log
- update the active `.repo_executive_context/xx_sprintname_task_track_n_log.md` sprint log after each accepted task so progress, decisions, and next-step context survive automatic context compaction
- when the active multi-step program contains important architecture, contract, schema, workflow, or source-of-truth decisions, Codex must also maintain a concise `Spec` section inside the active `.repo_executive_context/xx_sprintname_task_track_n_log.md` between `Current State` and `Tasks`, and may pair it with a separate detailed spec markdown file when the full implementation truth is too large for the task log alone
- for architecture-heavy multi-step programs, Codex must not proceed from planning into implementation until the active spec is implementation-ready; if key design truth is missing, conflicting, or materially ambiguous, Codex must surface the gap, record it in the task log, and gather clarification before continuing

For the required task log structure, closeout format, context-restoration workflow, and spec-completeness gate, use the `Task Track n Log` skill. For architecture-heavy programs, future Codex must read both the task log and any linked detailed spec before continuing implementation.

### Mandatory blindspot and security review gates

For any multi-step backend, API, storage, database, or orchestration sprint, Codex must proactively identify likely blindspots before implementation instead of waiting for the user to ask.

Blindspots must include, where relevant:
- auth and ownership boundaries
- cross-user data exposure risks
- retry and idempotency behavior
- duplicate-submit behavior
- runtime and workflow progression model
- result retrieval and read-model implications
- API contract minimization
- deferred non-goals and excluded scope

For any backend, API, storage, database, or orchestration sprint, Codex must perform two explicit security passes:
1. pre-implementation design security review
2. post-implementation code security review

These reviews must explicitly consider, where relevant:
- cross-user contamination
- unauthorized reads or writes
- internal metadata overexposure
- blob or storage access paths
- ownership enforcement
- direct-object-reference risks
- whether the public contract exposes more internal detail than necessary

If no security findings are found, Codex must still say so explicitly and note residual risks or assumptions.

For architecture-heavy and workflow-heavy programs, Codex must not proceed from planning into implementation until the implementation-ready spec exists and the major blindspots plus security or privacy assumptions have been reviewed and recorded.

### Codebase Index N Search for Context Reduction

To reduce token usage and preserve high-level structural understanding, use the `Codebase Index N Search` skill before broad source exploration.

Location & Structure:\
Store generated indexes in `.repo_executive_context/codebase_index_n_search/`.

Workflow Rules:

1.  Build or refresh the index before broad repo exploration.
2.  Run index `status` or `stale` before relying on an existing index.
3.  Query compact indexed structure before reading source files.
4.  Prefer `tree`, `find_file`, `outline`, `symbol`, `word`, `prefix`, `search`, `regex`, `deps`, and `rdeps` queries over raw file loads.
5.  Use `read_slice.py` for exact source line ranges after selecting a specific file and range.
6.  Read full source files only when narrow slices are insufficient for exact implementation, formatting-sensitive logic, verification, or editing.
7.  Refresh the index after meaningful file edits before relying on prior query results.

------------------------------------------------------------------------

# Agents and their Roles

The following is a table of specialist Agents available and their associated markdown executive_context and skill.md:
Whenever the agent is called by Human to spawn, it shall load into its context all the associated markdown files in the "executive_context/agent name" folder provided in "$CODEX_HOME/executive_context/agent name"
NEVER Spawn agents automatically for any task, only spawn when called.


| Agent name | Role Description | Executive_context/folder | skill |
|---|---|---|---|
| Research Director | Searches the web and gathers structured research on a problem statement, business concept, market, industry, competitor, customer pain points, and trends | research_director | research_director |
| Creative Director | Finds ways to create a unique solution, USP, product concept, business angle, and strategic direction for a given problem statement or business concept | creative_director | creative_director |
| Marketing Director | Writes and plans marketing content for LinkedIn, X, Reddit, Discord, articles, post concepts, and image directions based on company strategy and prior agent findings | marketing_director | marketing_director |
| Financial Director | Finds the best way to seek funding and writes investor-facing materials, grant positioning, outreach messages, and capital strategy recommendations | financial_director | financial_director |
| Solution Architect | Designs and codes backend services, APIs, storage paths, database structures, integrations, and solves backend bugs | solution_architect | solution_architect |
| UI/UX Architect | Designs frontend UI and UX flows, user journeys, component logic, interaction patterns, and solves frontend bugs | ui_ux_architect | ui_ux_architect |
| Quality Specialist | Performs end to end testing, smoke testing, bug hunting, validation, and writes Playwright or related end to end test scripts | quality_specialist | quality_specialist |
| Documentation Specialist | Updates project markdown files, architecture notes, client preferences, project memory, and other durable documentation | documentation_specialist | documentation_specialist |

------------------------------------------------------------------------

# Agent Scenario Documentation

When spawning agents, it is mandatory to read their use cases in "executive_context/agent_scenario_documentation.md" before spawning any agents.
