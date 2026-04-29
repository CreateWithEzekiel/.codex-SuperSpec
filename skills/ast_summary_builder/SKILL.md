---
name: AST Summary Builder
description: Create or refresh durable AST-style markdown summaries for important repository files without broadly loading full source code into Codex context. Use this when a repository needs compact structural summaries under .repo_executive_context/ast_summaries for planning, context reduction, or recovery after compaction. Prefer direct script execution after first understanding the repo folder structure and selecting target files. Supports Python, TypeScript, TSX, JavaScript, JSX, HTML, and CSS.
---

# AST Summary Builder

This skill creates and maintains durable AST-style summaries for important files while minimizing unnecessary source-file loading into Codex context.

## Core intent

This skill is designed to:
- first understand the **repo folder structure**
- avoid reading large amounts of source code into Codex context up front
- use a deterministic Python helper to extract structural facts and write summaries
- use generic structural and library-aware detectors instead of file-specific hardcoded output lines
- only load exact source content later when truly required for verification or implementation work

## Storage location

Store summaries under:

`.repo_executive_context/ast_summaries/`

Mirror the repo-relative structure exactly.

Examples:
- `backend/api/orders.py` -> `.repo_executive_context/ast_summaries/backend/api/orders.py.md`
- `frontend/src/pages/Dashboard.tsx` -> `.repo_executive_context/ast_summaries/frontend/src/pages/Dashboard.tsx.md`

## Mandatory operating rules

1. **Do not start by loading many source files into Codex context.**
2. **Start by understanding the repo structure only.**
3. **Prefer directory listing, folder mapping, and file selection first.**
4. **After identifying candidate files, directly run the provided Python helper script.**
5. **Let the Python helper read source files and generate deterministic summaries.**
6. **Do not manually reproduce large source excerpts in the response.**
7. **Only inspect exact source files manually if the script output is suspicious, incomplete, or if exact implementation work is later required.**

## Required workflow

### Step 1: Understand structure first
Before anything else:
- inspect the repository folder structure
- identify major areas such as backend, frontend, services, routers, pages, components, schemas, utilities, orchestrators, or pipelines
- identify candidate important files without opening many source files in the chat context

Do not do broad full-file reading at this stage.

### Step 2: Select target files
Target important files such as:
- API routers
- service modules
- orchestrators
- major UI pages
- central state modules
- workflow controllers
- schema or validation modules when they define important contracts

Do not target:
- tiny helpers
- one-line wrappers
- trivial constants-only files
- throwaway test fixtures

### Step 3: Run the deterministic helper
Run the provided helper script:

`scripts/build_ast_summary.py`

Execution rule:
- dynamically import the script, and register the module in `sys.modules` before `exec_module(...)`
- avoid ad hoc dynamic-import patterns for this helper because scripts with `@dataclass` can fail during module resolution when they are not registered first
- tweak the variables to target the required files and folders to build AST summaries

The helper is responsible for:
- walking target files
- parsing supported source types
- generating mirrored markdown summary paths
- writing AST summaries to `.repo_executive_context/ast_summaries/`
- optionally writing JSON fact files
- stamping structural freshness metadata

### Step 4: Review only the outputs
After the script runs:
- review the generated summary files
- check whether they are structurally useful and concise
- only then decide whether any specific source file needs direct manual reading

## Supported source types for deterministic extraction

The provided helper supports:
- Python (`.py`)
- TypeScript / TSX (`.ts`, `.tsx`)
- JavaScript / JSX (`.js`, `.jsx`)
- HTML (`.html`)
- CSS (`.css`)

## Summary design rules

The helper should:
- use real Python AST parsing for Python files
- use generic structural heuristics for JS/TS/TSX/JSX/HTML/CSS
- use library-aware detectors for common Python library ecosystems when present
- avoid file-specific hardcoded output lines
- keep summaries concise but meaningful
- produce broader function coverage for large files
- write file-level logic notes only from reusable structural or library-triggered patterns

## Common library-aware signals

The helper can improve heuristic understanding by detecting imports, aliases, attribute chains, and call usage for libraries such as:
- cv2 / OpenCV
- PIL / Image
- fitz / PyMuPDF
- numpy / np
- pandas / pd
- openpyxl
- tqdm
- cadquery / cq
- trimesh
- fastapi
- requests
- openai / OpenAI / AzureOpenAI
- asyncio

These should improve heuristic file-role and function-role inference only when the file actually proves that domain.

## Required summary template

Generated summaries should follow this structure and omit empty sections when needed.

```md
# AST Summary: [File Path]

## Summary Status
- Source file last reviewed: [YYYY-MM-DD]
- Summary confidence: [High/Medium/Low]
- Structural freshness: [Current/Stale/Needs Review]
- Source hash: [short hash]

## File Role
[1 sentence]

## Imports / Dependencies
- [Dependency]

## Exports / Public Surface
- [Export]

## Key Structure
- [Definition]

## Functional Groups
- [group]

## Section Summaries
### `[Function/Component/Section Name]`
- Category: [category]
- Responsibility: [responsibility]
- Location: [line or lines]
- Note: [optional short logic note]

## Related Files
- [Related module or file hint]

## Important Logic Notes
- [Important reusable structural note]
```

## How Codex should behave when using this skill

When this skill is invoked, Codex should:
1. inspect the repo structure only
2. decide the candidate important files
3. run the deterministic helper script directly
4. review the generated markdown outputs
5. avoid broad manual source loading unless specifically needed later

## Validation
Use `scripts/validate_ast_summary.py` to perform a basic validation pass over generated `.md` summaries and optional `.facts.json` files.

## Output expectation

Report:
- which folders were scanned
- which files were selected
- which summary files were created
- which summary files were updated
- any unsupported files skipped
