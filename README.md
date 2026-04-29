<p align="center">
  <img src="Codex SuperSpec.png" alt="codedb" width="400" />
</p>

# SuperSpec for Codex

**Stop burning context. Start running Codex like a startup operating layer.**

SuperSpec for Codex is a founder/operator configuration for Codex. It is built for people using Codex across product, engineering, research, marketing, funding, quality, and documentation work, not just solo coding.

If you are just starting on Codex, feel free to use it as is.  For experienced users of Codex, treat it as a strong starting point, then adapt the agent roles, working style, and memory rules to your own workflow.

## Install

Back up your existing Codex home folder first.

Then copy these items into your Codex home folder:

- `AGENTS.md`
- `agents/`
- `executive_context/`
- `skills/`

Default Codex home locations:

- Windows: `%USERPROFILE%\.codex`
- macOS/Linux: `~/.codex`

If you use `CODEX_HOME`, copy the files there instead. If you already have a Codex setup, merge carefully instead of overwriting.

## What It Does

SuperSpec adds three layers on top of Codex:

- **Token Efficiency Engine:** a local repo index with SQLite, symbols, dependencies, prefix search, trigrams, sparse n-grams, and narrow source slices. The goal is to reduce input-token burn by reading only the lines that matter, with a target of less than 30% input-token footprint for source exploration after initial indexing.
- **Local Durable Repo Memory:** repo-local task logs, task breakdowns, accepted decisions, project memory, client preferences, and specs. This is not cloud memory and not global memory; it stays local to each repo to avoid context bleeding across projects.
- **Codex Workflows for Founders:** `AGENTS.md`, specialist agents, and skills work together as an operating layer for research, creative direction, marketing, funding, solution architecture, UI/UX, quality, and documentation.

## Who This Is For

SuperSpec is for new Codex users who are exploring what Codex can become when its workflows are more structured, efficient, and accurate. It is also for aspiring founders who want Codex to support product, strategy, research, marketing, funding, and delivery work from one local operating layer.

Experienced Codex users may find it useful as a reference system for making agents more focused, reducing wasted context, and preserving project memory across long-running work.

## What This Is Not

SuperSpec is not a separate multi-agent framework. It defines multiple Codex agents, roles, skills, and orchestration rules, and it can support parallel work inside Codex when the user explicitly asks for spawned agents.

The goal is not to replace Codex with another runtime, service, or agent platform. The goal is to make stock Codex more structured: clearer roles, better context loading, deterministic coding support, durable repo memory, and less wasted context during long tasks.

## Deterministic Process for Coding

SuperSpec keeps the workflow deterministic where it matters. The repo index is built, refreshed, queried, and sliced by local Python scripts in `skills/code-index-n-search/scripts/`, not by agent guesswork. Codex decides what context it needs, then the scripts return compact file trees, symbols, dependencies, search hits, and exact source slices.

This avoids adding MCP complexity just to make the system work. Everything is designed to run directly in stock Codex from files in your Codex home folder, with local repo artifacts stored under `.repo_executive_context/`.

## Why It Exists

Long Codex work can lose continuity when the rolling context window compacts. SuperSpec keeps the important work outside chat history: indexed source context stays local to the repo, and durable task memory lets Codex resume after compaction with the plan, decisions, and next steps still intact.
