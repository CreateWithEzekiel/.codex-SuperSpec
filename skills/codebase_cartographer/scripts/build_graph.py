from __future__ import annotations

from collections import Counter
from pathlib import Path

from cartographer_common import (
    SCHEMA_VERSION,
    attach_fingerprints,
    add_unique_edge,
    add_unique_node,
    copy_graph_for_visualiser,
    file_type_profile,
    make_contract,
    make_edge,
    make_evidence,
    make_node,
    now_iso,
    stable_id,
    write_graph_sqlite,
    write_json,
)
from extract_python_api_contracts import extract_python_graph
from extract_sql_contracts import add_sql_usage_edges, extract_sql_graph
from extract_typescript_contracts import extract_typescript_graph
from semantic_node_summaries import attach_code_excerpts_to_nodes
from scan_repo import scan_repo
from workspace_config import CARTOGRAPHER_CONFIG_PATH, ensure_cartographer_config


# ============================================================
# CONFIG
# ============================================================

REPO_ROOT = str(Path.cwd())
OUTPUT_ROOT = ".repo_executive_context/codebase_cartographer"
REACT_SERVICE_COLOR = "#35d3ff"


# ============================================================
# SERVICE NODES
# ============================================================

def record_belongs_to_service(record: dict, service_root: dict) -> bool:
    rel_path = service_root.get("path") or "."
    if rel_path == ".":
        return True
    record_path = record["rel_path"]
    return record_path == rel_path or record_path.startswith(rel_path + "/")


def service_file_profile(service_root: dict, records: list[dict]) -> dict:
    language_counts = Counter(record["language"] for record in records if record_belongs_to_service(record, service_root))
    return file_type_profile(language_counts)


def make_service_node(service_root: dict, repo_root: Path, records: list[dict]) -> dict:
    rel_path = service_root.get("path") or "."
    label = service_root.get("label") or (repo_root.name if rel_path == "." else Path(rel_path).name)
    index = service_root.get("service_index")
    role = service_root.get("role") or ("main_repo" if rel_path == "." else "service")
    status = service_root.get("status") or "complete"
    source = service_root.get("source") or "cartographer_config"
    identity_path = repo_root.name if rel_path == "." else rel_path
    profile = service_file_profile(service_root, records)
    metadata = {
        "service_index": index,
        "service_role": role,
        "directory": rel_path,
        "workspace_mode": service_root.get("workspace_mode"),
        "config_source": source,
        "config_evidence": service_root.get("evidence", []),
        "supported_file_count": profile["supported_file_count"],
        "language_counts": profile["language_counts"],
        "file_type_counts": profile["file_type_counts"],
        "majority_file_type": profile["majority_file_type"],
    }
    node = make_node(
        stable_id("service", identity_path),
        "service",
        label,
        "service",
        rel_path,
        None,
        None,
        status,
        f"Codebase workspace root `{label}` mapped from cartographer workspace configuration.",
        [make_evidence("workspace_config", CARTOGRAPHER_CONFIG_PATH, None, None, f"service root `{rel_path}` from {source}")],
        None,
        ["service", role, profile["majority_file_type"]],
        metadata,
        {"service": metadata},
    )
    if profile["majority_file_type"] == "react":
        node["color"] = REACT_SERVICE_COLOR
    return node


def service_roots(cartographer_config: dict) -> list[dict]:
    roots = cartographer_config.get("service_roots") or []
    workspace_mode = cartographer_config.get("workspace_mode") or "single_repo"
    normalized = []
    for item in roots:
        service_root = dict(item)
        service_root["workspace_mode"] = workspace_mode
        normalized.append(service_root)
    return normalized


def add_service_nodes(repo_root: Path, records: list[dict], nodes: dict[str, dict], warnings: list[str], cartographer_config: dict) -> None:
    for service_root in service_roots(cartographer_config):
        add_unique_node(nodes, make_service_node(service_root, repo_root, records), warnings)


def service_for_file(file_path: str, service_nodes: list[dict]) -> dict | None:
    fallback = None
    candidates = sorted(service_nodes, key=lambda node: len(node["metadata"].get("directory") or ""), reverse=True)
    for service in candidates:
        directory = service["metadata"].get("directory") or "."
        if directory == ".":
            fallback = service
            continue
        if file_path == directory or file_path.startswith(directory + "/"):
            return service
    return fallback


def optional_int(value: object) -> int | None:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


def configured_service_link_evidence(link: dict, source: dict, target: dict) -> list[dict]:
    evidence = [
        make_evidence("workspace_config", CARTOGRAPHER_CONFIG_PATH, None, None, f"service link `{source['file']}` -> `{target['file']}`"),
    ]
    for item in link.get("evidence") or []:
        if isinstance(item, dict):
            evidence.append(make_evidence(
                str(item.get("kind") or "semantic_service_link"),
                str(item.get("file") or item.get("path") or CARTOGRAPHER_CONFIG_PATH),
                optional_int(item.get("line_start")),
                optional_int(item.get("line_end")),
                str(item.get("detail") or item.get("reason") or "service relationship evidence"),
            ))
        elif str(item).strip():
            evidence.append(make_evidence("semantic_service_link", CARTOGRAPHER_CONFIG_PATH, None, None, str(item).strip()))
    return evidence


def add_configured_service_links(service_nodes: list[dict], edges: dict[str, dict], cartographer_config: dict) -> None:
    service_by_directory = {node["metadata"].get("directory"): node for node in service_nodes}
    for link in cartographer_config.get("service_links") or []:
        source = service_by_directory.get(link.get("source_path"))
        target = service_by_directory.get(link.get("target_path"))
        if not source or not target or source["id"] == target["id"]:
            continue
        edge = make_edge(
            source["id"],
            target["id"],
            link.get("kind") or "connects_service",
            link.get("reason") or f"`{source['label']}` has a declared service relationship with `{target['label']}` from cartographer workspace configuration.",
            configured_service_link_evidence(link, source, target),
            link.get("status") or "partial",
        )
        metadata = {
            "source": link.get("source") or "cartographer_config",
            "relationship_type": link.get("relationship_type"),
            "confidence": link.get("confidence"),
            "config_evidence": link.get("evidence", []),
        }
        edge["metadata"] = {key: value for key, value in metadata.items() if value not in (None, "", [])}
        add_unique_edge(
            edges,
            edge,
        )


def add_service_edges(nodes: dict[str, dict], edges: dict[str, dict], cartographer_config: dict) -> None:
    service_nodes = [node for node in nodes.values() if node["kind"] == "service"]
    add_configured_service_links(service_nodes, edges, cartographer_config)
    for node in list(nodes.values()):
        if node["kind"] != "file":
            continue
        service = service_for_file(node["file"], service_nodes)
        if not service:
            continue
        add_unique_edge(
            edges,
            make_edge(
                service["id"],
                node["id"],
                "contains_file",
                f"`{service['label']}` contains source file `{node['file']}`",
                [make_evidence("workspace_config", CARTOGRAPHER_CONFIG_PATH, None, None, f"file belongs to configured service root `{service['file']}`")],
            ),
        )


# ============================================================
# FILE NODES
# ============================================================

def make_file_node(record: dict) -> dict:
    rel_path = record["rel_path"]
    language = record["language"]
    node_id = stable_id("file", rel_path)
    contracts = {
        "request": make_contract("not_declared"),
        "response": make_contract("not_declared"),
    }
    return make_node(
        node_id,
        "file",
        Path(rel_path).name,
        language,
        rel_path,
        1 if record["line_count"] else None,
        record["line_count"] or None,
        "complete",
        f"{language} source file `{rel_path}` with {record['line_count']} lines.",
        [make_evidence("repo_scan", rel_path, 1 if record["line_count"] else None, record["line_count"] or None, "supported source file")],
        contracts,
        ["file", language],
        {
            "sha1": record["sha1"],
            "extension": record["extension"],
            "line_count": record["line_count"],
        },
        {
            "file": {
                "extension": record["extension"],
                "line_count": record["line_count"],
                "sha1": record["sha1"],
            },
        },
    )


def add_file_nodes(records: list[dict], nodes: dict[str, dict], warnings: list[str]) -> None:
    for record in records:
        add_unique_node(nodes, make_file_node(record), warnings)


def add_contains_edges(nodes: dict[str, dict], edges: dict[str, dict]) -> None:
    for node in list(nodes.values()):
        if node["kind"] == "file":
            continue
        parent_id = node.get("metadata", {}).get("parent_id")
        if not parent_id or parent_id not in nodes or parent_id == node["id"]:
            parent_id = stable_id("file", node["file"])
        if parent_id not in nodes:
            continue
        parent = nodes[parent_id]
        add_unique_edge(
            edges,
            make_edge(
                parent_id,
                node["id"],
                "contains",
                f"`{parent['label']}` contains `{node['label']}`",
                [make_evidence("source_range", node["file"], node["line_start"], node["line_end"], f"contains {node['kind']}")],
            ),
        )
        if node["kind"] in {"api_endpoint", "websocket_endpoint"}:
            file_id = stable_id("file", node["file"])
            if file_id in nodes:
                add_unique_edge(
                    edges,
                    make_edge(
                        file_id,
                        node["id"],
                        "declares_api",
                        f"`{node['file']}` declares API endpoint `{node['label']}`",
                        [make_evidence("fastapi_decorator", node["file"], node["line_start"], node["line_start"], "route decorator belongs to this source file")],
                    ),
                )


# ============================================================
# CROSS-LAYER EDGES
# ============================================================

def normalise_api_path(path: str) -> str:
    if not path.startswith("/"):
        path = "/" + path
    return path.rstrip("/") or "/"


def path_matches(client_path: str, api_path: str) -> bool:
    client = normalise_api_path(client_path)
    api = normalise_api_path(api_path)
    return client == api or client.endswith(api) or api.endswith(client)


def add_frontend_api_edges(nodes: dict[str, dict], edges: dict[str, dict]) -> None:
    api_nodes = [node for node in nodes.values() if node["kind"] == "api_endpoint"]
    client_nodes = [node for node in nodes.values() if node["metadata"].get("api_call_paths")]
    for client_node in client_nodes:
        for client_path in client_node["metadata"].get("api_call_paths", []):
            for api_node in api_nodes:
                api_path = api_node["metadata"].get("path", "")
                if not path_matches(client_path, api_path):
                    continue
                add_unique_edge(
                    edges,
                    make_edge(
                        client_node["id"],
                        api_node["id"],
                        "calls_api",
                        f"`{client_node['label']}` calls API path `{client_path}`, matching `{api_node['label']}`",
                        [make_evidence("api_path_literal", client_node["file"], client_node["line_start"], client_node["line_end"], f"literal API path {client_path}")],
                        "inferred_from_usage",
                    ),
                )


# ============================================================
# PERSPECTIVES
# ============================================================

def perspective_node_ids(nodes: list[dict], kinds: set[str], languages: set[str] | None = None) -> list[str]:
    selected = []
    for node in nodes:
        if node["kind"] not in kinds:
            continue
        if languages and node["language"] not in languages:
            continue
        selected.append(node["id"])
    return sorted(selected)


def perspective_edge_ids(edges: list[dict], node_ids: list[str]) -> list[str]:
    node_id_set = set(node_ids)
    return sorted(edge["id"] for edge in edges if edge["source"] in node_id_set and edge["target"] in node_id_set)


def build_perspectives(nodes: list[dict], edges: list[dict]) -> dict:
    overview_nodes = sorted(node["id"] for node in nodes if node["kind"] not in {"style", "style_rule"} or len(nodes) < 500)
    service_nodes = perspective_node_ids(nodes, {"service", "file", "api_endpoint", "websocket_endpoint", "function", "method", "constructor", "schema", "model", "dataclass", "pydantic_model", "typed_dict", "class"}, {"service", "python"})
    frontend_nodes = perspective_node_ids(nodes, {"file", "component", "hook", "context", "provider", "page", "layout", "form", "store", "reducer", "api_client", "function", "interface", "type_alias", "enum", "schema", "style", "style_rule", "media_query", "keyframes", "html_document", "template", "html_element"}, {"typescript", "tsx", "javascript", "jsx", "css", "html"})
    api_nodes = perspective_node_ids(nodes, {"service", "file", "api_endpoint", "websocket_endpoint", "api_client", "function", "method", "schema", "model", "dataclass", "pydantic_model", "typed_dict", "class"}, {"service", "python", "typescript", "tsx", "javascript", "jsx"})
    data_nodes = perspective_node_ids(nodes, {"schema", "model", "dataclass", "pydantic_model", "typed_dict", "interface", "type_alias", "enum", "class", "table", "view", "materialized_view", "migration", "stored_procedure", "sql_function", "trigger", "index", "constraint"})
    workflow_node_set = set()
    for edge in edges:
        if edge["kind"] in {"connects_service", "contains_file", "declares_api", "calls_api", "handled_by", "calls", "uses_schema", "uses_style", "uses_table"}:
            workflow_node_set.add(edge["source"])
            workflow_node_set.add(edge["target"])
    workflow_nodes = sorted(workflow_node_set)
    return {
        "overview": {
            "title": "Codebase Overview",
            "node_ids": overview_nodes,
            "edge_ids": perspective_edge_ids(edges, overview_nodes),
        },
        "frontend": {
            "title": "FE Perspective",
            "node_ids": frontend_nodes,
            "edge_ids": perspective_edge_ids(edges, frontend_nodes),
        },
        "services": {
            "title": "Service Perspective",
            "node_ids": service_nodes,
            "edge_ids": perspective_edge_ids(edges, service_nodes),
        },
        "api": {
            "title": "API Perspective",
            "node_ids": api_nodes,
            "edge_ids": perspective_edge_ids(edges, api_nodes),
        },
        "data": {
            "title": "Data Perspective",
            "node_ids": data_nodes,
            "edge_ids": perspective_edge_ids(edges, data_nodes),
        },
        "workflow": {
            "title": "Workflow Perspective",
            "node_ids": workflow_nodes,
            "edge_ids": perspective_edge_ids(edges, workflow_nodes),
        },
    }


# ============================================================
# NODE DETAILS
# ============================================================

def enrich_node_details(nodes: list[dict], edges: list[dict]) -> None:
    nodes_by_id = {node["id"]: node for node in nodes}
    incoming: dict[str, list[dict]] = {node["id"]: [] for node in nodes}
    outgoing: dict[str, list[dict]] = {node["id"]: [] for node in nodes}
    children: dict[str, list[dict]] = {node["id"]: [] for node in nodes}
    for edge in edges:
        source = nodes_by_id.get(edge["source"])
        target = nodes_by_id.get(edge["target"])
        if not source or not target:
            continue
        outgoing[source["id"]].append({"edge": edge["kind"], "target": target["label"], "target_kind": target["kind"], "target_id": target["id"]})
        incoming[target["id"]].append({"edge": edge["kind"], "source": source["label"], "source_kind": source["kind"], "source_id": source["id"]})
        if edge["kind"] in {"contains", "contains_file", "declares_api"}:
            children[source["id"]].append({"id": target["id"], "label": target["label"], "kind": target["kind"]})
    for node in nodes:
        details = dict(node.get("details") or {})
        details.setdefault("overview", {})
        details["overview"].update(
            {
                "kind": node["kind"],
                "language": node["language"],
                "file": node["file"],
                "line_start": node["line_start"],
                "line_end": node["line_end"],
                "status": node["deterministic_status"],
            }
        )
        details["connections"] = {
            "incoming": incoming.get(node["id"], []),
            "outgoing": outgoing.get(node["id"], []),
            "children": children.get(node["id"], []),
            "incoming_count": len(incoming.get(node["id"], [])),
            "outgoing_count": len(outgoing.get(node["id"], [])),
            "child_count": len(children.get(node["id"], [])),
        }
        node["details"] = details


# ============================================================
# SUMMARY
# ============================================================

def build_summary(records: list[dict], nodes: list[dict], edges: list[dict]) -> dict:
    node_counts = Counter(node["kind"] for node in nodes)
    edge_counts = Counter(edge["kind"] for edge in edges)
    language_counts = Counter(record["language"] for record in records)
    api_count = node_counts.get("api_endpoint", 0)
    component_count = node_counts.get("component", 0)
    schema_count = sum(node_counts.get(kind, 0) for kind in ["schema", "model", "dataclass", "pydantic_model", "typed_dict", "interface", "type_alias"])
    service_count = node_counts.get("service", 0)
    deterministic_text = (
        f"Scanned {len(records)} supported files. "
        f"Found {len(nodes)} nodes and {len(edges)} edges, including "
        f"{service_count} services, {api_count} API endpoints, {component_count} React components, and {schema_count} data/schema declarations."
    )
    return {
        "deterministic": deterministic_text,
        "counts": {
            "files": len(records),
            "nodes": dict(sorted(node_counts.items())),
            "edges": dict(sorted(edge_counts.items())),
            "languages": dict(sorted(language_counts.items())),
        },
        "agentic": None,
        "agentic_status": "not_enriched",
    }


# ============================================================
# BUILD
# ============================================================

def build_graph(repo_root: str | Path = REPO_ROOT, records: list[dict] | None = None, cartographer_config: dict | None = None) -> dict:
    root = Path(repo_root).resolve()
    if records is None:
        records = scan_repo(root)
    if cartographer_config is None:
        _, cartographer_config = ensure_cartographer_config(root)
    warnings = []
    nodes = {}
    edges = {}
    add_service_nodes(root, records, nodes, warnings, cartographer_config)
    add_file_nodes(records, nodes, warnings)
    python_result = extract_python_graph(records)
    typescript_result = extract_typescript_graph(records)
    sql_result = extract_sql_graph(records)
    warnings.extend(typescript_result.get("warnings", []))
    warnings.extend(sql_result.get("warnings", []))
    for result in [python_result, typescript_result, sql_result]:
        for node in result["nodes"]:
            add_unique_node(nodes, node, warnings)
        for edge in result["edges"]:
            add_unique_edge(edges, edge)
    add_contains_edges(nodes, edges)
    add_service_edges(nodes, edges, cartographer_config)
    add_frontend_api_edges(nodes, edges)
    add_sql_usage_edges(records, nodes, edges)
    sorted_nodes = sorted(nodes.values(), key=lambda node: (node["kind"], node["file"], node["line_start"] or 0, node["id"]))
    sorted_edges = sorted(edges.values(), key=lambda edge: (edge["kind"], edge["source"], edge["target"], edge["id"]))
    enrich_node_details(sorted_nodes, sorted_edges)
    attach_code_excerpts_to_nodes(sorted_nodes, root)
    attach_fingerprints(sorted_nodes, sorted_edges)
    graph = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": now_iso(),
        "repo": {
            "name": root.name,
            "root": str(root),
        },
        "workspace": {
            "mode": cartographer_config.get("workspace_mode", "single_repo"),
            "config": CARTOGRAPHER_CONFIG_PATH,
            "service_roots": cartographer_config.get("service_roots", []),
            "service_links": cartographer_config.get("service_links", []),
        },
        "summary": build_summary(records, sorted_nodes, sorted_edges),
        "nodes": sorted_nodes,
        "edges": sorted_edges,
        "perspectives": build_perspectives(sorted_nodes, sorted_edges),
        "validation": {
            "status": "unknown",
            "warnings": warnings,
            "counts": {},
        },
    }
    return graph


def write_graph_outputs(graph: dict, repo_root: str | Path = REPO_ROOT, output_root: str | Path = OUTPUT_ROOT) -> dict:
    root = Path(repo_root).resolve()
    output_path = root / output_root
    output_path.mkdir(parents=True, exist_ok=True)
    graph_path = output_path / "graph.json"
    sqlite_path = output_path / "graph.sqlite"
    write_json(graph_path, graph)
    sqlite_written = write_graph_sqlite(sqlite_path, graph)
    copied_to = copy_graph_for_visualiser(graph_path, root)
    return {
        "graph_path": graph_path,
        "sqlite_path": sqlite_path,
        "sqlite_written": sqlite_written,
        "visualiser_graph_path": copied_to,
    }


def main() -> dict:
    graph = build_graph(REPO_ROOT)
    outputs = write_graph_outputs(graph, REPO_ROOT, OUTPUT_ROOT)
    print(f"graph nodes: {len(graph['nodes'])}")
    print(f"graph edges: {len(graph['edges'])}")
    print(f"graph json: {outputs['graph_path']}")
    print(f"graph sqlite: {outputs['sqlite_path']} ({'written' if outputs['sqlite_written'] else 'unavailable'})")
    if outputs["visualiser_graph_path"]:
        print(f"visualiser graph: {outputs['visualiser_graph_path']}")
    return graph


if __name__ == "__main__":
    main()
