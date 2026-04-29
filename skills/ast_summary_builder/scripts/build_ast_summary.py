\
from __future__ import annotations

# ============================================================
# LOCAL AST SUMMARY TESTER V4
# ============================================================
# Purpose:
# - Scan one file or a repo
# - Build concise structural + heuristic semantic summaries
# - Avoid file-specific hardcoded summary outputs
# - Use generic structural patterns plus library-aware detectors
#
# Supported source types:
# - .py
# - .ts
# - .tsx
# - .js
# - .jsx
# - .html
# - .css
#
# Output behavior:
# - single mode: writes next to the source file
# - repo mode: writes to .repo_executive_context/ast_summaries/
#
# Notes:
# - No third-party dependencies
# - No argparse
# - Uses Python stdlib only
# ============================================================

import ast
import fnmatch
import hashlib
import html.parser
import json
import os
import re
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

MODE = "single"  # "single" or "repo"
INPUT_FILE = r""
REPO_ROOT = r""
MAX_FILES = 50
FORCE_REBUILD = False
WRITE_JSON_FACTS = False
PRINT_PROGRESS = True

SUPPORTED_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".html", ".css"}

EXCLUDED_DIR_NAMES = {
    ".git", ".hg", ".svn", ".venv", "venv", "__pycache__", "node_modules",
    "dist", "build", ".next", "coverage", ".repo_executive_context",
}

EXCLUDED_FILE_PATTERNS = {"*.min.js", "*.bundle.js", "*.map"}

PATH_PRIORITY_HINTS = [
    "src", "app", "api", "pages", "components", "services", "routes",
    "backend", "frontend", "controllers", "schemas", "store", "state",
    "views", "utils",
]

FILE_PRIORITY_HINTS = [
    "api", "route", "router", "service", "controller", "page", "component",
    "layout", "auth", "index", "main", "store", "state", "schema", "model",
]

LOW_PRIORITY_HINTS = ["test", "spec", "mock", "fixture", "sample", "example"]

MAX_IMPORTS = 16
MAX_EXPORTS = 40
MAX_TOP_LEVEL = 40
MAX_SECTIONS = 40
MAX_LOGIC_NOTES = 10
MAX_FUNCTION_GROUPS = 12
MAX_RELATED_FILES = 8
MAX_LIBRARY_NOTES = 6

LIBRARY_DETECTORS: dict[str, dict[str, Any]] = {
    "opencv": {
        "import_aliases": {"cv2"},
        "call_terms": {"findContours", "drawContours", "boundingRect", "threshold", "cvtColor", "bitwise_not", "dilate", "erode", "moments", "imread", "imwrite", "rectangle", "resize"},
        "group": "computer vision",
        "note": "OpenCV-style computer vision operations are used in this file.",
    },
    "pillow": {
        "import_aliases": {"PIL", "Image"},
        "call_terms": {"open", "save", "convert", "crop", "resize", "new"},
        "group": "image io",
        "note": "Pillow-style image loading or manipulation is used in this file.",
    },
    "pymupdf": {
        "import_aliases": {"fitz"},
        "call_terms": {"open", "load_page", "get_text", "get_pixmap", "new_page", "insert_pdf", "search_for", "rect"},
        "group": "pdf processing",
        "note": "PyMuPDF-style PDF reading or page extraction logic is used in this file.",
    },
    "numpy": {
        "import_aliases": {"numpy", "np"},
        "call_terms": {"array", "ones", "zeros", "sqrt", "mean", "linalg", "norm", "reshape"},
        "group": "numerical processing",
        "note": "NumPy-style numerical or array processing is used in this file.",
    },
    "pandas": {
        "import_aliases": {"pandas", "pd"},
        "call_terms": {"DataFrame", "read_csv", "read_excel", "to_excel", "merge", "groupby"},
        "group": "tabular data",
        "note": "Pandas-style table or dataframe operations are used in this file.",
    },
    "openpyxl": {
        "import_aliases": {"openpyxl"},
        "call_terms": {"load_workbook", "Workbook", "worksheet", "cell", "append"},
        "group": "spreadsheet processing",
        "note": "openpyxl-style spreadsheet read/write operations are used in this file.",
    },
    "tqdm": {
        "import_aliases": {"tqdm"},
        "call_terms": {"tqdm"},
        "group": "progress reporting",
        "note": "Progress-bar style iteration is used in this file.",
    },
    "cadquery": {
        "import_aliases": {"cadquery", "cq"},
        "call_terms": {"Workplane", "faces", "edges", "extrude", "revolve", "export"},
        "group": "cad modeling",
        "note": "CadQuery-style CAD modeling operations are used in this file.",
    },
    "trimesh": {
        "import_aliases": {"trimesh"},
        "call_terms": {"load", "scene", "Trimesh", "bounds", "voxelized", "ray"},
        "group": "mesh geometry",
        "note": "trimesh-style mesh or geometry processing is used in this file.",
    },
    "fastapi": {
        "import_aliases": {"fastapi", "FastAPI", "APIRouter"},
        "call_terms": {"get", "post", "put", "patch", "delete", "Query", "Body", "Header"},
        "group": "api backend",
        "note": "FastAPI-style API endpoint or request handling logic is used in this file.",
    },
    "requests": {
        "import_aliases": {"requests"},
        "call_terms": {"get", "post", "put", "patch", "delete", "request", "Session"},
        "group": "http client",
        "note": "HTTP client request logic is used in this file.",
    },
    "openai": {
        "import_aliases": {"openai", "OpenAI", "AzureOpenAI"},
        "call_terms": {"responses", "chat", "embeddings", "images", "audio", "files"},
        "group": "ai api",
        "note": "OpenAI-style API client usage is present in this file.",
    },
    "asyncio": {
        "import_aliases": {"asyncio"},
        "call_terms": {"create_task", "gather", "sleep", "run", "wait_for"},
        "group": "async orchestration",
        "note": "Async orchestration patterns are used in this file.",
    },
}

@dataclass
class SymbolSummary:
    name: str
    category: str
    line_start: int | None
    line_end: int | None
    responsibility: str
    logic_note: str | None = None

@dataclass
class FileFacts:
    source_path: str
    language: str
    source_hash: str
    file_role: str
    imports: list[str] = field(default_factory=list)
    exports: list[str] = field(default_factory=list)
    top_level_definitions: list[str] = field(default_factory=list)
    functional_groups: list[str] = field(default_factory=list)
    section_summaries: list[SymbolSummary] = field(default_factory=list)
    logic_notes: list[str] = field(default_factory=list)
    related_files: list[str] = field(default_factory=list)
    confidence: str = "Medium"

def print_progress(message: str) -> None:
    if PRINT_PROGRESS:
        print(message)

def safe_read_text(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            return path.read_text(encoding=encoding)
        except Exception:
            continue
    raise ValueError(f"Could not read file with supported encodings: {path}")

def compute_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()

def detect_language(path: Path) -> str:
    return {
        ".py": "python",
        ".ts": "typescript",
        ".tsx": "tsx",
        ".js": "javascript",
        ".jsx": "jsx",
        ".html": "html",
        ".css": "css",
    }.get(path.suffix.lower(), "unknown")

def relative_or_absolute(path: Path, root: Path | None = None) -> str:
    if root is not None:
        try:
            return path.relative_to(root).as_posix()
        except Exception:
            pass
    return path.as_posix()

def line_range_text(start: int | None, end: int | None) -> str:
    if start is None:
        return "line unknown"
    if end is None or end == start:
        return f"line {start}"
    return f"lines {start}-{end}"

def unique_keep_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out

def should_exclude_file(path: Path) -> bool:
    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        return True
    for pattern in EXCLUDED_FILE_PATTERNS:
        if fnmatch.fnmatch(path.name, pattern):
            return True
    return False

def score_file(path: Path, repo_root: Path) -> int:
    score = 0
    rel = relative_or_absolute(path, repo_root).lower()
    name = path.name.lower()
    for part in path.parts:
        if part.lower() in PATH_PRIORITY_HINTS:
            score += 3
    for hint in FILE_PRIORITY_HINTS:
        if hint in name:
            score += 4
        if f"/{hint}/" in rel:
            score += 2
    for hint in LOW_PRIORITY_HINTS:
        if hint in name:
            score -= 5
    try:
        size = path.stat().st_size
        if size > 1000:
            score += 1
        if size > 5000:
            score += 2
        if size > 15000:
            score += 2
    except Exception:
        pass
    return score

def collect_repo_files(repo_root: Path) -> list[Path]:
    selected: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(repo_root):
        current_dir = Path(dirpath)
        dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIR_NAMES]
        for filename in filenames:
            path = current_dir / filename
            if should_exclude_file(path):
                continue
            selected.append(path)
    selected.sort(key=lambda p: (-score_file(p, repo_root), relative_or_absolute(p, repo_root)))
    return selected[:MAX_FILES]

def single_output_path(source_path: Path) -> Path:
    return source_path.with_name(f"{source_path.name}.ast_summary.md")

def repo_output_path(repo_root: Path, source_path: Path) -> Path:
    rel = source_path.relative_to(repo_root)
    return repo_root / ".repo_executive_context" / "ast_summaries" / f"{rel.as_posix()}.md"

def repo_json_facts_path(repo_root: Path, source_path: Path) -> Path:
    rel = source_path.relative_to(repo_root)
    return repo_root / ".repo_executive_context" / "ast_summaries" / f"{rel.as_posix()}.facts.json"

def summary_is_current(summary_path: Path, source_hash: str) -> bool:
    if FORCE_REBUILD or not summary_path.exists():
        return False
    try:
        text = summary_path.read_text(encoding="utf-8")
    except Exception:
        return False
    return f"- Source hash: `{source_hash[:16]}`" in text

def write_text_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")

def write_json_file(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

def python_call_names(node: ast.AST) -> list[str]:
    names: list[str] = []
    class Visitor(ast.NodeVisitor):
        def visit_Call(self, call: ast.Call) -> None:
            func = call.func
            if isinstance(func, ast.Name):
                names.append(func.id)
            elif isinstance(func, ast.Attribute):
                names.append(func.attr)
            self.generic_visit(call)
    Visitor().visit(node)
    return unique_keep_order(names)[:10]

def python_attribute_chains(node: ast.AST) -> list[str]:
    chains: list[str] = []
    class Visitor(ast.NodeVisitor):
        def visit_Attribute(self, attr: ast.Attribute) -> None:
            parts: list[str] = []
            current: ast.AST | None = attr
            while isinstance(current, ast.Attribute):
                parts.append(current.attr)
                current = current.value
            if isinstance(current, ast.Name):
                parts.append(current.id)
                chains.append(".".join(reversed(parts)))
            self.generic_visit(attr)
    Visitor().visit(node)
    return unique_keep_order(chains)

def python_import_map(tree: ast.AST) -> dict[str, str]:
    import_map: dict[str, str] = {}
    for node in getattr(tree, "body", []):
        if isinstance(node, ast.Import):
            for alias in node.names:
                alias_name = alias.asname or alias.name.split(".")[0]
                import_map[alias_name] = alias.name
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            for alias in node.names:
                alias_name = alias.asname or alias.name
                import_map[alias_name] = f"{module}.{alias.name}" if module else alias.name
    return import_map

def python_imports(tree: ast.AST) -> list[str]:
    items: list[str] = []
    for node in getattr(tree, "body", []):
        if isinstance(node, ast.Import):
            for alias in node.names:
                items.append(alias.name if alias.asname is None else f"{alias.name} as {alias.asname}")
        elif isinstance(node, ast.ImportFrom):
            names = ", ".join(
                alias.name if alias.asname is None else f"{alias.name} as {alias.asname}"
                for alias in node.names[:8]
            )
            module = node.module or ""
            items.append(f"{module}: {names}" if module else names)
    return items[:MAX_IMPORTS]

def python_signature(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str:
    args: list[str] = []
    for arg in getattr(node.args, "posonlyargs", []):
        args.append(arg.arg)
    for arg in node.args.args:
        args.append(arg.arg)
    if node.args.vararg:
        args.append(f"*{node.args.vararg.arg}")
    for arg in node.args.kwonlyargs:
        args.append(arg.arg)
    if node.args.kwarg:
        args.append(f"**{node.args.kwarg.arg}")
    prefix = "async function" if isinstance(node, ast.AsyncFunctionDef) else "function"
    return f"{prefix} {node.name}({', '.join(args)})"

def python_return_shape(node: ast.AST) -> str | None:
    shapes: list[str] = []
    class Visitor(ast.NodeVisitor):
        def visit_Return(self, ret: ast.Return) -> None:
            value = ret.value
            if isinstance(value, ast.Dict):
                shapes.append("dict")
            elif isinstance(value, ast.List):
                shapes.append("list")
            elif isinstance(value, ast.Tuple):
                shapes.append("tuple")
            elif isinstance(value, ast.Name):
                shapes.append("name")
            self.generic_visit(ret)
    Visitor().visit(node)
    return shapes[0] if shapes else None

def python_loop_patterns(node: ast.AST) -> set[str]:
    patterns: set[str] = set()
    class Visitor(ast.NodeVisitor):
        def visit_While(self, while_node: ast.While) -> None:
            patterns.add("while")
            self.generic_visit(while_node)
        def visit_For(self, for_node: ast.For) -> None:
            patterns.add("for")
            self.generic_visit(for_node)
        def visit_Break(self, break_node: ast.Break) -> None:
            patterns.add("break")
    Visitor().visit(node)
    return patterns

def detect_library_usage(import_map: dict[str, str], attribute_chains: list[str], call_names: list[str]) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    imported_aliases = set(import_map.keys()) | set(import_map.values())
    attribute_text = set(attribute_chains)
    call_name_set = set(call_names)
    for lib_name, config in LIBRARY_DETECTORS.items():
        alias_hit = False
        call_hit = False
        for alias in config["import_aliases"]:
            if alias in imported_aliases:
                alias_hit = True
                break
            if any(chain == alias or chain.startswith(f"{alias}.") for chain in attribute_text):
                alias_hit = True
                break
        for term in config["call_terms"]:
            if term in call_name_set:
                call_hit = True
                break
            if any(chain.endswith(f".{term}") for chain in attribute_text):
                call_hit = True
                break
        if alias_hit or call_hit:
            hits.append({"library": lib_name, "group": config["group"], "note": config["note"]})
    return hits

def infer_generic_logic_notes(
    text: str,
    attribute_chains: list[str],
    section_summaries: list[SymbolSummary],
    library_hits: list[dict[str, Any]],
) -> list[str]:
    notes: list[str] = []
    lower_text = text.lower()
    if sum(1 for item in section_summaries if item.category == "merge/refine") >= 2:
        notes.append("Repeated merge or refinement helpers are present across the module.")
    if sum(1 for item in section_summaries if item.category == "filter/sort") >= 2:
        notes.append("Multiple filtering or ordering helpers are present in the module.")
    if sum(1 for item in section_summaries if item.category == "grouping/clustering") >= 2:
        notes.append("Grouping or clustering logic is used in more than one part of the module.")
    if "while loop_count < maxloop" in lower_text or ("while" in lower_text and "maxloop" in lower_text):
        notes.append("Iterative refinement loops with explicit cutoff conditions were detected.")
    if "debug" in lower_text and any(term in lower_text for term in ["save", "write", "imwrite"]):
        notes.append("Optional debug or output-gated behavior is present in the module.")
    if any(item["library"] == "opencv" for item in library_hits):
        if sum(1 for chain in attribute_chains if chain.endswith(".boundingRect")) >= 2:
            notes.append("Repeated spatial bounding-box calculations were detected.")
        if "findcontours" in lower_text or "drawcontours" in lower_text:
            notes.append("Contour extraction or contour-rendering logic is present.")
        if "hierarchy" in lower_text:
            notes.append("Hierarchy-aware image or shape processing logic is present.")
    if any(item["library"] == "pymupdf" for item in library_hits) and any(term in lower_text for term in ["load_page", "get_text", "get_pixmap"]):
        notes.append("PDF page-level extraction or rendering operations were detected.")
    if any(item["library"] == "openpyxl" for item in library_hits) and any(term in lower_text for term in ["load_workbook", "worksheet", "cell", "append"]):
        notes.append("Spreadsheet workbook or worksheet manipulation is present.")
    if any(item["library"] == "pandas" for item in library_hits) and any(term in lower_text for term in ["read_csv", "read_excel", "dataframe", "groupby"]):
        notes.append("Tabular data loading or dataframe transformation logic is present.")
    if any(item["library"] == "trimesh" for item in library_hits):
        notes.append("Mesh or geometry processing operations are present.")
    if any(item["library"] == "cadquery" for item in library_hits):
        notes.append("CAD modeling or solid-building operations are present.")
    if any(item["library"] == "fastapi" for item in library_hits):
        notes.append("API routing or request parameter handling logic is present.")
    if any(item["library"] == "requests" for item in library_hits):
        notes.append("Outbound HTTP request handling is present.")
    if any(item["library"] == "openai" for item in library_hits):
        notes.append("AI client interaction or model-facing request logic is present.")
    if any(item["library"] == "asyncio" for item in library_hits):
        notes.append("Async task scheduling or coroutine orchestration is present.")
    if "return {" in text or "append({" in text or "dict(" in lower_text:
        notes.append("Structured dictionary-style output assembly was detected.")
    return unique_keep_order(notes)[:MAX_LOGIC_NOTES]

def classify_python_function(name: str, calls: list[str], decorators: list[str], import_map: dict[str, str], attribute_chains: list[str]) -> tuple[str, str, str | None]:
    lower = name.lower()
    lower_calls = [item.lower() for item in calls]
    if lower.startswith("ensure_"):
        return "schema/setup", "Ensures required table, schema, or resource state exists.", None
    if lower.startswith(("get_", "list_", "fetch_", "count_")):
        return "read/query", "Reads or queries existing data and returns the result.", None
    if lower.startswith(("insert_", "create_")):
        return "create/persist", "Creates or persists a new record or artifact.", None
    if lower.startswith(("update_", "upsert_")):
        return "update/mutate", "Updates existing state or inserts when missing.", None
    if lower.startswith(("delete_", "remove_")):
        return "delete/remove", "Removes or discards existing state, records, or items.", None
    if lower.startswith(("extract_", "parse_", "build_")):
        return "extraction/build", "Extracts, parses, or builds structured output from inputs.", None
    if lower.startswith(("combine_", "merge_")):
        return "merge/refine", "Combines related items into a more consolidated result.", None
    if lower.startswith(("filter_", "sort_")):
        return "filter/sort", "Filters, screens, or orders items based on rules.", None
    if lower.startswith(("draw_", "save_", "copy_")):
        return "io/visualization", "Produces output, visualization, or persisted artifacts.", None
    if lower.startswith(("find_", "count_")):
        return "analysis/measurement", "Measures, detects, or derives structural information from inputs.", None
    if lower.startswith(("group_",)):
        return "grouping/clustering", "Groups related items based on geometric, logical, or rule-based proximity.", None
    if lower.startswith(("enlarge_", "shrink_", "resize_")):
        return "geometry transform", "Adjusts geometric or spatial bounds.", None
    if any(d.endswith((".get", ".post", ".put", ".patch", ".delete")) for d in decorators):
        return "route handler", "Handles a routed entry point exposed by the module.", "Decorator-based route entry point detected."
    import_aliases = set(import_map.keys()) | set(import_map.values())
    attr_text = set(attribute_chains)
    if {"cv2"} & import_aliases or any(chain.startswith("cv2.") for chain in attr_text):
        if any(item in lower_calls for item in ["threshold", "cvtcolor", "bitwise_not", "dilate", "erode"]):
            return "preprocessing", "Transforms raw image content into a more usable intermediate representation.", None
        if any(item in lower_calls for item in ["findcontours", "drawcontours"]):
            return "contour handling", "Works with contour extraction, hierarchy handling, or contour rendering.", None
        if any(item in lower_calls for item in ["boundingrect", "moments", "norm"]):
            return "image/geometry", "Processes image-derived geometric structures or spatial relationships.", None
    if {"fitz"} & import_aliases or any(chain.startswith("fitz.") for chain in attr_text):
        return "pdf processing", "Works with PDF pages, text extraction, or rendered page assets.", None
    if {"openpyxl"} & import_aliases:
        return "spreadsheet processing", "Works with workbook, worksheet, or spreadsheet cell operations.", None
    if {"pandas", "pd"} & import_aliases:
        return "tabular data", "Works with dataframe-like tabular data operations.", None
    if {"trimesh"} & import_aliases:
        return "mesh geometry", "Works with mesh, scene, or geometry processing operations.", None
    if {"cadquery", "cq"} & import_aliases:
        return "cad modeling", "Works with CAD modeling or solid-building operations.", None
    if {"requests"} & import_aliases:
        return "http client", "Issues outbound HTTP requests or integrates with external services.", None
    if {"fastapi", "FastAPI", "APIRouter"} & import_aliases:
        return "api backend", "Defines or supports API endpoint and request handling logic.", None
    if {"openai", "OpenAI", "AzureOpenAI"} & import_aliases:
        return "ai api", "Builds requests to an AI client or model-facing API.", None
    if {"asyncio"} & import_aliases:
        return "async orchestration", "Coordinates asynchronous tasks, coroutines, or concurrent execution.", None
    return "general", "Contains top-level module logic that contributes to the file's main behavior.", None

def infer_python_file_role(path: Path, imports: list[str], library_hits: list[dict[str, Any]], route_patterns: list[tuple[str, str]], section_summaries: list[SymbolSummary]) -> str:
    module_name = path.name.lower()
    groups = {item["group"] for item in library_hits}
    categories = {item.category for item in section_summaries}
    if "api backend" in groups or route_patterns:
        return "Provides API request handling, routing, or backend service endpoint logic."
    if "computer vision" in groups:
        return "Provides computer vision, image analysis, or image-derived geometry processing helpers."
    if "pdf processing" in groups:
        return "Provides PDF reading, extraction, rendering, or page-processing helpers."
    if "spreadsheet processing" in groups or "tabular data" in groups:
        return "Provides spreadsheet or tabular data processing helpers and transformation logic."
    if "cad modeling" in groups or "mesh geometry" in groups:
        return "Provides CAD, mesh, or geometry processing helpers and transformation logic."
    if "ai api" in groups:
        return "Provides AI client integration, model request handling, or AI-assisted processing logic."
    if "http client" in groups:
        return "Provides external service integration or outbound HTTP request helpers."
    if "auth" in module_name or any("psycopg2" in item for item in imports):
        return "Provides database or authentication-related module logic, helpers, and data access behavior."
    if "merge/refine" in categories and "filter/sort" in categories:
        return "Provides rule-based transformation, filtering, and refinement helpers for structured inputs."
    return "Provides Python module logic grouped into top-level helpers, workflows, or reusable operations."

def extract_python_file(path: Path, text: str) -> FileFacts:
    source_hash = compute_hash(text)
    try:
        tree = ast.parse(text)
    except SyntaxError as exc:
        return FileFacts(
            source_path=path.as_posix(),
            language="python",
            source_hash=source_hash,
            file_role="Python file could not be fully parsed, so only a limited summary is available.",
            logic_notes=[f"Syntax error prevented AST parsing: {exc}"],
            confidence="Low",
        )
    imports = python_imports(tree)
    import_map = python_import_map(tree)
    file_attribute_chains = python_attribute_chains(tree)
    top_level_definitions: list[str] = []
    section_summaries: list[SymbolSummary] = []
    exports: list[str] = []
    functional_groups_seen: list[str] = []
    related_files: list[str] = []
    route_patterns = re.findall(r'@\w+\.(get|post|put|patch|delete)\(["\']([^"\']+)["\']', text)
    file_call_names: list[str] = []
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            file_call_names.extend(python_call_names(node))
    file_call_names = unique_keep_order(file_call_names)
    library_hits = detect_library_usage(import_map, file_attribute_chains, file_call_names)
    for item in library_hits:
        if item["group"] not in functional_groups_seen:
            functional_groups_seen.append(item["group"])
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            signature = python_signature(node)
            top_level_definitions.append(signature)
            exports.append(node.name)
            decorators = []
            for dec in node.decorator_list:
                if isinstance(dec, ast.Attribute):
                    decorators.append(f"{getattr(dec.value, 'id', 'obj')}.{dec.attr}")
                elif isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute):
                    decorators.append(f"{getattr(dec.func.value, 'id', 'obj')}.{dec.func.attr}")
                elif isinstance(dec, ast.Name):
                    decorators.append(dec.id)
            calls = python_call_names(node)
            attribute_chains = python_attribute_chains(node)
            category, responsibility, maybe_note = classify_python_function(node.name, calls, decorators, import_map, attribute_chains)
            if category not in functional_groups_seen:
                functional_groups_seen.append(category)
            call_note_parts: list[str] = []
            if calls:
                call_note_parts.append(f"Touches key helpers or APIs such as: {', '.join(calls[:4])}.")
            return_shape = python_return_shape(node)
            if return_shape in {"dict", "list", "tuple"}:
                call_note_parts.append(f"Returns a {return_shape}-shaped output.")
            loop_patterns = python_loop_patterns(node)
            if "while" in loop_patterns and "break" in loop_patterns:
                call_note_parts.append("Includes loop-and-break style control flow.")
            if maybe_note:
                call_note_parts.append(maybe_note)
            section_summaries.append(
                SymbolSummary(
                    name=node.name,
                    category=category,
                    line_start=getattr(node, "lineno", None),
                    line_end=getattr(node, "end_lineno", None),
                    responsibility=responsibility,
                    logic_note=" ".join(call_note_parts) if call_note_parts else None,
                )
            )
        elif isinstance(node, ast.ClassDef):
            top_level_definitions.append(f"class {node.name}")
            method_names = [child.name for child in node.body if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef))]
            if "class/object" not in functional_groups_seen:
                functional_groups_seen.append("class/object")
            note = f"Defines methods: {', '.join(method_names[:4])}." if method_names else None
            section_summaries.append(
                SymbolSummary(
                    name=node.name,
                    category="class/object",
                    line_start=getattr(node, "lineno", None),
                    line_end=getattr(node, "end_lineno", None),
                    responsibility="Provides class-based behavior or grouped object-oriented logic.",
                    logic_note=note,
                )
            )
        elif isinstance(node, ast.Assign):
            names = [target.id for target in node.targets if isinstance(target, ast.Name)]
            if names:
                top_level_definitions.append(f"variable assignment: {', '.join(names)}")
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            top_level_definitions.append(f"annotated variable: {node.target.id}")
    ignored_roots = {"os", "re", "json", "math", "time", "asyncio", "datetime", "pandas", "numpy", "openpyxl", "cv2", "PIL", "fitz", "cadquery", "trimesh", "fastapi", "requests", "openai", "tqdm"}
    for _, full_name in import_map.items():
        root_name = full_name.split(".")[0]
        if root_name and root_name not in ignored_roots:
            related_files.append(root_name)
    logic_notes = infer_generic_logic_notes(text, file_attribute_chains, section_summaries, library_hits)
    for item in library_hits[:MAX_LIBRARY_NOTES]:
        if item["note"] not in logic_notes:
            logic_notes.append(item["note"])
    file_role = infer_python_file_role(path, imports, library_hits, route_patterns, section_summaries)
    return FileFacts(
        source_path=path.as_posix(),
        language="python",
        source_hash=source_hash,
        file_role=file_role,
        imports=imports[:MAX_IMPORTS],
        exports=exports[:MAX_EXPORTS],
        top_level_definitions=top_level_definitions[:MAX_TOP_LEVEL],
        functional_groups=functional_groups_seen[:MAX_FUNCTION_GROUPS],
        section_summaries=section_summaries[:MAX_SECTIONS],
        logic_notes=unique_keep_order(logic_notes)[:MAX_LOGIC_NOTES],
        related_files=unique_keep_order(related_files)[:MAX_RELATED_FILES],
        confidence="High",
    )

IMPORT_RE = re.compile(r'^\s*import\s+.*?from\s+[\'"]([^\'"]+)[\'"]', re.MULTILINE)
REQUIRE_RE = re.compile(r'require\([\'"]([^\'"]+)[\'"]\)')
EXPORT_FUNC_RE = re.compile(r'export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\((.*?)\)', re.DOTALL)
FUNC_RE = re.compile(r'^\s*(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\((.*?)\)', re.MULTILINE | re.DOTALL)
ARROW_RE = re.compile(r'^\s*(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\((.*?)\)\s*=>', re.MULTILINE | re.DOTALL)
CLASS_RE = re.compile(r'^\s*class\s+([A-Za-z0-9_]+)', re.MULTILINE)
HOOK_RE = re.compile(r'\b(useState|useEffect|useMemo|useCallback|useRef|useReducer)\b')
ROUTE_CALL_RE = re.compile(r'\b(?:router|app)\.(get|post|put|patch|delete|use)\s*\(\s*[\'"]([^\'"]+)[\'"]')
JSX_TAG_RE = re.compile(r'<([A-Z][A-Za-z0-9_]*)\b')
FETCH_RE = re.compile(r'\b(fetch|axios|get|post|put|patch|delete)\b')

def js_line_number(text: str, match_start: int) -> int:
    return text[:match_start].count("\n") + 1

def classify_js_symbol(name: str, body_hint: str, file_suffix: str, hooks_found: list[str]) -> tuple[str, str]:
    lower = name.lower()
    if name[:1].isupper() or file_suffix in {".tsx", ".jsx"}:
        return "component/view", "Defines a component or view surface for UI rendering."
    if lower.startswith(("get", "fetch", "load", "query")):
        return "read/query", "Reads remote or local data for later use in the module."
    if lower.startswith(("create", "insert", "add")):
        return "create/action", "Creates data, triggers an action, or submits new state."
    if lower.startswith(("update", "set", "save")):
        return "update/action", "Updates existing state, settings, or persisted data."
    if lower.startswith(("remove", "delete")):
        return "delete/action", "Removes or deletes existing state or data."
    if lower.startswith(("handle", "on")):
        return "event handler", "Handles user or system-triggered events."
    if "router" in body_hint or "route" in body_hint:
        return "route handler", "Binds a route or middleware entry point."
    if hooks_found:
        return "stateful ui logic", "Contains stateful or lifecycle-driven UI logic."
    return "general", "Contains reusable JS or TS module logic."

def extract_js_ts_file(path: Path, text: str) -> FileFacts:
    source_hash = compute_hash(text)
    imports = list(dict.fromkeys(IMPORT_RE.findall(text) + REQUIRE_RE.findall(text)))[:MAX_IMPORTS]
    exports: list[str] = []
    top_level_definitions: list[str] = []
    section_summaries: list[SymbolSummary] = []
    functional_groups_seen: list[str] = []
    logic_notes: list[str] = []
    hooks_found = list(dict.fromkeys(HOOK_RE.findall(text)))
    if hooks_found:
        logic_notes.append(f"React hook usage detected: {', '.join(hooks_found[:4])}.")
    route_hits = ROUTE_CALL_RE.findall(text)
    if route_hits:
        logic_notes.append("Route or middleware binding patterns were detected.")
    jsx_tags = list(dict.fromkeys(JSX_TAG_RE.findall(text)))
    if jsx_tags:
        logic_notes.append(f"JSX component usage detected: {', '.join(jsx_tags[:4])}.")
    for match in EXPORT_FUNC_RE.finditer(text):
        name = match.group(1)
        args = " ".join(match.group(2).split())
        exports.append(name)
        top_level_definitions.append(f"export function {name}({args})")
        category, responsibility = classify_js_symbol(name, match.group(0), path.suffix.lower(), hooks_found)
        if category not in functional_groups_seen:
            functional_groups_seen.append(category)
        section_summaries.append(SymbolSummary(name=name, category=category, line_start=js_line_number(text, match.start()), line_end=None, responsibility=responsibility, logic_note=None))
    for match in FUNC_RE.finditer(text):
        name = match.group(1)
        if any(item.name == name for item in section_summaries):
            continue
        args = " ".join(match.group(2).split())
        top_level_definitions.append(f"function {name}({args})")
        category, responsibility = classify_js_symbol(name, match.group(0), path.suffix.lower(), hooks_found)
        if category not in functional_groups_seen:
            functional_groups_seen.append(category)
        section_summaries.append(SymbolSummary(name=name, category=category, line_start=js_line_number(text, match.start()), line_end=None, responsibility=responsibility, logic_note=None))
    for match in ARROW_RE.finditer(text):
        name = match.group(1)
        if any(item.name == name for item in section_summaries):
            continue
        args = " ".join(match.group(2).split())
        top_level_definitions.append(f"const {name} = ({args}) =>")
        exports.append(name)
        category, responsibility = classify_js_symbol(name, match.group(0), path.suffix.lower(), hooks_found)
        if category not in functional_groups_seen:
            functional_groups_seen.append(category)
        note = "Likely triggers data fetching or network-related logic." if FETCH_RE.findall(match.group(0)) else None
        section_summaries.append(SymbolSummary(name=name, category=category, line_start=js_line_number(text, match.start()), line_end=None, responsibility=responsibility, logic_note=note))
    for match in CLASS_RE.finditer(text):
        name = match.group(1)
        top_level_definitions.append(f"class {name}")
        if "class/object" not in functional_groups_seen:
            functional_groups_seen.append("class/object")
        section_summaries.append(SymbolSummary(name=name, category="class/object", line_start=js_line_number(text, match.start()), line_end=None, responsibility="Defines class-based behavior inside the module.", logic_note=None))
    for method, route in route_hits[:MAX_TOP_LEVEL]:
        top_level_definitions.append(f"route {method.upper()} {route}")
    if path.suffix.lower() in {".tsx", ".jsx"}:
        file_role = "Provides frontend component or page logic for rendering UI and handling interactions."
    elif route_hits:
        file_role = "Provides routed API or middleware logic for handling incoming requests."
    elif hooks_found:
        file_role = "Provides stateful frontend module logic using React-style hooks."
    else:
        file_role = "Provides JavaScript or TypeScript module logic, exports, and reusable behaviors."
    return FileFacts(source_path=path.as_posix(), language=detect_language(path), source_hash=source_hash, file_role=file_role, imports=imports[:MAX_IMPORTS], exports=list(dict.fromkeys(exports))[:MAX_EXPORTS], top_level_definitions=list(dict.fromkeys(top_level_definitions))[:MAX_TOP_LEVEL], functional_groups=functional_groups_seen[:MAX_FUNCTION_GROUPS], section_summaries=section_summaries[:MAX_SECTIONS], logic_notes=logic_notes[:MAX_LOGIC_NOTES], confidence="Medium")

class SimpleHTMLAnalyzer(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tags: list[str] = []
        self.ids: list[str] = []
        self.classes: list[str] = []
        self.section_counts: dict[str, int] = {}
        self.forms = 0
        self.tables = 0
        self.scripts = 0
        self.stylesheets = 0
    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tags.append(tag)
        self.section_counts[tag] = self.section_counts.get(tag, 0) + 1
        attr_map = dict(attrs)
        if tag == "form":
            self.forms += 1
        if tag == "table":
            self.tables += 1
        if tag == "script":
            self.scripts += 1
        if tag == "link" and attr_map.get("rel") == "stylesheet":
            self.stylesheets += 1
        if attr_map.get("id"):
            self.ids.append(attr_map["id"] or "")
        if attr_map.get("class"):
            for item in (attr_map["class"] or "").split():
                self.classes.append(item)

def extract_html_file(path: Path, text: str) -> FileFacts:
    source_hash = compute_hash(text)
    parser = SimpleHTMLAnalyzer()
    try:
        parser.feed(text)
    except Exception:
        pass
    top_tags = sorted(parser.section_counts.items(), key=lambda x: -x[1])
    top_level_definitions = [f"tag <{name}> x{count}" for name, count in top_tags[:MAX_TOP_LEVEL]]
    section_summaries: list[SymbolSummary] = []
    functional_groups: list[str] = []
    logic_notes: list[str] = []
    for tag_name, count in top_tags[: min(12, len(top_tags))]:
        category = "layout/structure"
        responsibility = f"Defines repeated <{tag_name}> structure within the page."
        if tag_name in {"form", "input", "button"}:
            category = "form/input"
            responsibility = "Defines input or submission-oriented UI structure."
        elif tag_name in {"table", "thead", "tbody", "tr"}:
            category = "tabular display"
            responsibility = "Defines table-oriented content structure."
        elif tag_name in {"nav", "header", "footer", "main", "section"}:
            category = "layout/structure"
            responsibility = "Defines major page layout or navigation structure."
        if category not in functional_groups:
            functional_groups.append(category)
        section_summaries.append(SymbolSummary(name=f"<{tag_name}>", category=category, line_start=None, line_end=None, responsibility=responsibility, logic_note=f"Appears {count} times in the document."))
    if parser.forms:
        logic_notes.append(f"Form structures detected: {parser.forms}.")
    if parser.tables:
        logic_notes.append(f"Table structures detected: {parser.tables}.")
    if parser.stylesheets:
        logic_notes.append(f"Stylesheet links detected: {parser.stylesheets}.")
    if parser.scripts:
        logic_notes.append(f"Script tags detected: {parser.scripts}.")
    if parser.forms:
        file_role = "Provides HTML structure for a form or input-driven page."
    elif parser.tables:
        file_role = "Provides HTML structure for displaying table-like content."
    else:
        file_role = "Provides HTML layout and structural content for a rendered page."
    imports = []
    if parser.stylesheets:
        imports.append("linked stylesheets")
    if parser.scripts:
        imports.append("linked scripts")
    exports = [f"id:{item}" for item in unique_keep_order(parser.ids)[:5]]
    return FileFacts(source_path=path.as_posix(), language="html", source_hash=source_hash, file_role=file_role, imports=imports[:MAX_IMPORTS], exports=exports[:MAX_EXPORTS], top_level_definitions=top_level_definitions[:MAX_TOP_LEVEL], functional_groups=functional_groups[:MAX_FUNCTION_GROUPS], section_summaries=section_summaries[:MAX_SECTIONS], logic_notes=logic_notes[:MAX_LOGIC_NOTES], confidence="Medium")

CSS_BLOCK_RE = re.compile(r'([^{]+)\{([^}]*)\}', re.DOTALL)
MEDIA_RE = re.compile(r'@media[^{]+\{', re.IGNORECASE)
KEYFRAMES_RE = re.compile(r'@keyframes\s+([A-Za-z0-9_-]+)', re.IGNORECASE)
VAR_RE = re.compile(r'--([A-Za-z0-9_-]+)\s*:')
SELECTOR_SPLIT_RE = re.compile(r'\s*,\s*')

def classify_css_selector(selector: str) -> tuple[str, str]:
    stripped = selector.strip()
    if stripped.startswith(":root"):
        return "theme/variables", "Defines theme tokens or shared custom properties."
    if stripped.startswith("@media"):
        return "responsive", "Defines responsive behavior for different viewport conditions."
    if stripped.startswith("@keyframes"):
        return "animation", "Defines animation keyframes or motion behavior."
    if "#" in stripped or "." in stripped:
        return "component/style block", "Defines component, element, or utility styling rules."
    return "base/style block", "Defines base element styling or general page appearance."

def extract_css_file(path: Path, text: str) -> FileFacts:
    source_hash = compute_hash(text)
    top_level_definitions: list[str] = []
    section_summaries: list[SymbolSummary] = []
    functional_groups: list[str] = []
    logic_notes: list[str] = []
    variables = VAR_RE.findall(text)
    media_hits = MEDIA_RE.findall(text)
    keyframes = KEYFRAMES_RE.findall(text)
    if variables:
        logic_notes.append(f"Custom CSS variables detected: {len(variables)}.")
    if media_hits:
        logic_notes.append(f"Responsive media query blocks detected: {len(media_hits)}.")
    if keyframes:
        logic_notes.append(f"Animation keyframes detected: {', '.join(keyframes[:4])}.")
    block_count = 0
    for match in CSS_BLOCK_RE.finditer(text):
        selector_raw = match.group(1).strip()
        if not selector_raw:
            continue
        for selector in SELECTOR_SPLIT_RE.split(selector_raw):
            selector = selector.strip()
            if not selector:
                continue
            block_count += 1
            top_level_definitions.append(selector)
            category, responsibility = classify_css_selector(selector)
            if category not in functional_groups:
                functional_groups.append(category)
            section_summaries.append(SymbolSummary(name=selector, category=category, line_start=js_line_number(text, match.start()), line_end=None, responsibility=responsibility, logic_note=None))
            if block_count >= MAX_SECTIONS:
                break
        if block_count >= MAX_SECTIONS:
            break
    if variables:
        file_role = "Provides CSS theme, variables, and style rules for presentation."
    elif media_hits:
        file_role = "Provides CSS styling with responsive layout behavior."
    else:
        file_role = "Provides CSS styling rules for layout, appearance, and component presentation."
    exports = [f"--{name}" for name in unique_keep_order(variables)[:MAX_EXPORTS]]
    return FileFacts(source_path=path.as_posix(), language="css", source_hash=source_hash, file_role=file_role, imports=[], exports=exports[:MAX_EXPORTS], top_level_definitions=unique_keep_order(top_level_definitions)[:MAX_TOP_LEVEL], functional_groups=functional_groups[:MAX_FUNCTION_GROUPS], section_summaries=section_summaries[:MAX_SECTIONS], logic_notes=logic_notes[:MAX_LOGIC_NOTES], confidence="Medium")

def extract_file_facts(path: Path, text: str) -> FileFacts:
    suffix = path.suffix.lower()
    if suffix == ".py":
        return extract_python_file(path, text)
    if suffix in {".ts", ".tsx", ".js", ".jsx"}:
        return extract_js_ts_file(path, text)
    if suffix == ".html":
        return extract_html_file(path, text)
    if suffix == ".css":
        return extract_css_file(path, text)
    return FileFacts(source_path=path.as_posix(), language=detect_language(path), source_hash=compute_hash(text), file_role="Unsupported file type for detailed extraction.", confidence="Low")

def facts_to_json_dict(facts: FileFacts) -> dict[str, Any]:
    return {
        "source_path": facts.source_path,
        "language": facts.language,
        "source_hash": facts.source_hash,
        "file_role": facts.file_role,
        "imports": facts.imports,
        "exports": facts.exports,
        "top_level_definitions": facts.top_level_definitions,
        "functional_groups": facts.functional_groups,
        "section_summaries": [
            {"name": item.name, "category": item.category, "line_start": item.line_start, "line_end": item.line_end, "responsibility": item.responsibility, "logic_note": item.logic_note}
            for item in facts.section_summaries
        ],
        "logic_notes": facts.logic_notes,
        "related_files": facts.related_files,
        "confidence": facts.confidence,
    }

def facts_to_markdown(facts: FileFacts, display_path: str) -> str:
    lines: list[str] = []
    lines.append(f"# AST Summary: {display_path}")
    lines.append("")
    lines.append("## Summary Status")
    lines.append(f"- Source file last reviewed: {date.today().isoformat()}")
    lines.append(f"- Summary confidence: {facts.confidence}")
    lines.append("- Structural freshness: Current")
    lines.append(f"- Source hash: `{facts.source_hash[:16]}`")
    lines.append("")
    lines.append("## File Role")
    lines.append(facts.file_role)
    lines.append("")
    if facts.imports:
        lines.append("## Imports / Dependencies")
        for item in facts.imports:
            lines.append(f"- {item}")
        lines.append("")
    if facts.exports:
        lines.append("## Exports / Public Surface")
        for item in facts.exports:
            lines.append(f"- `{item}`")
        lines.append("")
    if facts.top_level_definitions:
        lines.append("## Key Structure")
        for item in facts.top_level_definitions:
            lines.append(f"- `{item}`")
        lines.append("")
    if facts.functional_groups:
        lines.append("## Functional Groups")
        for item in facts.functional_groups:
            lines.append(f"- {item}")
        lines.append("")
    if facts.section_summaries:
        lines.append("## Section Summaries")
        for item in facts.section_summaries:
            lines.append(f"### `{item.name}`")
            lines.append(f"- Category: {item.category}")
            lines.append(f"- Responsibility: {item.responsibility}")
            if item.line_start is not None:
                lines.append(f"- Location: {line_range_text(item.line_start, item.line_end)}")
            if item.logic_note:
                lines.append(f"- Note: {item.logic_note}")
            lines.append("")
    if facts.related_files:
        lines.append("## Related Files")
        for item in facts.related_files:
            lines.append(f"- `{item}`")
        lines.append("")
    if facts.logic_notes:
        lines.append("## Important Logic Notes")
        for item in facts.logic_notes:
            lines.append(f"- {item}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"

def process_single_file() -> None:
    if not INPUT_FILE.strip():
        raise ValueError("INPUT_FILE is required in single mode.")
    source_path = Path(INPUT_FILE).expanduser().resolve()
    if not source_path.exists():
        raise FileNotFoundError(f"Input file not found: {source_path}")
    print_progress(f"Processing single file: {source_path}")
    text = safe_read_text(source_path)
    facts = extract_file_facts(source_path, text)
    output_md = single_output_path(source_path)
    if summary_is_current(output_md, facts.source_hash):
        print_progress(f"Skipped unchanged summary: {output_md}")
        return
    write_text_file(output_md, facts_to_markdown(facts, source_path.as_posix()))
    if WRITE_JSON_FACTS:
        write_json_file(source_path.with_name(f"{source_path.name}.ast_summary.facts.json"), facts_to_json_dict(facts))
    print_progress(f"Summary written: {output_md}")

def process_repo() -> None:
    if not REPO_ROOT.strip():
        raise ValueError("REPO_ROOT is required in repo mode.")
    repo_root = Path(REPO_ROOT).expanduser().resolve()
    if not repo_root.exists():
        raise FileNotFoundError(f"Repo root not found: {repo_root}")
    files = collect_repo_files(repo_root)
    print_progress(f"Repo root: {repo_root}")
    print_progress(f"Selected files: {len(files)}")
    for index, source_path in enumerate(files, start=1):
        try:
            text = safe_read_text(source_path)
            facts = extract_file_facts(source_path, text)
            output_md = repo_output_path(repo_root, source_path)
            if summary_is_current(output_md, facts.source_hash):
                print_progress(f"[{index}/{len(files)}] Skipped unchanged: {relative_or_absolute(source_path, repo_root)}")
                continue
            write_text_file(output_md, facts_to_markdown(facts, relative_or_absolute(source_path, repo_root)))
            if WRITE_JSON_FACTS:
                write_json_file(repo_json_facts_path(repo_root, source_path), facts_to_json_dict(facts))
            print_progress(f"[{index}/{len(files)}] Wrote: {relative_or_absolute(output_md, repo_root)}")
        except Exception as exc:
            print_progress(f"[{index}/{len(files)}] ERROR: {relative_or_absolute(source_path, repo_root)} -> {exc}")

def main() -> None:
    if MODE == "single":
        process_single_file()
        return
    if MODE == "repo":
        process_repo()
        return
    raise ValueError("MODE must be 'single' or 'repo'.")

if __name__ == "__main__":
    main()
