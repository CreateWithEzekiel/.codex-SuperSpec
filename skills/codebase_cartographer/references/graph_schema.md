# Graph Schema

`graph.json` is the canonical deterministic artifact.

## Top Level

```json
{
  "schema_version": "0.2.0",
  "generated_at": "ISO-8601 timestamp",
  "repo": {},
  "workspace": {},
  "summary": {},
  "nodes": [],
  "edges": [],
  "perspectives": {},
  "validation": {}
}
```

## Node

Required fields:

- `id`: stable deterministic ID.
- `kind`: approved declaration-level node kind. Core groups are workspace/file (`workspace`, `service`, `package`, `module`, `file`, `config_file`), API/runtime (`api_endpoint`, `api_client`, `route`, `websocket_endpoint`, `background_task`, `cli_command`), code declarations (`function`, `method`, `constructor`, `class`, `exception`, `decorator`), data/contracts (`schema`, `model`, `dataclass`, `pydantic_model`, `typed_dict`, `interface`, `type_alias`, `enum`), React/Web (`component`, `hook`, `context`, `provider`, `page`, `layout`, `form`, `store`, `reducer`), CSS/HTML (`style`, `style_rule`, `media_query`, `container_query`, `supports_rule`, `keyframes`, `font_face`, `css_layer`, `css_at_rule`, `html_document`, `template`, `html_element`), and SQL (`database_schema`, `table`, `view`, `materialized_view`, `migration`, `stored_procedure`, `sql_function`, `trigger`, `index`, `constraint`).
- `label`: short display label.
- `language`: `python`, `typescript`, `tsx`, `javascript`, `jsx`, `css`, `html`, `sql`, `json`, `yaml`, `toml`, `dockerfile`, `markdown`, `env`, or `unknown`.
- `file`: repo-relative path.
- `line_start` and `line_end`: source line range when available.
- `deterministic_status`: `complete`, `partial`, `unknown`, `not_declared`, or `inferred_from_usage`.
- `summary`: deterministic and optional agentic summary object.
- `contracts`: request/response object with status and shape.
- `evidence`: list of source evidence records.
- `details`: node-kind-aware deterministic detail payload. Use precise section names such as `interface`, `fields`, `react`, `style`, `html`, `sql`, `config`, `connections`, `request`, or `response`.

Optional semantic and excerpt fields:

- `summary.agentic`: Codex-written semantic explanation for human reading. It is not graph truth and must not be used to create nodes, edges, contracts, source references, or validation status.
- `summary.agentic_status`: `not_enriched`, `complete`, or another explicit enrichment lifecycle value.
- `summary.agentic_points`: optional Codex-written semantic breakdown bullets for expandable UI display. Each point should explain one responsibility, behavior, or system role; do not use these points as graph truth.
- `details.code_excerpt`: deterministic, truncated source excerpt for explanation support. Shape:

```json
{
  "text": "short source excerpt",
  "language": "python",
  "file": "repo-relative path",
  "line_start": 1,
  "line_end": 12,
  "omitted_lines": 0,
  "truncation": "none|middle_omitted",
  "source": "deterministic_source_slice"
}
```

Code excerpts should be compact and locally generated from source line ranges. Do not store long raw source snippets by default.

## Edge

Required fields:

- `id`: stable deterministic edge ID.
- `source`: source node ID.
- `target`: target node ID.
- `kind`: relationship type such as `contains_file`, `contains`, `imports`, `calls`, `renders`, `uses_schema`, `uses_style`, `uses_table`, `handled_by`, `declares_api`, `connects_service`, or `calls_api`.
- `reason`: deterministic and optional agentic reason object.
- `deterministic_status`: status vocabulary value.
- `evidence`: list of source evidence records.

Optional service-link metadata:

```json
{
  "metadata": {
    "source": "cartographer_config|semantic_service_link",
    "confidence": 0.86,
    "relationship_type": "orchestrates",
    "config_evidence": []
  }
}
```

Use edge metadata for explanation and UI hints only. Do not make metadata the sole proof for parser-derived relationships.

## Contract Shape

Use:

```json
{
  "status": "complete",
  "shape": {},
  "source": "annotation|decorator|schema|usage|none",
  "evidence": []
}
```

Never replace missing contracts with invented values.

## Ask & Trace Shape

Trace plans are separate artifacts under:

```text
.repo_executive_context/codebase_cartographer/traces/<trace_id>.json
```

Trace plans do not mutate graph topology. They contain ordered steps with `node_id`, optional `edge_id`, `phase`, `direction`, `packet_label`, `delay_ms`, `confidence`, and evidence. Confidence values are `deterministic`, `source_backed`, `inferred_from_usage`, or `needs_confirmation`.

## Workspace Shape

`workspace` records the cartographer config that shaped top-level service/repo suns:

```json
{
  "mode": "single_repo|workspace",
  "config": ".repo_executive_context/codebase_cartographer/cartographer_config.json",
  "service_roots": [],
  "service_links": []
}
```

Service roots and service links may come from deterministic marker detection or from Codex/user-edited config. They must be recorded with `workspace_config` evidence so they remain separate from parser-proven source relationships.

Preferred `service_links` entries use:

```json
{
  "source_path": "service-a",
  "target_path": "service-b",
  "kind": "connects_service",
  "relationship_type": "orchestrates",
  "status": "partial",
  "confidence": 0.86,
  "reason": "Evidence-backed explanation of why this service relationship exists.",
  "evidence": [
    {
      "kind": "config",
      "file": "service-a/settings.py",
      "line_start": 12,
      "line_end": 18,
      "detail": "downstream endpoint setting"
    }
  ]
}
```

Do not create service links from folder order, label shape, naming style, or prior chat memory alone.
