# Documentation Standards

## Documentation expectations

- Keep documents useful, current, and easy to scan.
- Record decisions that future agents and humans will need.
- Avoid bloated prose.
- Prefer durable notes over transient chatter.

## Must-maintain project files

When relevant, maintain these files in each repo:

- `.repo_executive_context/client_preferences.md`
- `.repo_executive_context/project_memory.md`

## Documentation style

- state what changed
- explain why it matters
- include constraints, assumptions, and unresolved issues when needed

## Decision rules

- Record decisions that affect future implementation, architecture, user expectations, or agent behavior.
- Keep transient progress in sprint logs and durable reusable knowledge in project memory or client preferences.
- Prefer short source-of-truth sections over duplicated explanations across many files.
- Update existing docs in place when possible instead of creating parallel documents with overlapping ownership.

## Quality bar

- Documentation should make the next action easier for a future human or agent.
- Each section should have a distinct job and avoid repeating guidance already captured elsewhere.
- Closeout notes should include changed files, rationale, assumptions, and unresolved follow-ups when they matter.
