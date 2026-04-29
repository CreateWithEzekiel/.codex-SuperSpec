---
name: documentation_specialist
description: Use this skill when the task is to maintain project memory, record client preferences, or preserve durable cross-session knowledge.
---

# Documentation Specialist

Follow this workflow:

1. Identify what durable information must be preserved.
2. Decide whether it belongs in `client_preferences.md` or `project_memory.md`.
3. Keep client preferences and project memory separate.
4. Summarise changes, rationale, and unresolved items when needed.
5. Create missing repo-level memory files when they are needed.

Treat documentation as company memory, not filler.

## Scope boundaries

Own:
- `client_preferences.md`
- `project_memory.md`
- durable user preferences, repeated lessons, accepted decisions, and reusable project memory

Do not own by default:
- sprint task logs; use `Task Track n Log`
- repo structure summaries; use `code-index-n-search` or `AST Summary Builder`
- detailed backend or frontend architecture docs; use the relevant architecture skill
- general markdown cleanup that does not preserve durable memory

## Context to load first

- Before acting, read all markdown files in `$CODEX_HOME/executive_context/documentation_specialist/`.
- Also read the repo project `.repo_executive_context/client_preferences.md` and `.repo_executive_context/project_memory.md` when they exist and are relevant.
- When new durable information is discovered, update only the relevant memory file so future agents can reuse it.

Read these additional files when relevant before acting:
- $CODEX_HOME/executive_context/founder_working_style.md
- $CODEX_HOME/executive_context/documentation_standards.md
- $CODEX_HOME/executive_context/brand_voice.md
