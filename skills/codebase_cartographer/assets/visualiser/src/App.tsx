import { ArrowLeft, CarFront, ChevronDown, ChevronRight, Eye, EyeOff, FileCode2, Filter, Folder, FolderOpen, GitBranch, House, MapPin, MousePointer2, Play, RefreshCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import GraphScene from "./GraphScene";
import type { CodeEdge, CodeExcerpt, CodeGraph, CodeNode, NodeKind, TraceIndex, TraceIndexItem, TracePlan } from "./types";

const GRAPH_URL = "/codebase_cartographer/graph.json";
const TRACE_INDEX_URL = "/codebase_cartographer/traces/trace_index.json";

const KIND_LABELS: Record<NodeKind, string> = {
  workspace: "Workspace",
  service: "Service",
  package: "Package",
  module: "Module",
  file: "File",
  config_file: "Config",
  api_endpoint: "API",
  websocket_endpoint: "WebSocket",
  route: "Route",
  background_task: "Task",
  cli_command: "CLI",
  api_client: "Client",
  component: "Component",
  hook: "Hook",
  context: "Context",
  provider: "Provider",
  page: "Page",
  layout: "Layout",
  form: "Form",
  store: "Store",
  reducer: "Reducer",
  function: "Function",
  method: "Method",
  constructor: "Constructor",
  class: "Class",
  exception: "Exception",
  decorator: "Decorator",
  schema: "Schema",
  model: "Model",
  dataclass: "Dataclass",
  pydantic_model: "Pydantic",
  typed_dict: "TypedDict",
  type: "Type",
  interface: "Interface",
  type_alias: "Type Alias",
  enum: "Enum",
  style: "Style",
  style_rule: "Style Rule",
  media_query: "Media",
  container_query: "Container",
  supports_rule: "Supports",
  keyframes: "Keyframes",
  font_face: "Font",
  css_layer: "CSS Layer",
  css_at_rule: "CSS Rule",
  html_document: "HTML Doc",
  template: "Template",
  html_element: "Element",
  database_schema: "DB Schema",
  table: "Table",
  view: "View",
  materialized_view: "Mat View",
  migration: "Migration",
  stored_procedure: "Procedure",
  sql_function: "SQL Func",
  trigger: "Trigger",
  index: "Index",
  constraint: "Constraint",
};

const KIND_ORDER: NodeKind[] = [
  "workspace",
  "service",
  "package",
  "module",
  "file",
  "config_file",
  "api_endpoint",
  "websocket_endpoint",
  "route",
  "api_client",
  "background_task",
  "cli_command",
  "component",
  "hook",
  "context",
  "provider",
  "page",
  "layout",
  "form",
  "store",
  "reducer",
  "function",
  "method",
  "constructor",
  "class",
  "exception",
  "decorator",
  "schema",
  "model",
  "dataclass",
  "pydantic_model",
  "typed_dict",
  "interface",
  "type_alias",
  "enum",
  "type",
  "style",
  "style_rule",
  "media_query",
  "container_query",
  "supports_rule",
  "keyframes",
  "font_face",
  "css_layer",
  "css_at_rule",
  "html_document",
  "template",
  "html_element",
  "database_schema",
  "table",
  "view",
  "materialized_view",
  "migration",
  "stored_procedure",
  "sql_function",
  "trigger",
  "index",
  "constraint",
];

const KIND_COLORS: Partial<Record<NodeKind, string>> = {
  workspace: "#ffdf6e",
  service: "#ffd35a",
  package: "#ffbd59",
  module: "#b5e7ff",
  file: "#fbfdff",
  config_file: "#b9fbc0",
  api_endpoint: "#ff4f78",
  websocket_endpoint: "#ff5bbd",
  route: "#ff719a",
  api_client: "#ffb000",
  background_task: "#a78bfa",
  cli_command: "#92f2ff",
  function: "#2f9dff",
  method: "#7cffb2",
  constructor: "#9af0d8",
  schema: "#ffd166",
  model: "#ffdf8a",
  dataclass: "#ffe08a",
  pydantic_model: "#ffd166",
  typed_dict: "#ffe9a8",
  class: "#c77dff",
  exception: "#f472b6",
  decorator: "#f0abfc",
  interface: "#68a8ff",
  type_alias: "#8bbcff",
  enum: "#a5b4fc",
  type: "#68a8ff",
  component: "#35d3ff",
  hook: "#7cff6b",
  context: "#45f0b5",
  provider: "#2dd4bf",
  page: "#93c5fd",
  layout: "#60a5fa",
  form: "#f9a8d4",
  store: "#facc15",
  reducer: "#fde047",
  style: "#ffe45c",
  style_rule: "#ffe45c",
  media_query: "#fef08a",
  container_query: "#fde68a",
  supports_rule: "#fcd34d",
  keyframes: "#fbbf24",
  font_face: "#f59e0b",
  css_layer: "#eab308",
  css_at_rule: "#facc15",
  html_document: "#fca5a5",
  template: "#fdba74",
  html_element: "#fb923c",
  database_schema: "#34d399",
  table: "#10b981",
  view: "#6ee7b7",
  materialized_view: "#5eead4",
  migration: "#a7f3d0",
  stored_procedure: "#2dd4bf",
  sql_function: "#22d3ee",
  trigger: "#67e8f9",
  index: "#bef264",
  constraint: "#d9f99d",
};

const KIND_RANK = new Map(KIND_ORDER.map((kind, index) => [kind, index]));
const CONTROL_KIND_COLORS: Partial<Record<NodeKind, string>> = {
  api_endpoint: "#ff7aa5",
};
const REACT_SERVICE_COLOR = "#35d3ff";

function kindColor(kind: NodeKind) {
  return KIND_COLORS[kind] ?? "#31ffc5";
}

function controlKindColor(kind: NodeKind) {
  return CONTROL_KIND_COLORS[kind] ?? kindColor(kind);
}

function displayKindLabel(kind: NodeKind) {
  return kind === "service" ? "Service / Repo / Sub Repo" : KIND_LABELS[kind];
}

function filterKindLabel(kind: NodeKind) {
  return displayKindLabel(kind);
}

function nodeColor(node: CodeNode) {
  if (node.kind === "service" && node.metadata.majority_file_type === "react") {
    return REACT_SERVICE_COLOR;
  }
  return KIND_COLORS[node.kind] ?? node.color;
}

interface RepoTreeItem {
  id: string;
  name: string;
  path: string;
  kind: "folder" | "file";
  nodeId: string | null;
  children: RepoTreeItem[];
}

function preferredStart(nodes: CodeNode[]): string {
  const preferred = nodes.find((node) => node.kind === "service" && node.metadata.service_role === "main_repo")
    ?? nodes.find((node) => node.kind === "service")
    ?? nodes.find((node) => node.kind === "api_endpoint")
    ?? nodes.find((node) => node.kind === "component")
    ?? nodes.find((node) => node.kind === "api_client")
    ?? nodes.find((node) => node.kind === "function")
    ?? nodes[0];
  return preferred?.id ?? "";
}

function formatJson(value: unknown): string {
  if (!value || (typeof value === "object" && Object.keys(value as Record<string, unknown>).length === 0)) {
    return "{}";
  }
  return JSON.stringify(value, null, 2);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isEmptyValue(value: unknown) {
  return value === null
    || value === undefined
    || value === ""
    || (Array.isArray(value) && value.length === 0)
    || (isPlainObject(value) && Object.keys(value).length === 0);
}

function codeExcerpt(node: CodeNode): CodeExcerpt | null {
  const excerpt = node.details?.code_excerpt;
  if (!excerpt || typeof excerpt.text !== "string" || !excerpt.text.trim()) {
    return null;
  }
  return excerpt;
}

function semanticPoints(node: CodeNode): string[] {
  const points = node.summary.agentic_points;
  if (!Array.isArray(points)) {
    return [];
  }
  return points.filter((point) => typeof point === "string" && point.trim());
}

function detailSections(node: CodeNode) {
  const details = node.details ?? {};
  const sections: Array<{ title: string; value: unknown }> = [
    { title: "Overview", value: details.overview ?? {
      kind: node.kind,
      language: node.language,
      file: node.file,
      line_start: node.line_start,
      line_end: node.line_end,
      status: node.deterministic_status,
    } },
  ];
  const kindSections: Record<string, string[]> = {
    api_endpoint: ["request", "response", "auth_or_dependencies", "calls", "raises", "side_effects"],
    websocket_endpoint: ["request", "response", "auth_or_dependencies", "calls", "raises", "side_effects"],
    api_client: ["api", "interface", "calls", "react"],
    function: ["interface", "calls", "raises", "side_effects"],
    method: ["interface", "calls", "raises", "side_effects"],
    constructor: ["interface", "calls", "raises", "side_effects"],
    background_task: ["interface", "calls", "raises", "side_effects"],
    cli_command: ["interface", "calls", "raises", "side_effects"],
    class: ["fields", "methods", "inheritance"],
    exception: ["fields", "methods", "inheritance"],
    schema: ["fields"],
    model: ["fields"],
    dataclass: ["fields", "methods", "inheritance"],
    pydantic_model: ["fields", "methods", "inheritance"],
    typed_dict: ["fields"],
    interface: ["fields", "interface"],
    type_alias: ["fields", "type_alias"],
    enum: ["fields"],
    component: ["react", "interface", "api", "calls"],
    hook: ["react", "interface", "api", "calls"],
    context: ["react", "interface", "calls"],
    provider: ["react", "interface", "calls"],
    page: ["react", "interface", "api", "calls"],
    layout: ["react", "interface", "calls"],
    form: ["react", "interface", "api", "calls"],
    store: ["interface", "calls"],
    reducer: ["interface", "calls"],
    style: ["style"],
    style_rule: ["style"],
    media_query: ["style"],
    container_query: ["style"],
    supports_rule: ["style"],
    keyframes: ["style"],
    font_face: ["style"],
    css_layer: ["style"],
    css_at_rule: ["style"],
    html_document: ["html"],
    template: ["html"],
    html_element: ["html"],
    table: ["sql"],
    view: ["sql"],
    materialized_view: ["sql"],
    migration: ["sql"],
    stored_procedure: ["sql"],
    sql_function: ["sql"],
    trigger: ["sql"],
    index: ["sql"],
    constraint: ["sql"],
    config_file: ["config"],
    file: ["file"],
    module: ["file"],
    package: ["file"],
  };
  for (const key of kindSections[node.kind] ?? []) {
    if (!isEmptyValue(details[key])) {
      sections.push({ title: titleCase(key), value: details[key] });
    }
  }
  return sections;
}

function contractSections(node: CodeNode) {
  const sections = [];
  if (["api_endpoint", "websocket_endpoint", "api_client"].includes(node.kind)) {
    sections.push({ title: "Request", contract: node.contracts.request });
    sections.push({ title: "Response", contract: node.contracts.response });
  } else if (["function", "method", "constructor", "hook", "background_task", "cli_command"].includes(node.kind)) {
    sections.push({ title: "Inputs", contract: node.contracts.request });
    sections.push({ title: "Returns", contract: node.contracts.response });
  } else if (["component", "form", "page", "layout", "provider"].includes(node.kind)) {
    sections.push({ title: "Props", contract: node.contracts.request });
    sections.push({ title: "Rendered Output", contract: node.contracts.response });
  } else if (["table", "view", "materialized_view"].includes(node.kind)) {
    sections.push({ title: "Columns", contract: node.contracts.response });
  }
  return sections;
}

function traceStepForNode(trace: TracePlan | null, nodeId: string) {
  return trace?.steps.find((step) => step.node_id === nodeId) ?? null;
}

function connectionLabel(edge: CodeEdge, nodesById: Map<string, CodeNode>) {
  const source = nodesById.get(edge.source)?.label ?? edge.source;
  const target = nodesById.get(edge.target)?.label ?? edge.target;
  return `${source} -> ${target}`;
}

function connectionMetadata(edge: CodeEdge) {
  const metadata = edge.metadata ?? {};
  const relationship = typeof metadata.relationship_type === "string" ? titleCase(metadata.relationship_type) : null;
  const confidence = typeof metadata.confidence === "number"
    ? `${Math.round(metadata.confidence * 100)}% confidence`
    : typeof metadata.confidence === "string" ? metadata.confidence : null;
  const source = typeof metadata.source === "string" ? titleCase(metadata.source) : null;
  return [relationship, confidence, source].filter(Boolean).join(" | ");
}

function buildRepoTree(nodes: CodeNode[]): RepoTreeItem[] {
  const root: RepoTreeItem = { id: "repo", name: "repo", path: "", kind: "folder", nodeId: null, children: [] };
  const serviceByPath = new Map(nodes.filter((node) => node.kind === "service").map((node) => [node.file || node.label, node.id]));
  const fileNodes = nodes.filter((node) => node.kind === "file" && node.file);
  const fileNodeByPath = new Map(fileNodes.map((node) => [node.file, node.id]));
  for (const filePath of [...fileNodeByPath.keys()].sort((a, b) => a.localeCompare(b))) {
    const parts = filePath.split("/").filter(Boolean);
    let cursor = root;
    let currentPath = "";
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;
      let child = cursor.children.find((item) => item.name === part && item.kind === (isFile ? "file" : "folder"));
      if (!child) {
        child = {
          id: `${isFile ? "file" : "folder"}:${currentPath}`,
          name: part,
          path: currentPath,
          kind: isFile ? "file" : "folder",
          nodeId: isFile ? fileNodeByPath.get(filePath) ?? null : serviceByPath.get(currentPath) ?? null,
          children: [],
        };
        cursor.children.push(child);
      }
      cursor = child;
    });
  }
  function sortTree(items: RepoTreeItem[]) {
    items.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    items.forEach((item) => sortTree(item.children));
  }
  sortTree(root.children);
  return root.children;
}

function filterRepoTree(items: RepoTreeItem[], query: string, nodesById: Map<string, CodeNode>): RepoTreeItem[] {
  const normalised = query.trim().toLowerCase();
  if (!normalised) {
    return items;
  }
  return items.flatMap((item) => {
    const node = item.nodeId ? nodesById.get(item.nodeId) : null;
    const searchable = `${item.name} ${item.path} ${node?.kind ?? ""} ${node?.summary.deterministic ?? ""}`.toLowerCase();
    const children = filterRepoTree(item.children, query, nodesById);
    if (searchable.includes(normalised) || children.length) {
      return [{ ...item, children }];
    }
    return [];
  });
}

function serviceDirectory(node: CodeNode) {
  const directory = node.metadata.directory;
  return typeof directory === "string" && directory.trim() ? directory : node.file;
}

function nodeBelongsToService(node: CodeNode, service: CodeNode) {
  const directory = serviceDirectory(service);
  if (!directory || directory === ".") {
    return node.id === service.id;
  }
  return node.id === service.id || node.file === directory || node.file.startsWith(`${directory}/`);
}

function hiddenNodeIdsForServices(nodes: CodeNode[], hiddenServiceIds: Set<string>) {
  if (!hiddenServiceIds.size) {
    return new Set<string>();
  }
  const services = nodes.filter((node) => hiddenServiceIds.has(node.id));
  return new Set(nodes.filter((node) => services.some((service) => nodeBelongsToService(node, service))).map((node) => node.id));
}

function filterGraph(graph: CodeGraph, hiddenNodeIds: Set<string>): CodeGraph {
  if (!hiddenNodeIds.size) {
    return graph;
  }
  const nodes = graph.nodes.filter((node) => !hiddenNodeIds.has(node.id));
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  const visibleEdgeIds = new Set(edges.map((edge) => edge.id));
  const perspectives = Object.fromEntries(Object.entries(graph.perspectives).map(([key, perspective]) => [key, {
    ...perspective,
    node_ids: perspective.node_ids.filter((nodeId) => visibleNodeIds.has(nodeId)),
    edge_ids: perspective.edge_ids.filter((edgeId) => visibleEdgeIds.has(edgeId)),
  }]));
  return { ...graph, nodes, edges, perspectives };
}

function App() {
  const [graph, setGraph] = useState<CodeGraph | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [startId, setStartId] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [activeKinds, setActiveKinds] = useState<Set<NodeKind>>(new Set(KIND_ORDER));
  const [query, setQuery] = useState("");
  const [treeQuery, setTreeQuery] = useState("");
  const [expandedTree, setExpandedTree] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"explore" | "ask_trace" | "fun">("explore");
  const [traceIndex, setTraceIndex] = useState<TraceIndexItem[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState("");
  const [activeTrace, setActiveTrace] = useState<TracePlan | null>(null);
  const [showSelectedOverlays, setShowSelectedOverlays] = useState(true);
  const [showHoverOverlays, setShowHoverOverlays] = useState(true);
  const [hiddenServiceIds, setHiddenServiceIds] = useState<Set<string>>(new Set());
  const [resetViewSignal, setResetViewSignal] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [funSpeedLevel, setFunSpeedLevel] = useState(0.4);

  useEffect(() => {
    fetch(GRAPH_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Graph request failed with ${response.status}`);
        }
        return response.json();
      })
      .then((payload: CodeGraph) => {
        setGraph(payload);
        const initial = preferredStart(payload.nodes);
        setSelectedId("");
        setStartId(initial);
        setExpandedTree(new Set());
      })
      .catch((error: Error) => {
        setLoadError(error.message);
      });
  }, []);

  useEffect(() => {
    fetch(TRACE_INDEX_URL)
      .then((response) => response.ok ? response.json() : { traces: [] })
      .then((payload: TraceIndex) => {
        const traces = payload.traces ?? [];
        setTraceIndex(traces);
        if (traces.length) {
          setSelectedTraceId(traces[0].trace_id);
        }
      })
      .catch(() => {
        setTraceIndex([]);
      });
  }, []);

  useEffect(() => {
    const item = traceIndex.find((trace) => trace.trace_id === selectedTraceId);
    if (!item) {
      setActiveTrace(null);
      return;
    }
    fetch(`/codebase_cartographer/traces/${item.path}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Trace request failed with ${response.status}`);
        }
        return response.json();
      })
      .then((payload: TracePlan) => {
        setActiveTrace(payload);
      })
      .catch(() => {
        setActiveTrace(null);
      });
  }, [selectedTraceId, traceIndex]);

  const allNodesById = useMemo(() => new Map((graph?.nodes ?? []).map((node) => [node.id, node])), [graph]);
  const hiddenNodeIds = useMemo(() => hiddenNodeIdsForServices(graph?.nodes ?? [], hiddenServiceIds), [graph, hiddenServiceIds]);
  const hiddenServicePaths = useMemo(() => (graph?.nodes ?? [])
    .filter((node) => hiddenServiceIds.has(node.id))
    .map(serviceDirectory)
    .filter((item): item is string => Boolean(item && item !== ".")),
  [graph, hiddenServiceIds]);
  const visibleGraph = useMemo(() => graph ? filterGraph(graph, hiddenNodeIds) : null, [graph, hiddenNodeIds]);
  const isFunMode = mode === "fun";
  const isAskTraceMode = mode === "ask_trace";
  const navigationLevel = isFunMode ? funSpeedLevel : zoomLevel;
  const navigationIndicatorColor = isFunMode && funSpeedLevel < 0.4 ? "#ff4f5f" : "#ffd35a";
  const sceneGraph = isFunMode || isAskTraceMode ? graph : visibleGraph;
  const sceneActiveKinds = useMemo(() => isFunMode ? new Set(KIND_ORDER) : activeKinds, [activeKinds, isFunMode]);
  const nodesById = useMemo(() => new Map((sceneGraph?.nodes ?? []).map((node) => [node.id, node])), [sceneGraph]);
  const selectedNode = selectedId ? nodesById.get(selectedId) ?? null : null;
  const repoTree = useMemo(() => buildRepoTree(graph?.nodes ?? []), [graph]);
  const visibleRepoTree = useMemo(() => filterRepoTree(repoTree, treeQuery, allNodesById), [allNodesById, repoTree, treeQuery]);
  const availableKinds = useMemo(() => {
    if (!graph) {
      return [];
    }
    const kinds = new Set(graph.nodes.map((node) => node.kind));
    return KIND_ORDER.filter((kind) => kinds.has(kind));
  }, [graph]);
  const kindFilterLevels = useMemo(() => {
    const primaryKinds: NodeKind[][] = [["service"], ["file", "config_file"]];
    const assignedKinds = new Set(primaryKinds.flat());
    const levels = primaryKinds
      .map((level) => level.filter((kind) => availableKinds.includes(kind)))
      .filter((level) => level.length);
    const remainingKinds = availableKinds.filter((kind) => !assignedKinds.has(kind));
    return remainingKinds.length ? [...levels, remainingKinds] : levels;
  }, [availableKinds]);
  const perspectiveIds = useMemo(() => new Set(sceneGraph?.perspectives.overview?.node_ids ?? sceneGraph?.nodes.map((node) => node.id) ?? []), [sceneGraph]);
  const focusedPerspectiveIds = useMemo(() => {
    const ids = new Set(perspectiveIds);
    if (activeTrace) {
      activeTrace.steps.forEach((step) => ids.add(step.node_id));
    }
    return ids;
  }, [activeTrace, perspectiveIds]);
  const scenePerspectiveIds = useMemo(() => isFunMode ? new Set(graph?.nodes.map((node) => node.id) ?? []) : focusedPerspectiveIds, [focusedPerspectiveIds, graph, isFunMode]);
  const selectedConnections = useMemo(() => {
    if (!sceneGraph || !selectedId) {
      return [];
    }
    return sceneGraph.edges.filter((edge) => edge.source === selectedId || edge.target === selectedId);
  }, [sceneGraph, selectedId]);
  const nodeOptions = useMemo(() => {
    if (!sceneGraph) {
      return [];
    }
    const normalisedQuery = query.trim().toLowerCase();
    return sceneGraph.nodes
      .filter((node) => perspectiveIds.has(node.id))
      .filter((node) => !normalisedQuery || `${node.label} ${node.kind} ${node.file}`.toLowerCase().includes(normalisedQuery))
      .sort((a, b) => (KIND_RANK.get(a.kind) ?? 99) - (KIND_RANK.get(b.kind) ?? 99) || a.label.localeCompare(b.label))
      .slice(0, 240);
  }, [perspectiveIds, query, sceneGraph]);
  const selectedTraceStep = selectedNode ? traceStepForNode(activeTrace, selectedNode.id) : null;
  const selectedCodeExcerpt = selectedNode ? codeExcerpt(selectedNode) : null;
  const selectedSemanticPoints = selectedNode ? semanticPoints(selectedNode) : [];

  useEffect(() => {
    if (mode === "explore" && selectedId && hiddenNodeIds.has(selectedId)) {
      setSelectedId("");
      setHistory([]);
    }
  }, [hiddenNodeIds, mode, selectedId]);

  function selectStart(nodeId: string) {
    setStartId(nodeId);
    setSelectedId(nodeId);
    setHistory([]);
  }

  function navigateTo(nodeId: string) {
    if (nodeId === selectedId) {
      return;
    }
    setHistory((items) => [...items, selectedId].filter(Boolean));
    setSelectedId(nodeId);
  }

  function deselectNode() {
    if (!selectedId) {
      return;
    }
    setHistory((items) => [...items, selectedId].filter(Boolean));
    setSelectedId("");
  }

  function toggleTreePath(path: string) {
    setExpandedTree((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function goBack() {
    setHistory((items) => {
      const next = [...items];
      const previous = next.pop();
      if (previous) {
        setSelectedId(previous);
      }
      return next;
    });
  }

  function resetToStart() {
    setSelectedId(startId);
    setHistory([]);
  }

  function toggleKind(kind: NodeKind) {
    setActiveKinds((current) => {
      const next = new Set(current);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
  }

  function toggleServiceVisibility(nodeId: string) {
    setHiddenServiceIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
    setResetViewSignal((value) => value + 1);
  }

  function resetView() {
    setResetViewSignal((value) => value + 1);
  }

  function toggleFunMode() {
    if (isFunMode) {
      setMode("explore");
      setResetViewSignal((value) => value + 1);
      return;
    }
    setMode("fun");
    setSelectedId("");
    setHistory([]);
  }

  function renderTreeItem(item: RepoTreeItem, depth = 0) {
    const expanded = expandedTree.has(item.path) || Boolean(treeQuery.trim());
    const node = item.nodeId ? allNodesById.get(item.nodeId) : null;
    const selected = item.nodeId === selectedId;
    const pathHidden = hiddenServicePaths.some((path) => item.path === path || item.path.startsWith(`${path}/`));
    const hidden = item.nodeId ? hiddenNodeIds.has(item.nodeId) : pathHidden;
    const isService = node?.kind === "service";
    const serviceHidden = Boolean(isService && node && hiddenServiceIds.has(node.id));
    const canFocus = Boolean(item.nodeId && !hidden);
    const Icon = item.kind === "folder" ? expanded ? FolderOpen : Folder : FileCode2;
    const itemStyle = {
      paddingLeft: `${depth * 14 + 8}px`,
      "--node-color": node ? nodeColor(node) : "#31ffc5",
    } as CSSProperties;
    return (
      <li key={item.id}>
        <div
          className={`tree-item ${selected ? "selected" : ""} ${canFocus ? "focusable" : ""} ${hidden ? "hidden" : ""}`}
          style={itemStyle}
        >
          {item.kind === "folder" ? (
            <button type="button" className="tree-chevron" onClick={() => toggleTreePath(item.path)} aria-label={expanded ? "Collapse folder" : "Expand folder"}>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="tree-spacer" />
          )}
          <button type="button" className="tree-target" disabled={!canFocus} onClick={() => item.nodeId && navigateTo(item.nodeId)} title={item.path}>
            <Icon size={14} />
            <span>{item.name}</span>
            {node && <small>{KIND_LABELS[node.kind]}</small>}
          </button>
          {isService && node ? (
            <button
              type="button"
              className="tree-visibility"
              onClick={(event) => {
                event.stopPropagation();
                toggleServiceVisibility(node.id);
              }}
              aria-label={serviceHidden ? "Show service" : "Hide service"}
              title={serviceHidden ? "Show service" : "Hide service"}
            >
              {serviceHidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          ) : (
            <span className="tree-visibility-spacer" />
          )}
        </div>
        {item.children.length > 0 && expanded && !serviceHidden && (
          <ul>
            {item.children.map((child) => renderTreeItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  if (loadError) {
    return (
      <main className="app-shell">
        <section className="empty-state">
          <h1>Codebase Cartographer</h1>
          <p>{loadError}</p>
        </section>
      </main>
    );
  }

  if (!graph) {
    return (
      <main className="app-shell">
        <section className="empty-state">
          <h1>Codebase Cartographer</h1>
          <p>Loading graph.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${isFunMode ? "fun-mode-active" : ""}`}>
      <aside className="control-panel">
        <section className="overview-block">
          <div className="brand-block">
            <span className="status-dot" />
            <div>
              <h1>{graph.repo.name}</h1>
              <p>{graph.validation.status} graph</p>
            </div>
          </div>

          <label className="field-label">Mode</label>
          <div className="mode-toggle" role="tablist" aria-label="Visualiser mode">
            <button type="button" className={mode === "explore" ? "active" : ""} onClick={() => setMode("explore")}>
              <GitBranch size={15} />
              Explore
            </button>
            <button type="button" className={mode === "ask_trace" ? "active" : ""} onClick={() => { setMode("ask_trace"); setSelectedId(""); setHistory([]); }} disabled={!activeTrace}>
              <Play size={15} />
              Ask & Trace
            </button>
          </div>

          {mode === "ask_trace" && traceIndex.length > 0 ? (
            <>
              <label className="field-label" htmlFor="trace-select">Trace</label>
              <select id="trace-select" value={selectedTraceId} onChange={(event) => { setSelectedTraceId(event.target.value); setSelectedId(""); setHistory([]); }}>
                {traceIndex.map((trace) => (
                  <option key={trace.trace_id} value={trace.trace_id}>{trace.question}</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label className="field-label" htmlFor="node-search">Focus search</label>
              <div className="search-box">
                <Search size={16} />
                <input id="node-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find any node" />
              </div>
              <select value={startId} onChange={(event) => selectStart(event.target.value)} size={4} className="node-select">
                {nodeOptions.map((node) => (
                  <option key={node.id} value={node.id}>{KIND_LABELS[node.kind]} | {node.label}</option>
                ))}
              </select>
            </>
          )}
        </section>

        <section className="repo-tree-block">
          <div className="section-title">
            <Folder size={16} />
            <span>Repo Tree</span>
          </div>
          <div className="search-box tree-search">
            <Search size={15} />
            <input value={treeQuery} onChange={(event) => setTreeQuery(event.target.value)} placeholder="Filter files" />
          </div>
          <nav className="repo-tree" aria-label="Repository files">
            <ul>
              {visibleRepoTree.map((item) => renderTreeItem(item))}
            </ul>
          </nav>
        </section>

        <section className="filter-block">
          <div className="section-title">
            <Filter size={16} />
            <span>Node types</span>
          </div>
          <div className="kind-grid">
            {kindFilterLevels.map((level, index) => (
              <div key={level.join("-")} className={`kind-level kind-level-${index + 1}`}>
                {level.map((kind) => (
                  <label key={kind} className="kind-toggle" style={{ "--kind-color": controlKindColor(kind) } as CSSProperties}>
                    <input type="checkbox" checked={activeKinds.has(kind)} onChange={() => toggleKind(kind)} />
                    <span>{filterKindLabel(kind)}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="summary-block">
          <h2>Architecture Summary</h2>
          <p>{graph.summary.agentic ?? graph.summary.deterministic}</p>
          <dl>
            <div><dt>Nodes</dt><dd>{graph.nodes.length}</dd></div>
            <div><dt>Edges</dt><dd>{graph.edges.length}</dd></div>
            <div><dt>Generated</dt><dd>{new Date(graph.generated_at).toLocaleString()}</dd></div>
          </dl>
        </section>
      </aside>

      <section className="graph-stage" aria-label="Code graph">
        <GraphScene
          graph={sceneGraph ?? graph}
          selectedId={selectedId}
          activeKinds={sceneActiveKinds}
          perspectiveIds={scenePerspectiveIds}
          activeTrace={mode === "ask_trace" ? activeTrace : null}
          funMode={isFunMode}
          resetViewSignal={resetViewSignal}
          showSelectedOverlays={showSelectedOverlays}
          showHoverOverlays={showHoverOverlays}
          onZoomChange={setZoomLevel}
          onFunSpeedChange={setFunSpeedLevel}
          onSelect={navigateTo}
          onDeselect={deselectNode}
        />

        <aside className="detail-rail">
          <div className="selected-card">
            {selectedNode ? (
              <>
                <span className="node-kind" style={{ color: nodeColor(selectedNode) }}>{displayKindLabel(selectedNode.kind)}</span>
                <h2>{selectedNode.label}</h2>
                <p>{selectedNode.file}{selectedNode.line_start ? `:${selectedNode.line_start}` : ""}</p>
              </>
            ) : (
              <>
                <span className="node-kind">No selection</span>
                <h2>No node selected</h2>
                <p>Left-click any node to inspect it.</p>
              </>
            )}
            {mode === "ask_trace" && activeTrace && (
              <div className="trace-chip">
                <Play size={14} />
                <span>{activeTrace.question}</span>
              </div>
            )}
          </div>

          <div className="node-details">
            <h3>Details</h3>
            {selectedNode ? (
              <>
                <section>
                  <h4>Summary</h4>
                  <p>{selectedNode.summary.agentic ?? selectedNode.summary.deterministic}</p>
                  {selectedSemanticPoints.length > 0 && (
                    <details className="semantic-breakdown">
                      <summary>
                        <span>Semantic Breakdown</span>
                        <small>{selectedSemanticPoints.length} insights</small>
                      </summary>
                      <ul>
                        {selectedSemanticPoints.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {selectedCodeExcerpt && (
                    <div className="code-excerpt">
                      <pre>{selectedCodeExcerpt.text}</pre>
                      <p className="contract-status">
                        {selectedCodeExcerpt.file}:{selectedCodeExcerpt.line_start}-{selectedCodeExcerpt.line_end}
                        {selectedCodeExcerpt.omitted_lines > 0 ? ` | ${selectedCodeExcerpt.omitted_lines} lines omitted` : ""}
                      </p>
                    </div>
                  )}
                </section>
                {selectedTraceStep && (
                  <section className="trace-step-detail">
                    <h4>Ask & Trace Step</h4>
                    <p><strong>{selectedTraceStep.title}</strong></p>
                    <p>{selectedTraceStep.explanation || "No extra explanation recorded."}</p>
                    <p className="contract-status">{selectedTraceStep.phase} | {selectedTraceStep.confidence}</p>
                  </section>
                )}
                {contractSections(selectedNode).map((item) => (
                  <section key={item.title}>
                    <h4>{item.title}</h4>
                    <pre>{formatJson(item.contract.shape)}</pre>
                    <p className="contract-status">{item.contract.status} via {item.contract.source}</p>
                  </section>
                ))}
                {detailSections(selectedNode).map((item) => (
                  <section key={item.title}>
                    <h4>{item.title}</h4>
                    <pre>{formatJson(item.value)}</pre>
                  </section>
                ))}
                <section>
                  <h4>Evidence</h4>
                  <ul>
                    {selectedNode.evidence.map((item, index) => (
                      <li key={`${item.kind}-${index}`}>{item.kind} | {item.file}{item.line_start ? `:${item.line_start}` : ""} | {item.detail}</li>
                    ))}
                  </ul>
                </section>
              </>
            ) : (
              <section>
                <h4>Selection</h4>
                <p>Blank space is selected. Choose a node from the graph, Repo Tree, Focus Search, or Trace path to view details.</p>
              </section>
            )}
          </div>

          <div className="connection-list">
            <h3>Connections</h3>
            {selectedConnections.map((edge) => {
              const nextId = edge.source === selectedId ? edge.target : edge.source;
              const nextNode = nodesById.get(nextId);
              const metadata = connectionMetadata(edge);
              return (
                <button key={edge.id} type="button" onClick={() => navigateTo(nextId)} style={{ "--node-color": nextNode ? nodeColor(nextNode) : "#eef6ff" } as CSSProperties}>
                  <span>{edge.kind}</span>
                  <strong>{nextNode?.label ?? nextId}</strong>
                  <small>{edge.reason.agentic ?? edge.reason.deterministic}</small>
                  {metadata && <small>{metadata}</small>}
                </button>
              );
            })}
            {!selectedConnections.length && <p>No deterministic connections recorded.</p>}
          </div>
        </aside>
      </section>

      <nav className={`navigation-panel ${isFunMode ? "fun-navigation" : ""}`} aria-label="Graph navigation">
        {isFunMode && (
          <div className="fun-control-legend" aria-label="Vehicle controls">
            <span>Left click: select / unselect node</span>
            <span>Right click: stop</span>
            <span>Scroll up: forward</span>
            <span>Scroll down: reverse</span>
            <span>Cursor from center: steer</span>
          </div>
        )}
        <div className="zoom-indicator" style={{ "--zoom-level": `${Math.round(navigationLevel * 100)}%`, "--indicator-color": navigationIndicatorColor } as CSSProperties} aria-label={isFunMode ? "Vehicle speed" : "Scene zoom level"}>
          <input type="range" min="0" max="100" value={Math.round(navigationLevel * 100)} onChange={() => undefined} aria-label={isFunMode ? "Vehicle speed" : "Zoom level"} />
        </div>
        {!isFunMode && (
          <>
            <button type="button" onClick={goBack} disabled={!history.length} aria-label="Back one node" title="Back one node">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <button type="button" onClick={resetToStart} disabled={selectedId === startId} aria-label="Return to home" title="Return to home">
              <House size={18} />
              <span>Home</span>
            </button>
            <button type="button" onClick={() => selectedId && setStartId(selectedId)} disabled={!selectedId} aria-label="Set selected as home" title="Set selected as home">
              <MapPin size={18} />
              <span>Set Home</span>
            </button>
          </>
        )}
        <button type="button" className={`fun-mode-button ${isFunMode ? "active" : ""}`} onClick={toggleFunMode} aria-label={isFunMode ? "Exit Fun mode" : "Enter Fun mode"} title={isFunMode ? "Exit Fun mode" : "Enter Fun mode"}>
          <CarFront size={18} />
        </button>
        {!isFunMode && (
          <>
            <button type="button" onClick={resetView} aria-label="Reset view" title="Reset view">
              <RefreshCcw size={18} />
              <span>Reset View</span>
            </button>
            <button type="button" onClick={() => setShowSelectedOverlays((value) => !value)} aria-label={showSelectedOverlays ? "Hide selected overlays" : "Show selected overlays"} title={showSelectedOverlays ? "Hide selected overlays" : "Show selected overlays"}>
              {showSelectedOverlays ? <Eye size={18} /> : <EyeOff size={18} />}
              <span>{showSelectedOverlays ? "Labels On" : "Labels Off"}</span>
            </button>
          </>
        )}
        {isFunMode && (
          <button type="button" onClick={() => setShowSelectedOverlays((value) => !value)} aria-label={showSelectedOverlays ? "Hide selected overlays" : "Show selected overlays"} title={showSelectedOverlays ? "Hide selected overlays" : "Show selected overlays"}>
            {showSelectedOverlays ? <Eye size={18} /> : <EyeOff size={18} />}
            <span>{showSelectedOverlays ? "Labels On" : "Labels Off"}</span>
          </button>
        )}
        <button type="button" onClick={() => setShowHoverOverlays((value) => !value)} aria-label={showHoverOverlays ? "Hide hover labels" : "Show hover labels"} title={showHoverOverlays ? "Hide hover labels" : "Show hover labels"}>
          <MousePointer2 size={18} />
          <span>{showHoverOverlays ? "Hover On" : "Hover Off"}</span>
        </button>
      </nav>
    </main>
  );
}

export default App;
