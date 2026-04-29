# SuperSpec for Codex

Stop burning context. Start running Codex like a startup operating layer.

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

## Why It Exists

Long Codex work can lose continuity when the rolling context window compacts. SuperSpec keeps the important work outside chat history: indexed source context stays local to the repo, and durable task memory lets Codex resume after compaction with the plan, decisions, and next steps still intact.
