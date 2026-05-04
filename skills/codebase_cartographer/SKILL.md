---
name: Codebase Cartographer
description: Generate deterministic codebase graph artifacts and materialise a bundled local browser visualiser for Python, FastAPI, React, TypeScript, TSX, and CSS repositories. Use when Codex needs to map functions, components, API routes, schemas, styles, imports, calls, request/response contracts, evidence-backed service links, Obsidian notes, JSON Canvas files, Ask & Trace flows, or a localhost node graph without inventing source relationships.
---

# Codebase Cartographer

## Core Rule

Treat bundled scripts as the source of truth for graph topology, node identity, source references, API contracts, and validation status. Codex may add summaries only in clearly separated `agentic_*` fields or separate enrichment files.

Do not invent:
- nodes
- edges
- payload shapes
- response shapes
- route methods or paths
- schema references
- source line evidence

When source truth is missing, write `unknown`, `partial`, `not_declared`, or `inferred_from_usage`.

## Quick Start

On initial skill activation for a target repository, first check whether the supporting `Codebase Index N Search` skill is available in the current session.

If it is available:
- If `.repo_executive_context/codebase_index_n_search/` is missing in the target repository, run that skill's `scripts/build_index.py` against the target repo before broad exploration.
- If `.repo_executive_context/codebase_index_n_search/` exists, run `status` or `stale`; refresh or rebuild the index before relying on it when it is stale, invalid, or reports changed skip rules.

If `Codebase Index N Search` is not available, continue with the deterministic cartographer scanner and note that compact indexed source lookup is unavailable.

From the target repository root, resolve this skill's folder as `<skill-root>`, then materialise the bundled visualiser into the repo-local cartographer output folder:

```powershell
python <skill-root>\scripts\materialise_visualiser.py
```

The visualiser must be copied literally from the bundled `assets/visualiser/` snapshot. Do not recreate, rewrite, scaffold, simplify, or infer the visualiser code. Use the materialisation script to copy the asset tree and verify it against `assets/visualiser_manifest.json`.

Then let the skill detect workspace structure and create the editable config:

```powershell
python <skill-root>\scripts\workspace_config.py
```

Codex should inspect `.repo_executive_context/codebase_cartographer/workspace_profile.json`, then edit `.repo_executive_context/codebase_cartographer/cartographer_config.json` when the repo shape needs explicit control. Use this config to declare whether the target is a single repo, a workspace containing multiple sub-repos/services, which roots should become service suns, and any known service-to-service links.

Then run the full deterministic pipeline:

```powershell
python <skill-root>\scripts\run_cartographer.py
```

The runner writes or reuses the workspace config, then hashes supported source files and the cartographer config. If nothing changed since the last run, it skips graph rebuild and writes an empty delta queue. If source or config changed, it rebuilds deterministic graph truth, preserves existing agentic summaries for unchanged nodes/edges, and writes only changed items to `agentic_delta_queue.json`.

After the first deterministic graph exists for a target repository, always create semantic node summary enrichment for the canonical graph with `scripts/semantic_node_summaries.py`. If the script's default `GRAPH_PATH` does not match the canonical graph location, set the script module variables before calling `main()` so it reads and writes `.repo_executive_context/codebase_cartographer/graph.json`.

The default output is:

```text
.repo_executive_context/codebase_cartographer/
  graph.json
  graph.sqlite
  graph_validation_report.md
  workspace_profile.json
  cartographer_config.json
  agentic_summary_queue.json
  agentic_delta_queue.json
  semantic_node_context.json
  semantic_node_summaries.json
  source_manifest.json
  visualiser/
    index.html
    package.json
    package-lock.json
    src/
    public/
      assets/
      codebase_cartographer/
        graph.json
        traces/
  obsidian_vault/
    Codebase Overview.canvas
    FE Perspective.canvas
    API Perspective.canvas
    Data Perspective.canvas
    Workflow Perspective.canvas
    nodes/
```

The runner copies `graph.json` to `.repo_executive_context/codebase_cartographer/visualiser/public/codebase_cartographer/` when the materialised visualiser exists. It still supports the legacy repo-level `visualiser/public/codebase_cartographer/` path for this development repository.

## Optional Collaboration

Use `Codebase Index N Search` as the preferred supporting source index when the skill is available. Keep Codebase Cartographer's canonical outputs in `.repo_executive_context/codebase_cartographer/`.

If the supporting skill is available but `.repo_executive_context/codebase_index_n_search/` is absent, run the supporting skill's index build first. If the folder exists, run `status` or `stale` before relying on it, and refresh changed files when needed.

Do not make `Codebase Index N Search` responsible for graph topology, visualiser contracts, Obsidian output, or agentic summaries.

## Workflow

1. Check whether `Codebase Index N Search` is available and whether `.repo_executive_context/codebase_index_n_search/` exists; build, refresh, or validate that supporting index first when possible.
2. Run `scripts/materialise_visualiser.py` to copy the bundled visualiser literally into `.repo_executive_context/codebase_cartographer/visualiser/`.
3. Run `scripts/workspace_config.py` or let `scripts/run_cartographer.py` create the first config.
4. Inspect `workspace_profile.json` and adjust `cartographer_config.json` when the folder contains multiple sub-repos/services or known topology.
5. Run `scripts/run_cartographer.py`.
6. Inspect `graph_validation_report.md` for deterministic, partial, unknown, and inferred facts.
7. Run `scripts/semantic_node_summaries.py` to create or refresh semantic node summary enrichment for the canonical graph.
8. Run `scripts/verify_visualiser_snapshot.py` if visualiser drift is suspected.
9. From `.repo_executive_context/codebase_cartographer/visualiser/`, run `npm install` if dependencies are missing, then `npm run dev` to open the local browser visualiser.
10. After source or config changes, re-run the deterministic pipeline, inspect `agentic_delta_queue.json`, and refresh semantic summaries for new or changed nodes while preserving unchanged fingerprint-matched summaries.

## Semantic Node Summary Enrichment

Semantic summaries are required local explanations after initial graph generation. They must never become graph truth.

Use this workflow on initial skill activation after the canonical graph exists, and again after source or config changes:

1. Run or verify `Codebase Index N Search` first with `status` or `stale`.
2. Use graph node details, edges, contracts, evidence, and validation as the first evidence source.
3. Use Codebase Index N Search compact queries such as `outline`, `symbol`, `deps`, `search`, or `snapshot` before reading source.
4. Read narrow source slices only when the graph and compact index evidence are insufficient.
5. Write concise semantic wording to `summary.agentic`, optional expandable explanation points to `summary.agentic_points`, and set `summary.agentic_status`.
6. Apply generated summaries only when both `node_id` and `fingerprint` match.
7. When code changes, use `agentic_delta_queue.json` to identify new and changed nodes, update only those semantic summaries, and preserve unchanged summaries whose fingerprints still match.

Semantic wording must explain what the node does in the product or system, not merely what it is in the graph. Start from route handlers, function names, class/schema names, imports, calls, code excerpts, file paths, service child files, contracts, and validation evidence. Use that evidence to state the node's responsibility, capability, workflow role, and important downstream work.

Avoid inventory-style primary summaries such as "represents a service boundary", "collects an artifact", "contains N functions", or "groups mapped files" unless there is no stronger evidence. Counts and child names may appear only as supporting evidence after the role is explained. For services, describe the runtime surface and capability it owns, such as authentication, API orchestration, React UI, inventory flows, blob access, or reporting. For files, describe the module's responsibility and how its routes/functions/schemas contribute. For API nodes, describe the user or system action handled, request identity/context evidence, downstream calls, and returned effect when visible from source.

Use `scripts/semantic_node_summaries.py` to:
- add deterministic, truncated `details.code_excerpt` snippets from source line ranges
- generate compact local context and summary artifacts
- apply semantic summaries into the selected graph artifact by fingerprint

The default semantic summary artifacts are:

```text
.repo_executive_context/codebase_cartographer/
  semantic_node_context.json
  semantic_node_summaries.json
```

Rules:
- keep excerpts short and deterministic
- do not store long raw source by default
- keep `summary.agentic` short enough for hover overlays and place richer responsibility lists in `summary.agentic_points`
- make `summary.agentic_points` role/capability/evidence bullets, not graph-count bullets
- do not change nodes, edges, contracts, source references, or validation status from Codex interpretation
- use `unknown`, `partial`, `not_declared`, or `inferred_from_usage` when source truth is missing

## Semantic Service Link Enrichment

Use this workflow when a workspace has multiple deployable services that are wired together through runtime, infrastructure, API, queue, storage, or orchestration configuration rather than simple source imports.

1. Run or verify `Codebase Index N Search` first with `status` or `stale`.
2. Start from deterministic service roots, API routes, API clients, settings/config files, environment variable names, Docker/deployment files, queue names, blob/container names, and workflow handoff points.
3. Use compact `outline`, `symbol`, `deps`, `search`, and `regex` queries before reading source.
4. Read narrow source or config slices only when compact graph/index evidence is insufficient.
5. Add service-to-service links only when there is evidence that one service calls, orchestrates, dispatches to, configures, reads outputs from, publishes to, subscribes to, or otherwise depends on another service.
6. Write accepted links into `.repo_executive_context/codebase_cartographer/cartographer_config.json` under `service_links`, then re-run `scripts/run_cartographer.py`.

Preferred `service_links` shape:

```json
{
  "source_path": "service-a",
  "target_path": "service-b",
  "kind": "connects_service",
  "relationship_type": "orchestrates",
  "status": "partial",
  "confidence": 0.86,
  "reason": "`service-a` orchestrates `service-b` through runtime configuration and matching API workflow evidence.",
  "evidence": [
    {
      "kind": "config",
      "file": "service-a/settings.py",
      "line_start": 12,
      "line_end": 18,
      "detail": "settings declare the downstream service endpoint"
    }
  ]
}
```

Rules:
- Do not create service links from folder order, label shape, naming style, or prior chat memory alone.
- Prefer `kind: "connects_service"` for service-to-service topology so the visualiser can render the relationship prominently; put the more precise relationship in `relationship_type`.
- Use `status: "complete"` only for direct source/config proof. Use `status: "partial"` when Codex is connecting multiple evidence points semantically.
- Keep every link auditable with a concise `reason`, numeric `confidence`, and evidence records. If evidence is weak, do not add the link.
- Keep parser-proven API calls/imports as deterministic source relationships; use `service_links` only for workspace-level relationships between deployable services.

## Script Roles

- `scan_repo.py`: find supported source files and skip generated/sensitive folders.
- `workspace_config.py`: detect repo/workspace shape and create the editable cartographer config.
- `extract_python_api_contracts.py`: parse Python AST, FastAPI routes, Pydantic/dataclass/TypedDict schemas, functions, classes, imports, and calls.
- `extract_typescript_contracts.py`: parse TypeScript/TSX/CSS structure, React components, hooks, types/interfaces, CSS selectors, imports, simple API clients, and visible calls.
- `build_graph.py`: merge extractor output into canonical `graph.json` and `graph.sqlite`.
- `generate_obsidian_notes.py`: write file-backed markdown notes for graph nodes.
- `generate_json_canvas.py`: write stable JSON Canvas perspective files.
- `materialise_visualiser.py`: copy the bundled visualiser snapshot literally into `.repo_executive_context/codebase_cartographer/visualiser/` and verify bundled file hashes.
- `verify_visualiser_snapshot.py`: verify the materialised visualiser still matches the bundled manifest.
- `semantic_node_summaries.py`: add deterministic code excerpts and fingerprint-checked semantic summaries for graph nodes.
- `validate_graph.py`: validate IDs, edges, counts, evidence, and contract statuses.
- `run_cartographer.py`: orchestrate the full deterministic run.

## References

Load only the reference needed for the task:

- `references/graph_schema.md`: canonical graph fields.
- `references/deterministic_contract_rules.md`: status vocabulary and allowed evidence.
- `references/obsidian_canvas_rules.md`: JSON Canvas output rules.

## Workspace Shape Controls

Use `.repo_executive_context/codebase_cartographer/cartographer_config.json` as the explicit control surface between Codex's repo-shape judgment and deterministic graph generation.

Important fields:
- `workspace_mode`: `single_repo` or `workspace`.
- `service_roots`: roots that should become large service/repo suns in the visualiser.
- `service_links`: known service-to-service connections. These are config-declared relationships unless source extraction later proves them.

Rules:
- Do not hardcode one naming convention as universal truth.
- Let deterministic detection propose likely roots from markers such as `.git`, `package.json`, `pyproject.toml`, `requirements.txt`, `Dockerfile`, `src`, or `app`.
- Let Codex edit the config when the user intent or repo shape is clearer than marker detection.
- The graph builder must record config-derived service roots and links with `workspace_config` evidence.
- Keep API contracts, function ownership, calls, imports, and source line relationships parser-derived; do not move those into config.

## Visualiser Expectations

The visualiser source of truth is the bundled `assets/visualiser/` tree plus `assets/visualiser_manifest.json`.

Rules:
- Copy the visualiser with `scripts/materialise_visualiser.py`; do not manually recreate it.
- Keep bundled visualiser source files byte-identical during materialisation.
- Do not bundle or copy `node_modules`, `dist`, generated `graph.json`, generated trace JSON, logs, or caches as visualiser source.
- Let graph and trace generators populate `public/codebase_cartographer/` inside the materialised visualiser.
- Run the browser app from `.repo_executive_context/codebase_cartographer/visualiser/`.

The local browser visualiser should:
- use a black background and bright color-coded node kinds
- support start-node selection and type filters
- bring the selected node into the foreground
- render connected layers smaller and dimmer toward the background
- support one-step back and return-to-start navigation
- show node details, source evidence, deterministic contracts, and connection reasons in a modal
- show agentic summaries only when separate enrichment data exists

## Safety

Keep generated artifacts local. Graph data can expose private architecture through file paths, symbol names, routes, and contracts. Do not transmit or publish generated outputs without Human review.
