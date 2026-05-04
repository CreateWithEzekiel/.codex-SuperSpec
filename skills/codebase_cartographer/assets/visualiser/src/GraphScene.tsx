import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import type { CodeEdge, CodeGraph, CodeNode, NodeKind, TracePlan } from "./types";

const MAX_DEPTH = 4;
const MAX_PACKET_COUNT = 90;
const PACKET_SPEED_UNITS_PER_MS = 0.16;
const PACKET_MIN_TRAVEL_MS = 420;
const PACKET_REST_MS = 20000;
const PACKET_STAGGER_MS = 2000;
const PACKET_INITIAL_BURST = 10;
const PACKET_PAIR_BURST = 2;
const TRACE_PACKET_REST_MS = 650;
const TRACE_PACKET_STAGGER_MS = 420;
const TRACE_PACKET_INITIAL_BURST = 16;
const TRACE_PACKET_PAIR_BURST = 8;
const TRACE_DIM_FACTOR = 0.4;
const TRACE_LINE_COLOR = "#ffffff";
const OVERLAY_UPDATE_MS = 16;
const HOVER_PICK_RADIUS_PX = 34;
const HOVER_SPREAD_RADIUS = 190;
const HOVER_SPREAD_STRENGTH = 96;
const HOVER_SPREAD_EASE = 0.18;
const SELECTED_SPREAD_RADIUS = 230;
const SELECTED_SPREAD_STRENGTH = 74;
const IMPORT_DIRECTION_MARKER_LENGTH = 8;
const IMPORT_DIRECTION_MARKER_RADIUS = 3.2;
const IMPORT_DIRECTION_MARKER_MAX_COUNT = 4;
const IMPORT_DIRECTION_MARKER_TAIL_LENGTH = 34;
const IMPORT_DIRECTION_MARKER_LENGTH_PER_ARROW = 260;
const STATIC_STAR_COUNT = 4000;
const SHOOTING_STAR_COUNT = 18;
const SHOOTING_STAR_MIN_DELAY_MS = 650;
const SHOOTING_STAR_MAX_DELAY_MS = 3600;
const FUN_SKY_TEXTURE_URL = "/assets/fun/space-panorama.svg";
const FUN_MAX_FORWARD_SPEED = 0.48;
const FUN_MAX_REVERSE_SPEED = -0.32;
const FUN_SCROLL_SPEED_STEP = 0.00022;
const FUN_STEER_DEAD_ZONE = 0.14;
const FUN_BASE_TURN_RATE = 0.00024;
const FUN_EXTRA_TURN_RATE = 0.00125;
const FUN_MAX_PITCH = THREE.MathUtils.degToRad(89);
const FUN_CAMERA_DISTANCE = 172;
const FUN_CAMERA_HEIGHT = 66;
const FUN_LOOK_AHEAD = 210;
const FUN_PROXIMITY_RADIUS = 155;
const FUN_HOVER_PROXIMITY_RADIUS = FUN_PROXIMITY_RADIUS * 5;
const FUN_BOUNDARY_BUFFER = 560;
const FUN_BOUNDARY_SLOW_RADIUS = 620;
const KIND_LABELS: Partial<Record<NodeKind, string>> = {
  service: "Service",
  api_endpoint: "API",
  websocket_endpoint: "WebSocket",
  api_client: "Client",
  component: "Component",
  hook: "Hook",
  page: "Page",
  layout: "Layout",
  form: "Form",
  function: "Function",
  method: "Method",
  constructor: "Constructor",
  class: "Class",
  schema: "Schema",
  pydantic_model: "Pydantic",
  dataclass: "Dataclass",
  typed_dict: "TypedDict",
  interface: "Interface",
  type_alias: "Type Alias",
  enum: "Enum",
  style_rule: "Style",
  table: "Table",
  migration: "Migration",
  file: "File",
};

const KIND_RANK: Partial<Record<NodeKind, number>> = {
  workspace: 0,
  service: 0,
  package: 1,
  module: 2,
  file: 3,
  config_file: 4,
  api_endpoint: 5,
  websocket_endpoint: 6,
  api_client: 7,
  component: 8,
  page: 9,
  layout: 10,
  form: 11,
  hook: 12,
  function: 13,
  method: 14,
  constructor: 15,
  schema: 16,
  pydantic_model: 17,
  dataclass: 18,
  typed_dict: 19,
  interface: 20,
  type_alias: 21,
  enum: 22,
  class: 23,
  table: 24,
  view: 25,
  migration: 26,
  style_rule: 27,
  style: 28,
};

const VISUAL_KIND_COLORS: Partial<Record<NodeKind, string>> = {
  service: "#ffd35a",
  file: "#fbfdff",
  config_file: "#b9fbc0",
  api_endpoint: "#ff4f78",
  websocket_endpoint: "#ff5bbd",
  api_client: "#ffb000",
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
  keyframes: "#fbbf24",
  html_document: "#fca5a5",
  html_element: "#fb923c",
  table: "#10b981",
  view: "#6ee7b7",
  migration: "#a7f3d0",
};
const REACT_SERVICE_COLOR = "#35d3ff";

interface GraphSceneProps {
  graph: CodeGraph;
  selectedId: string;
  activeKinds: Set<NodeKind>;
  perspectiveIds: Set<string>;
  activeTrace: TracePlan | null;
  funMode: boolean;
  showSelectedOverlays: boolean;
  showHoverOverlays: boolean;
  resetViewSignal: number;
  onZoomChange: (zoomLevel: number) => void;
  onFunSpeedChange: (speedLevel: number) => void;
  onSelect: (nodeId: string) => void;
  onDeselect: () => void;
}

interface SpaceNode {
  node: CodeNode;
  depth: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  opacity: number;
}

interface HoverState {
  node: CodeNode;
  x: number;
  y: number;
}

interface NeighborOverlay {
  id: string;
  node: CodeNode;
  x: number;
  y: number;
}

type GraphEdgeObject = THREE.Line | Line2;
interface ImportDirectionMarker {
  cone: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
  tail: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
}

function nodeColor(node: CodeNode) {
  if (node.kind === "service" && node.metadata.majority_file_type === "react") {
    return REACT_SERVICE_COLOR;
  }
  return VISUAL_KIND_COLORS[node.kind] ?? node.color;
}

function isHeavyNode(node: CodeNode) {
  return ["workspace", "service", "package", "module", "file", "config_file", "api_endpoint", "websocket_endpoint", "api_client", "table", "view", "migration"].includes(node.kind);
}

function serviceIndexForNode(node: CodeNode) {
  const metadataIndex = node.metadata.service_index;
  if (typeof metadataIndex === "number") {
    return metadataIndex;
  }
  return null;
}

function isPrimaryService(node: CodeNode) {
  return node.metadata.service_role === "main_repo";
}

function serviceKeyForNode(node: CodeNode) {
  if (node.kind === "service") {
    return node.file || node.label;
  }
  const firstPathPart = node.file.split("/")[0] ?? "";
  return firstPathPart || "__repo__";
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableUnit(value: string) {
  return stableHash(value) / 4294967295;
}

function buildDepths(selectedId: string, nodes: CodeNode[], edges: CodeEdge[], activeKinds: Set<NodeKind>, perspectiveIds: Set<string>) {
  const allowedIds = new Set(nodes.filter((node) => activeKinds.has(node.kind) && perspectiveIds.has(node.id)).map((node) => node.id));
  allowedIds.add(selectedId);
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!allowedIds.has(edge.source) || !allowedIds.has(edge.target)) {
      continue;
    }
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
    adjacency.set(edge.target, [...(adjacency.get(edge.target) ?? []), edge.source]);
  }
  const depths = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = [{ id: selectedId, depth: 0 }];
  depths.set(selectedId, 0);
  while (queue.length) {
    const item = queue.shift();
    if (!item || item.depth >= MAX_DEPTH) {
      continue;
    }
    for (const nextId of adjacency.get(item.id) ?? []) {
      if (depths.has(nextId)) {
        continue;
      }
      depths.set(nextId, item.depth + 1);
      queue.push({ id: nextId, depth: item.depth + 1 });
    }
  }
  return depths;
}

function layoutDepth(node: CodeNode) {
  if (node.kind === "service") {
    return 0;
  }
  if (node.kind === "file" || node.kind === "config_file") {
    return 1;
  }
  if (node.kind === "api_endpoint" || node.kind === "websocket_endpoint" || node.kind === "api_client" || node.kind === "table") {
    return 1.35;
  }
  if (["schema", "model", "pydantic_model", "dataclass", "typed_dict", "interface", "type_alias", "enum", "type", "class", "view"].includes(node.kind)) {
    return 1.75;
  }
  return 2.2;
}

function nodeRadius(node: CodeNode, depth: number) {
  if (node.kind === "service") {
    return isPrimaryService(node) ? 30 : 23;
  }
  if (node.kind === "api_endpoint" || node.kind === "websocket_endpoint") {
    return 8.2;
  }
  if (node.kind === "file" || node.kind === "config_file") {
    return 12.3;
  }
  if (["schema", "model", "pydantic_model", "dataclass", "typed_dict", "class", "table", "view"].includes(node.kind)) {
    return 5.2;
  }
  return Math.max(3.6, 5.1 - depth * 0.38);
}

function baseOpacity(node: CodeNode, depth: number) {
  if (node.kind === "service") {
    return 1;
  }
  return Math.max(0.62, 0.88 - depth * 0.08);
}

function compareLayoutNodes(a: CodeNode, b: CodeNode) {
  return (KIND_RANK[a.kind] ?? 99) - (KIND_RANK[b.kind] ?? 99)
    || a.file.localeCompare(b.file)
    || a.label.localeCompare(b.label)
    || a.id.localeCompare(b.id);
}

function sphericalOffset(seed: string, radius: number, stretchX: number, stretchY: number, stretchZ: number) {
  const theta = stableUnit(`${seed}:theta`) * Math.PI * 2;
  const zUnit = stableUnit(`${seed}:z`) * 2 - 1;
  const planar = Math.sqrt(Math.max(0, 1 - zUnit * zUnit));
  return new THREE.Vector3(
    Math.cos(theta) * planar * radius * stretchX,
    Math.sin(theta) * planar * radius * stretchY,
    zUnit * radius * stretchZ,
  );
}

function buildParentMap(nodes: CodeNode[], edges: CodeEdge[]) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const parentCandidates = new Map<string, { parentId: string; rank: number }>();
  for (const node of nodes) {
    const parentId = typeof node.metadata.parent_id === "string" ? node.metadata.parent_id : null;
    if (parentId && nodesById.has(parentId) && parentId !== node.id) {
      parentCandidates.set(node.id, { parentId, rank: node.kind === "api_endpoint" ? 3 : 2 });
    }
  }
  for (const edge of edges) {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    if (!source || !target) {
      continue;
    }
    let childId: string | null = null;
    let parentId: string | null = null;
    let rank: number | null = null;
    if (edge.kind === "contains_file" && source.kind === "service" && target.kind === "file") {
      childId = target.id;
      parentId = source.id;
      rank = 0;
    } else if (edge.kind === "declares_api" && source.kind === "file" && target.kind === "api_endpoint") {
      childId = target.id;
      parentId = source.id;
      rank = 0;
    } else if (edge.kind === "contains") {
      childId = target.id;
      parentId = source.id;
      rank = target.kind === "api_endpoint" ? 3 : 2;
    } else if (edge.kind === "handled_by" && source.kind === "api_endpoint") {
      childId = target.id;
      parentId = source.id;
      rank = 1;
    }
    if (rank === null || !childId || !parentId || childId === parentId) {
      continue;
    }
    const existing = parentCandidates.get(childId);
    if (!existing || rank < existing.rank) {
      parentCandidates.set(childId, { parentId, rank });
    }
  }
  return new Map([...parentCandidates.entries()].map(([childId, item]) => [childId, item.parentId]));
}

function childClusterRadius(node: CodeNode, index: number) {
  if (node.kind === "file") {
    return 300 + Math.floor(index / 18) * 96 + stableUnit(`file-radius:${node.id}`) * 70;
  }
  if (node.kind === "api_endpoint" || node.kind === "api_client") {
    return 112 + Math.floor(index / 12) * 34 + stableUnit(`api-radius:${node.id}`) * 26;
  }
  if (node.kind === "schema" || node.kind === "type" || node.kind === "class") {
    return 86 + Math.floor(index / 14) * 30 + stableUnit(`schema-radius:${node.id}`) * 22;
  }
  return 66 + Math.floor(index / 16) * 28 + stableUnit(`symbol-radius:${node.id}`) * 20;
}

function buildServiceAnchors(nodes: CodeNode[]) {
  const anchors = new Map<string, THREE.Vector3>();
  const serviceNodes = nodes
    .filter((node) => node.kind === "service")
    .sort((a, b) => (serviceIndexForNode(a) ?? 999) - (serviceIndexForNode(b) ?? 999) || a.label.localeCompare(b.label));
  const nonRootServices = serviceNodes.filter((node) => !isPrimaryService(node));
  for (const node of serviceNodes) {
    if (isPrimaryService(node)) {
      anchors.set(serviceKeyForNode(node), new THREE.Vector3(0, 0, 80));
      continue;
    }
    const ringIndex = nonRootServices.findIndex((item) => item.id === node.id);
    const angle = (Math.PI * 2 * Math.max(ringIndex, 0)) / Math.max(nonRootServices.length, 1) - Math.PI * 0.16;
    const arm = ringIndex % 4;
    const radius = 900 + arm * 170;
    const z = Math.sin(angle * 1.65) * 430 + (arm - 1.5) * 145 - 160;
    anchors.set(serviceKeyForNode(node), new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.78, z));
  }
  if (!anchors.size) {
    anchors.set("__repo__", new THREE.Vector3(0, 0, 80));
  }
  return anchors;
}

function makeSpaceNodes(graph: CodeGraph, activeKinds: Set<NodeKind>, perspectiveIds: Set<string>): SpaceNode[] {
  const nodes = graph.nodes
    .filter((node) => activeKinds.has(node.kind) && perspectiveIds.has(node.id))
    .sort(compareLayoutNodes);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const serviceAnchors = buildServiceAnchors(nodes);
  const parentMap = buildParentMap(nodes, graph.edges);
  const childrenByParent = new Map<string, CodeNode[]>();
  for (const node of nodes) {
    const key = serviceKeyForNode(node);
    if (!serviceAnchors.has(key)) {
      const fallbackAngle = stableUnit(key) * Math.PI * 2;
      serviceAnchors.set(key, new THREE.Vector3(Math.cos(fallbackAngle) * 760, Math.sin(fallbackAngle) * 520, Math.sin(fallbackAngle * 1.4) * 360 - 220));
    }
    const parentId = parentMap.get(node.id);
    if (parentId && nodesById.has(parentId)) {
      childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), node]);
    }
  }
  const siblingIndex = new Map<string, number>();
  for (const children of childrenByParent.values()) {
    children.sort(compareLayoutNodes).forEach((node, index) => siblingIndex.set(node.id, index));
  }
  const positionsById = new Map<string, THREE.Vector3>();
  const spaceById = new Map<string, SpaceNode>();
  for (const node of nodes) {
    const depth = layoutDepth(node);
    if (node.kind === "service") {
      const anchor = serviceAnchors.get(serviceKeyForNode(node)) ?? new THREE.Vector3(0, 0, 0);
      positionsById.set(node.id, anchor.clone());
      spaceById.set(node.id, {
        node,
        depth,
        x: anchor.x,
        y: anchor.y,
        z: anchor.z,
        radius: nodeRadius(node, depth),
        opacity: 1,
      });
    }
  }
  const remaining = nodes.filter((node) => node.kind !== "service");
  for (let pass = 0; pass < 5; pass += 1) {
    for (const node of remaining) {
      if (spaceById.has(node.id)) {
        continue;
      }
      const parentId = parentMap.get(node.id);
      const parentPosition = parentId ? positionsById.get(parentId) : null;
      if (parentId && !parentPosition && pass < 4) {
        continue;
      }
      const serviceAnchor = serviceAnchors.get(serviceKeyForNode(node)) ?? serviceAnchors.get("__repo__") ?? new THREE.Vector3(0, 0, 0);
      const basePosition = parentPosition ?? serviceAnchor;
      const parent = parentId ? nodesById.get(parentId) : null;
      const index = siblingIndex.get(node.id) ?? Math.floor(stableUnit(`fallback-index:${node.id}`) * 36);
      const radius = childClusterRadius(node, index);
      const stretchX = parent?.kind === "service" ? 1.28 : parent?.kind === "file" ? 1.05 : 0.94;
      const stretchY = parent?.kind === "service" ? 1.04 : parent?.kind === "file" ? 0.98 : 0.9;
      const stretchZ = parent?.kind === "service" ? 1.2 : parent?.kind === "file" ? 1.02 : 0.88;
      const offset = sphericalOffset(`cluster:${parentId ?? serviceKeyForNode(node)}:${node.id}`, radius, stretchX, stretchY, stretchZ);
      const depth = layoutDepth(node);
      const position = basePosition.clone().add(offset);
      positionsById.set(node.id, position);
      spaceById.set(node.id, {
        node,
        depth,
        x: position.x,
        y: position.y,
        z: position.z,
        radius: nodeRadius(node, depth),
        opacity: baseOpacity(node, depth),
      });
    }
  }
  return nodes.map((node) => {
    const existing = spaceById.get(node.id);
    if (existing) {
      return existing;
    }
    const anchor = serviceAnchors.get(serviceKeyForNode(node)) ?? new THREE.Vector3(0, 0, 0);
    const depth = layoutDepth(node);
    const index = Math.floor(stableUnit(`orphan-index:${node.id}`) * 36);
    const offset = sphericalOffset(`orphan:${serviceKeyForNode(node)}:${node.id}`, childClusterRadius(node, index), 1.2, 0.9, 1.2);
    return {
      node,
      depth,
      x: anchor.x + offset.x,
      y: anchor.y + offset.y,
      z: anchor.z + offset.z,
      radius: nodeRadius(node, depth),
      opacity: baseOpacity(node, depth),
    };
  });
}

function makeStarfield() {
  const starCount = STATIC_STAR_COUNT;
  const positions = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 900 + Math.random() * 7200;
    positions[index * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[index * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius * 0.74;
    positions[index * 3 + 2] = Math.cos(phi) * radius - 980;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: "#ffffff",
    opacity: 0.92,
    size: 4.8,
    sizeAttenuation: true,
    transparent: true,
  });
  return new THREE.Points(geometry, material);
}

function resetShootingStar(line: THREE.Line, now: number, index: number) {
  line.userData.active = false;
  line.userData.nextLaunchAt = now + SHOOTING_STAR_MIN_DELAY_MS + Math.random() * SHOOTING_STAR_MAX_DELAY_MS + index * 110;
  (line.material as THREE.LineBasicMaterial).opacity = 0;
}

function launchShootingStar(line: THREE.Line, now: number) {
  const side = Math.floor(Math.random() * 4);
  const spanX = 2400 + Math.random() * 4200;
  const spanY = 1500 + Math.random() * 2600;
  const start = new THREE.Vector3(
    side === 0 ? -spanX : side === 1 ? spanX : (Math.random() - 0.5) * spanX * 2,
    side === 2 ? spanY : side === 3 ? -spanY : (Math.random() - 0.5) * spanY * 2,
    Math.random() * 6200 - 2800,
  );
  const direction = new THREE.Vector3(
    side === 0 ? 1 : side === 1 ? -1 : (Math.random() - 0.5) * 0.82,
    side === 2 ? -1 : side === 3 ? 1 : (Math.random() - 0.5) * 0.62,
    (Math.random() - 0.5) * 0.28,
  ).normalize();
  line.userData.active = true;
  line.userData.startedAt = now;
  line.userData.duration = 850 + Math.random() * 1150;
  line.userData.speed = 1.5 + Math.random() * 2.1;
  line.userData.length = 320 + Math.random() * 560;
  line.userData.maxOpacity = 0.24 + Math.random() * 0.34;
  line.userData.start = start;
  line.userData.direction = direction;
  (line.material as THREE.LineBasicMaterial).color.set(Math.random() > 0.32 ? "#ffffff" : "#bfe7ff");
}

function makeShootingStars() {
  const group = new THREE.Group();
  const stars: THREE.Line[] = [];
  const now = performance.now();
  for (let index = 0; index < SHOOTING_STAR_COUNT; index += 1) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const material = new THREE.LineBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: "#ffffff",
      depthWrite: false,
      opacity: 0,
      transparent: true,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    resetShootingStar(line, now, index);
    stars.push(line);
    group.add(line);
  }
  return { group, stars };
}

function updateShootingStars(stars: THREE.Line[], now: number) {
  for (let index = 0; index < stars.length; index += 1) {
    const line = stars[index];
    const material = line.material as THREE.LineBasicMaterial;
    if (!line.userData.active) {
      if (now >= (line.userData.nextLaunchAt as number)) {
        launchShootingStar(line, now);
      } else {
        material.opacity += (0 - material.opacity) * 0.18;
        continue;
      }
    }
    const elapsed = now - (line.userData.startedAt as number);
    const duration = line.userData.duration as number;
    if (elapsed >= duration) {
      resetShootingStar(line, now, index);
      continue;
    }
    const direction = line.userData.direction as THREE.Vector3;
    const head = (line.userData.start as THREE.Vector3).clone().add(direction.clone().multiplyScalar((line.userData.speed as number) * elapsed));
    const tail = head.clone().sub(direction.clone().multiplyScalar(line.userData.length as number));
    const positions = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    positions.setXYZ(0, tail.x, tail.y, tail.z);
    positions.setXYZ(1, head.x, head.y, head.z);
    positions.needsUpdate = true;
    material.opacity = Math.sin((elapsed / duration) * Math.PI) * (line.userData.maxOpacity as number);
  }
}

function makeFunSkySphere() {
  const texture = new THREE.TextureLoader().load(FUN_SKY_TEXTURE_URL);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(9600, 64, 32),
    new THREE.MeshBasicMaterial({
      depthWrite: false,
      map: texture,
      opacity: 0.62,
      side: THREE.BackSide,
      transparent: true,
    }),
  );
  sphere.renderOrder = -10;
  return sphere;
}

function addBox(group: THREE.Group, material: THREE.Material, size: [number, number, number], position: [number, number, number], scale: [number, number, number] = [1, 1, 1]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  group.add(mesh);
  return mesh;
}

function addEllipsoid(group: THREE.Group, material: THREE.Material, scale: [number, number, number], position: [number, number, number], widthSegments = 18, heightSegments = 8) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, widthSegments, heightSegments), material);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.position.set(position[0], position[1], position[2]);
  group.add(mesh);
  return mesh;
}

function addCylinderBetween(group: THREE.Group, material: THREE.Material, start: THREE.Vector3, end: THREE.Vector3, radius: number, radialSegments = 8) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, radialSegments), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(mesh);
  return mesh;
}

function makeRoadsterHull(material: THREE.Material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
    -27, -7, -45, 27, -7, -45, 27, -7, 47, -27, -7, 47,
    -20, 7, -39, 20, 7, -39, 22, 6, 43, -22, 6, 43,
  ]), 3));
  geometry.setIndex([
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    3, 2, 6, 3, 6, 7,
    0, 3, 7, 0, 7, 4,
    1, 5, 6, 1, 6, 2,
  ]);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function makeRearBadge() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "900 24px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineWidth = 4;
    context.strokeStyle = "rgba(0, 0, 0, 0.88)";
    context.strokeText("T  E  S  L  A", canvas.width / 2, canvas.height / 2);
    context.fillStyle = "rgba(255, 255, 255, 0.98)";
    context.fillText("T  E  S  L  A", canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 8),
    new THREE.MeshBasicMaterial({
      depthTest: false,
      depthWrite: false,
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
  badge.position.set(0, 11.2, 58.2);
  badge.renderOrder = 8;
  return badge;
}

function makeRearPlate() {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "rgba(92, 13, 22, 0.98)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(166, 52, 64, 0.78)";
    context.lineWidth = 6;
    context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    context.font = "800 38px Arial, sans-serif";
    context.fillStyle = "rgba(255, 232, 234, 0.95)";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("Codex", canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(20, 7.4),
    new THREE.MeshBasicMaterial({
      depthTest: true,
      depthWrite: false,
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
}

function makeRoadsterTrail() {
  const group = new THREE.Group();
  const offsets = [-7, 0, 7];
  for (const x of offsets) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
      x, -4, 58,
      x * 0.2, -6, 122,
    ]), 3));
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: "#9ff4ff",
        depthWrite: false,
        opacity: x === 0 ? 0.32 : 0.2,
        transparent: true,
      }),
    );
    group.add(line);
  }
  return group;
}

function makeTailLightTrails() {
  const group = new THREE.Group();
  for (const x of [-15, 15]) {
    for (const offset of [-2.2, 2.2]) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
        x + offset, 8.8, 58,
        x * 0.62, 7.2, 132,
      ]), 3));
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: "#ff4158",
          depthWrite: false,
          opacity: 0,
          transparent: true,
        }),
      );
      group.add(line);
    }
  }
  return group;
}

function makeSpacesuitDriver() {
  const group = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.18, metalness: 0.12, roughness: 0.36 });
  const helmet = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.22, metalness: 0.12, roughness: 0.18 });
  const visor = new THREE.MeshStandardMaterial({ color: "#151d28", emissive: "#23455e", emissiveIntensity: 0.42, metalness: 0.18, roughness: 0.08 });
  addEllipsoid(group, suit, [3.8, 5.8, 3], [0, 8, 3], 12, 6);
  addEllipsoid(group, helmet, [4.1, 4.1, 3.7], [0, 15, 1], 16, 8);
  const helmetVisor = addBox(group, visor, [6.2, 2.1, 0.8], [0, 15.2, -2.4]);
  helmetVisor.rotation.x = -0.14;
  for (const x of [-4.7, 4.7]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 8.4, 10), suit);
    arm.rotation.z = Math.PI / 2.7 * Math.sign(x);
    arm.rotation.x = 0.52;
    arm.position.set(x, 8.8, -1.5);
    group.add(arm);
  }
  for (const x of [-2.2, 2.2]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 8.2, 10), suit);
    leg.rotation.x = Math.PI / 2.25;
    leg.position.set(x, 3.4, 7);
    group.add(leg);
  }
  group.position.set(-5, 1, 5);
  return group;
}

function makeRoadsterVehicle() {
  const group = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: "#ff3442", emissive: "#8c0712", emissiveIntensity: 0.48, metalness: 0.68, roughness: 0.18 });
  const dark = new THREE.MeshStandardMaterial({ color: "#11131d", emissive: "#081321", emissiveIntensity: 0.34, metalness: 0.5, roughness: 0.24 });
  const glass = new THREE.MeshStandardMaterial({ color: "#9ff4ff", emissive: "#168aa6", emissiveIntensity: 0.34, metalness: 0.18, opacity: 0.5, roughness: 0.08, transparent: true });
  const tire = new THREE.MeshStandardMaterial({ color: "#020204", metalness: 0.34, roughness: 0.4 });
  const rim = new THREE.MeshStandardMaterial({ color: "#d7dde8", emissive: "#ffffff", emissiveIntensity: 0.12, metalness: 0.82, roughness: 0.18 });
  const light = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const tailLight = new THREE.MeshBasicMaterial({ color: "#ff344d" });
  const tailHousing = new THREE.MeshBasicMaterial({ color: "#050508" });
  const frame = new THREE.MeshStandardMaterial({ color: "#05070b", emissive: "#101827", emissiveIntensity: 0.22, metalness: 0.55, roughness: 0.2 });
  const seat = new THREE.MeshStandardMaterial({ color: "#7d858f", emissive: "#2b3038", emissiveIntensity: 0.2, metalness: 0.18, roughness: 0.38 });
  const seatTrim = new THREE.MeshBasicMaterial({ color: "#c4cbd3" });

  addBox(group, dark, [54, 5, 92], [0, -7, 0]);
  group.add(makeRoadsterHull(red));
  addEllipsoid(group, red, [28, 7, 49], [0, -1, 3], 22, 8);
  const hood = addEllipsoid(group, red, [21, 3.2, 22], [0, 4, -34], 18, 7);
  hood.rotation.x = -0.06;
  const rearDeck = addEllipsoid(group, red, [23, 4.2, 20], [0, 4, 37], 18, 7);
  rearDeck.rotation.x = 0.05;
  for (const x of [-21, 21]) {
    addEllipsoid(group, red, [7.5, 4.8, 41], [x, -1, 4], 14, 6);
    addEllipsoid(group, red, [11, 6.4, 20], [x, 2.5, 35], 16, 7);
    const sideScoop = addBox(group, tailHousing, [1.8, 4.6, 15], [x > 0 ? 28.3 : -28.3, 1.6, -16]);
    sideScoop.rotation.y = x > 0 ? -0.22 : 0.22;
  }
  addEllipsoid(group, dark, [18, 2.8, 18], [0, 8, 5], 16, 6);
  const windshield = addBox(group, glass, [34, 1.1, 12], [0, 15, -18]);
  windshield.rotation.x = -0.72;
  addCylinderBetween(group, frame, new THREE.Vector3(-19, 8, -12), new THREE.Vector3(-16, 20, -24), 1.1, 8);
  addCylinderBetween(group, frame, new THREE.Vector3(19, 8, -12), new THREE.Vector3(16, 20, -24), 1.1, 8);
  addCylinderBetween(group, frame, new THREE.Vector3(-16, 20, -24), new THREE.Vector3(16, 20, -24), 0.9, 8);
  addCylinderBetween(group, frame, new THREE.Vector3(-19, 8, -12), new THREE.Vector3(19, 8, -12), 0.8, 8);
  for (const x of [-24, 24]) {
    addBox(group, frame, [5, 2, 2.6], [x, 11.5, -12]);
  }
  for (const x of [-8, 8]) {
    const cushion = addBox(group, seat, [9, 2.4, 12], [x, 4, 13]);
    cushion.rotation.x = -0.08;
    const back = addBox(group, seat, [9, 10, 2.6], [x, 9.3, 19]);
    back.rotation.x = -0.34;
    const headrest = addBox(group, seat, [7, 4, 2.4], [x, 16, 21]);
    headrest.rotation.x = -0.22;
    addBox(group, seatTrim, [7, 0.8, 1], [x, 5.4, 7.4]);
    addBox(group, seatTrim, [1, 5.8, 0.8], [x - 3.8, 10, 17.8]);
    addBox(group, seatTrim, [1, 5.8, 0.8], [x + 3.8, 10, 17.8]);
  }
  group.add(makeSpacesuitDriver());

  for (const x of [-26, 26]) {
    for (const z of [-31, 30]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 8.4, 6.2, 24), tire);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, -8, z);
      group.add(wheel);
      const wheelRim = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 6.6, 18), rim);
      wheelRim.rotation.z = Math.PI / 2;
      wheelRim.position.copy(wheel.position);
      group.add(wheelRim);
    }
  }

  for (const x of [-13, 13]) {
    addBox(group, light, [7, 3, 2], [x, 1, -47]);
  }
  for (const x of [-15, 15]) {
    const housing = addBox(group, tailHousing, [19, 3.4, 1.4], [x, 8.7, 56.4]);
    housing.rotation.z = x > 0 ? -0.08 : 0.08;
    const lamp = addBox(group, tailLight, [16, 1.3, 1.8], [x, 8.9, 57.2]);
    lamp.rotation.z = x > 0 ? -0.08 : 0.08;
  }
  addEllipsoid(group, red, [27, 6.8, 12], [0, 2.2, 50], 20, 7);
  addBox(group, dark, [46, 13, 3.2], [0, -2.5, 58]);
  addBox(group, dark, [28, 8, 4.5], [0, -5.5, 61]);
  for (const x of [-22, 22]) {
    const diffuserFin = addBox(group, dark, [4, 12, 8], [x, -4.5, 58]);
    diffuserFin.rotation.z = x > 0 ? -0.08 : 0.08;
  }
  const plate = makeRearPlate();
  plate.position.set(0, 2.4, 62.2);
  group.add(plate);
  group.add(makeRearBadge());
  const spoiler = addBox(group, frame, [46, 1.4, 5.2], [0, 15.2, 47.5]);
  spoiler.rotation.x = -0.12;
  for (const x of [-16, 16]) {
    addBox(group, frame, [3.2, 6.5, 2.2], [x, 11.8, 49]);
  }
  const rearGlow = new THREE.PointLight(0xff3348, 0.85, 95);
  rearGlow.position.set(0, 5, 55);
  group.add(rearGlow);

  const trail = makeRoadsterTrail();
  group.add(trail);
  group.userData.trail = trail;
  const tailLightTrails = makeTailLightTrails();
  group.add(tailLightTrails);
  group.userData.tailLightTrails = tailLightTrails;
  group.scale.setScalar(0.95);
  return group;
}

function funDirection(yaw: number, pitch: number) {
  return new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  ).normalize();
}

function funSpeedLevel(speed: number) {
  return clamp((speed - FUN_MAX_REVERSE_SPEED) / (FUN_MAX_FORWARD_SPEED - FUN_MAX_REVERSE_SPEED), 0, 1);
}

function funBoundsForNodes(spaceNodes: SpaceNode[]) {
  const center = nodeCentroid(spaceNodes) ?? new THREE.Vector3(0, 0, 0);
  const nodeRadius = Math.max(
    900,
    ...spaceNodes.map((item) => center.distanceTo(new THREE.Vector3(item.x, item.y, item.z)) + item.radius),
  );
  return { center, radius: nodeRadius + FUN_BOUNDARY_BUFFER };
}

function updateGraphEdgeGeometry(line: GraphEdgeObject, sourcePoint: THREE.Vector3, targetPoint: THREE.Vector3) {
  if (line.userData.isWideLine) {
    (line.geometry as LineGeometry).setPositions([
      sourcePoint.x, sourcePoint.y, sourcePoint.z,
      targetPoint.x, targetPoint.y, targetPoint.z,
    ]);
    return;
  }
  const position = line.geometry.getAttribute("position") as THREE.BufferAttribute;
  position.setXYZ(0, sourcePoint.x, sourcePoint.y, sourcePoint.z);
  position.setXYZ(1, targetPoint.x, targetPoint.y, targetPoint.z);
  position.needsUpdate = true;
}

function makeImportDirectionMarker(opacity: number): ImportDirectionMarker {
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(IMPORT_DIRECTION_MARKER_RADIUS, IMPORT_DIRECTION_MARKER_LENGTH, 3),
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: "#ffffff",
      depthTest: true,
      depthWrite: false,
      opacity,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
  const tailGeometry = new THREE.BufferGeometry();
  tailGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
  const tail = new THREE.Line(
    tailGeometry,
    new THREE.LineBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: "#ffffff",
      depthTest: true,
      depthWrite: false,
      opacity: opacity * 0.42,
      transparent: true,
    }),
  );
  return { cone, tail };
}

function importDirectionMarkerCount(edgeLength: number) {
  return Math.max(1, Math.min(IMPORT_DIRECTION_MARKER_MAX_COUNT, Math.ceil(edgeLength / IMPORT_DIRECTION_MARKER_LENGTH_PER_ARROW)));
}

function updateImportDirectionMarker(marker: ImportDirectionMarker, fromPoint: THREE.Vector3, toPoint: THREE.Vector3, progress: number) {
  const direction = toPoint.clone().sub(fromPoint);
  const edgeLength = direction.length();
  if (edgeLength < 1) {
    marker.cone.visible = false;
    marker.tail.visible = false;
    return;
  }
  direction.normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const headProgress = clamp(progress, 0, 1);
  const tailProgress = clamp(headProgress - IMPORT_DIRECTION_MARKER_TAIL_LENGTH / edgeLength, 0, 1);
  const tailPoint = fromPoint.clone().lerp(toPoint, tailProgress);
  const headPoint = fromPoint.clone().lerp(toPoint, headProgress);
  const tailPosition = marker.tail.geometry.getAttribute("position") as THREE.BufferAttribute;
  marker.cone.visible = true;
  marker.tail.visible = true;
  marker.cone.position.copy(headPoint);
  marker.cone.quaternion.copy(quaternion);
  tailPosition.setXYZ(0, tailPoint.x, tailPoint.y, tailPoint.z);
  tailPosition.setXYZ(1, headPoint.x, headPoint.y, headPoint.z);
  tailPosition.needsUpdate = true;
}

function setImportDirectionMarkerOpacity(marker: ImportDirectionMarker, opacity: number) {
  marker.cone.material.opacity = opacity;
  marker.tail.material.opacity = opacity * 0.42;
}

function hideImportDirectionMarker(marker: ImportDirectionMarker) {
  setImportDirectionMarkerOpacity(marker, 0);
  marker.cone.visible = false;
  marker.tail.visible = false;
}

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  const center = size / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  gradient.addColorStop(0.18, "rgba(255, 255, 255, 0.62)");
  gradient.addColorStop(0.46, "rgba(255, 255, 255, 0.18)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function makeRimMaterial(color: THREE.Color, opacity: number) {
  return new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    uniforms: {
      uColor: { value: color.clone() },
      uOpacity: { value: opacity },
      uPulse: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uPulse;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 1.55);
        vec3 hot = mix(uColor, vec3(1.0), 0.38 + uPulse * 0.42);
        float alpha = rim * uOpacity * (0.58 + uPulse * 0.78);
        gl_FragColor = vec4(hot, alpha);
      }
    `,
  });
}

function makeVisibleEdges(edges: CodeEdge[], spaceNodes: SpaceNode[]) {
  const visibleIds = new Set(spaceNodes.map((item) => item.node.id));
  return edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
}

function nodePositionMap(spaceNodes: SpaceNode[]) {
  return new Map(spaceNodes.map((item) => [item.node.id, item]));
}

function universeRadius(spaceNodes: SpaceNode[]) {
  return Math.max(
    1200,
    ...spaceNodes.map((item) => Math.sqrt(item.x * item.x + item.y * item.y + item.z * item.z) + item.radius),
  );
}

function universeExtent(spaceNodes: SpaceNode[]) {
  if (!spaceNodes.length) {
    return 0;
  }
  let maxDistance = 0;
  for (let sourceIndex = 0; sourceIndex < spaceNodes.length; sourceIndex += 1) {
    const source = spaceNodes[sourceIndex];
    maxDistance = Math.max(maxDistance, source.radius * 2);
    for (let targetIndex = sourceIndex + 1; targetIndex < spaceNodes.length; targetIndex += 1) {
      const target = spaceNodes[targetIndex];
      const distance = Math.sqrt((target.x - source.x) ** 2 + (target.y - source.y) ** 2 + (target.z - source.z) ** 2);
      maxDistance = Math.max(maxDistance, distance + source.radius + target.radius);
    }
  }
  return maxDistance;
}

function nodeCentroid(spaceNodes: Iterable<SpaceNode>) {
  const center = new THREE.Vector3();
  let count = 0;
  for (const item of spaceNodes) {
    center.add(new THREE.Vector3(item.x, item.y, item.z));
    count += 1;
  }
  return count ? center.divideScalar(count) : null;
}

function focusViewportOffset(_hostWidth: number) {
  return 0;
}

function applyNodeSpread(target: THREE.Vector3, basePosition: THREE.Vector3, centerPosition: THREE.Vector3, radius: number, strength: number, seed: string) {
  const spreadVector = basePosition.clone().sub(centerPosition);
  const distance = spreadVector.length();
  if (distance >= radius) {
    return;
  }
  if (distance < 0.001) {
    const angle = stableUnit(seed) * Math.PI * 2;
    spreadVector.set(Math.cos(angle), Math.sin(angle), stableUnit(`${seed}:z`) - 0.5);
  }
  spreadVector.normalize();
  const falloff = 1 - distance / radius;
  target.add(spreadVector.multiplyScalar(strength * falloff * falloff));
}

function screenOffsetToWorld(offset: THREE.Vector3, camera: THREE.PerspectiveCamera, height: number) {
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  const unitsPerPixel = visibleHeight / Math.max(height, 1);
  return new THREE.Vector3(offset.x * unitsPerPixel, offset.y * unitsPerPixel, 0);
}

function packetTravelMs(sourcePoint: THREE.Vector3, targetPoint: THREE.Vector3) {
  return Math.max(PACKET_MIN_TRAVEL_MS, sourcePoint.distanceTo(targetPoint) / PACKET_SPEED_UNITS_PER_MS);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fitCameraDistance(extent: number, minDistance: number, maxDistance: number) {
  return clamp(extent * 1.5, minDistance, maxDistance);
}

function easedCruise(progress: number) {
  const t = clamp(progress, 0, 1);
  const ramp = 0.22;
  const velocity = 1 / (1 - ramp);
  if (t < ramp) {
    return 0.5 * (velocity / ramp) * t * t;
  }
  if (t > 1 - ramp) {
    const remaining = 1 - t;
    return 1 - 0.5 * (velocity / ramp) * remaining * remaining;
  }
  return 0.5 * velocity * ramp + velocity * (t - ramp);
}

function depthOpacity(depth: number | undefined) {
  if (depth === 0) {
    return 1;
  }
  if (depth === 1) {
    return 0.96;
  }
  if (depth === 2) {
    return 0.9;
  }
  if (depth === 3) {
    return 0.82;
  }
  if (depth === 4) {
    return 0.74;
  }
  return 0.68;
}

function depthScale(depth: number | undefined, isSelected: boolean) {
  if (isSelected) {
    return 1.48;
  }
  if (depth === 1) {
    return 1.12;
  }
  if (depth === 2) {
    return 1.03;
  }
  if (depth === 3) {
    return 0.93;
  }
  return 0.86;
}

export default function GraphScene({ graph, selectedId, activeKinds, perspectiveIds, activeTrace, funMode, showSelectedOverlays, showHoverOverlays, resetViewSignal, onZoomChange, onFunSpeedChange, onSelect, onDeselect }: GraphSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const selectedIdRef = useRef(selectedId);
  const showSelectedOverlaysRef = useRef(showSelectedOverlays);
  const showHoverOverlaysRef = useRef(showHoverOverlays);
  const resetViewSignalRef = useRef(resetViewSignal);
  const resetViewActiveRef = useRef(false);
  const onZoomChangeRef = useRef(onZoomChange);
  const onFunSpeedChangeRef = useRef(onFunSpeedChange);
  const onSelectRef = useRef(onSelect);
  const onDeselectRef = useRef(onDeselect);
  const depthsRef = useRef<Map<string, number>>(new Map());
  const positionsRef = useRef<Map<string, SpaceNode>>(new Map());
  const panOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const focusOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const graphPositionRef = useRef(new THREE.Vector3(0, 0, 0));
  const graphRotationRef = useRef(new THREE.Euler(-0.16, 0, 0));
  const hoverNodeIdRef = useRef<string | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [neighborOverlays, setNeighborOverlays] = useState<NeighborOverlay[]>([]);
  const spaceNodes = useMemo(
    () => makeSpaceNodes(graph, activeKinds, perspectiveIds),
    [activeKinds, graph, perspectiveIds],
  );
  const visibleEdges = useMemo(() => makeVisibleEdges(graph.edges, spaceNodes), [graph.edges, spaceNodes]);
  const positions = useMemo(() => nodePositionMap(spaceNodes), [spaceNodes]);
  const maxUniverseRadius = useMemo(() => universeRadius(spaceNodes), [spaceNodes]);
  const maxUniverseExtent = useMemo(() => universeExtent(spaceNodes), [spaceNodes]);
  const depths = useMemo(
    () => buildDepths(selectedId, graph.nodes, graph.edges, activeKinds, perspectiveIds),
    [activeKinds, graph.edges, graph.nodes, perspectiveIds, selectedId],
  );
  const traceEdgeIds = useMemo(
    () => new Set((activeTrace?.steps ?? []).map((step) => step.edge_id).filter((edgeId): edgeId is string => Boolean(edgeId))),
    [activeTrace],
  );
  const traceNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (activeTrace?.start_node_id) {
      ids.add(activeTrace.start_node_id);
    }
    for (const step of activeTrace?.steps ?? []) {
      ids.add(step.node_id);
    }
    return ids;
  }, [activeTrace]);
  const traceSpaceNodes = useMemo(() => spaceNodes.filter((item) => traceNodeIds.has(item.node.id)), [spaceNodes, traceNodeIds]);
  const traceUniverseExtent = useMemo(() => universeExtent(traceSpaceNodes), [traceSpaceNodes]);
  const hasActiveTrace = traceNodeIds.size > 0 || traceEdgeIds.size > 0;

  selectedIdRef.current = selectedId;
  showSelectedOverlaysRef.current = showSelectedOverlays;
  showHoverOverlaysRef.current = showHoverOverlays;
  resetViewSignalRef.current = resetViewSignal;
  onZoomChangeRef.current = onZoomChange;
  onFunSpeedChangeRef.current = onFunSpeedChange;
  onSelectRef.current = onSelect;
  onDeselectRef.current = onDeselect;
  positionsRef.current = positions;
  depthsRef.current = depths;

  useEffect(() => {
    resetViewActiveRef.current = false;
    if (selectedId) {
      panOffsetRef.current.set(0, 0, 0);
    }
  }, [selectedId]);

  useEffect(() => {
    resetViewActiveRef.current = false;
    if (activeTrace) {
      panOffsetRef.current.set(0, 0, 0);
    }
  }, [activeTrace?.trace_id]);

  useEffect(() => {
    if (resetViewSignal > 0) {
      resetViewActiveRef.current = true;
      panOffsetRef.current.set(0, 0, 0);
      hoverNodeIdRef.current = null;
      setHover(null);
      setNeighborOverlays([]);
    }
  }, [resetViewSignal]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }
    host.replaceChildren();

    const scene = new THREE.Scene();
    const maxCameraDistance = Math.max(3200, maxUniverseExtent * 3);
    const minCameraDistance = clamp(maxUniverseRadius * 0.18, 360, 720);
    const initialCameraExtent = hasActiveTrace && traceUniverseExtent > 0 ? traceUniverseExtent : maxUniverseExtent;
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, maxCameraDistance * 2.4);
    camera.position.set(0, 32, fitCameraDistance(initialCameraExtent, minCameraDistance, maxCameraDistance));
    let lastReportedZoom = -1;
    let lastReportedFunSpeed = -1;
    const funBounds = funBoundsForNodes(spaceNodes);

    function reportZoomLevel() {
      const zoomRange = Math.max(maxCameraDistance - minCameraDistance, 1);
      const zoomLevel = clamp(1 - (camera.position.z - minCameraDistance) / zoomRange, 0, 1);
      const roundedZoom = Math.round(zoomLevel * 1000) / 1000;
      if (Math.abs(roundedZoom - lastReportedZoom) >= 0.004) {
        lastReportedZoom = roundedZoom;
        onZoomChangeRef.current(roundedZoom);
      }
    }

    function reportFunSpeedLevel(speed: number) {
      const roundedSpeed = Math.round(funSpeedLevel(speed) * 1000) / 1000;
      if (Math.abs(roundedSpeed - lastReportedFunSpeed) >= 0.004) {
        lastReportedFunSpeed = roundedSpeed;
        onFunSpeedChangeRef.current(roundedSpeed);
      }
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const graphGroup = new THREE.Group();
    if (funMode) {
      graphGroup.position.set(0, 0, 0);
      graphGroup.rotation.set(0, 0, 0);
    } else {
      graphGroup.position.copy(graphPositionRef.current);
      graphGroup.rotation.copy(graphRotationRef.current);
    }
    scene.add(graphGroup);
    const skySphere = makeFunSkySphere();
    scene.add(skySphere);
    const starfield = makeStarfield();
    scene.add(starfield);
    const { group: shootingStarGroup, stars: shootingStarObjects } = makeShootingStars();
    scene.add(shootingStarGroup);

    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    const keyLight = new THREE.PointLight(0xffffff, 2.8, 1200);
    keyLight.position.set(0, 220, 390);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x31ffc5, 1.55, 900);
    rimLight.position.set(-260, -120, 260);
    scene.add(rimLight);
    const vehicleGroup = makeRoadsterVehicle();
    vehicleGroup.visible = funMode;
    scene.add(vehicleGroup);
    const vehicleLight = new THREE.PointLight(0xffffff, 3.2, 640);
    vehicleLight.visible = funMode;
    scene.add(vehicleLight);
    const funState = {
      cameraPosition: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, -1),
      pitch: 0,
      position: new THREE.Vector3(),
      speed: 0,
      steerX: 0,
      steerY: 0,
      yaw: 0,
    };
    function resetFunState() {
      const center = funBounds.center;
      const startDistance = Math.min(fitCameraDistance(initialCameraExtent, minCameraDistance, maxCameraDistance) * 0.58, funBounds.radius * 0.55);
      funState.position.set(center.x, center.y + 72, center.z + startDistance);
      const direction = center.clone().sub(funState.position).normalize();
      funState.yaw = Math.atan2(direction.x, -direction.z);
      funState.pitch = Math.asin(clamp(direction.y, -Math.sin(FUN_MAX_PITCH), Math.sin(FUN_MAX_PITCH)));
      funState.direction.copy(funDirection(funState.yaw, funState.pitch));
      funState.cameraPosition.copy(funState.position).sub(funState.direction.clone().multiplyScalar(FUN_CAMERA_DISTANCE)).add(new THREE.Vector3(0, FUN_CAMERA_HEIGHT, 0));
      funState.speed = 0;
      vehicleGroup.position.copy(funState.position);
      vehicleGroup.lookAt(funState.position.clone().add(funState.direction));
      vehicleGroup.rotateY(Math.PI);
      camera.position.copy(funState.cameraPosition);
      camera.lookAt(funState.position.clone().add(funState.direction.clone().multiplyScalar(FUN_LOOK_AHEAD)));
      reportFunSpeedLevel(funState.speed);
    }
    if (funMode) {
      resetFunState();
    }

    const sphereObjects: THREE.Mesh[] = [];
    const lineObjects: GraphEdgeObject[] = [];
    const packetObjects: THREE.Mesh[] = [];
    const sphereByNodeId = new Map<string, THREE.Mesh>();
    const graphNodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const connectedNodeIdsByNodeId = new Map<string, Set<string>>();
    const traceStepByEdge = new Map((activeTrace?.steps ?? []).filter((step) => step.edge_id).map((step) => [step.edge_id as string, step]));
    const glowTexture = makeGlowTexture();
    for (const item of spaceNodes) {
      const geometry = new THREE.SphereGeometry(item.radius, 32, 20);
      const color = new THREE.Color(nodeColor(item.node));
      const isService = item.node.kind === "service";
      const isFile = item.node.kind === "file";
      const isApi = item.node.kind === "api_endpoint";
      const isTraceNode = traceNodeIds.has(item.node.id);
      const traceDimmed = hasActiveTrace && !isTraceNode;
      const hotColor = item.node.kind === "service"
        ? color.clone().lerp(new THREE.Color("#ffffff"), 0.68)
        : color.clone().lerp(new THREE.Color("#ffffff"), isFile ? 0.82 : isApi ? 0.74 : 0.58);
      const baseEmissive = isService ? 1.56 : isFile ? 1.1 : isApi ? 1.08 : 0.54;
      const initialOpacity = traceDimmed ? item.opacity * TRACE_DIM_FACTOR : item.opacity;
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: traceDimmed ? baseEmissive * TRACE_DIM_FACTOR : baseEmissive,
        metalness: 0.18,
        opacity: initialOpacity,
        roughness: isService || isFile || isApi ? 0.18 : 0.28,
        transparent: true,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(item.x, item.y, item.z);
      sphere.userData.nodeId = item.node.id;
      sphere.userData.basePosition = sphere.position.clone();
      sphere.userData.baseRadius = item.radius;
      sphere.userData.baseOpacity = item.opacity;
      sphere.userData.baseColor = color.clone();
      sphere.userData.hotColor = hotColor;
      sphere.userData.nodeKind = item.node.kind;
      sphere.userData.isTraceNode = isTraceNode;
      sphere.userData.baseEmissive = baseEmissive;
      sphere.userData.phase = stableUnit(`pulse:${item.node.id}`) * Math.PI * 2;
      sphere.userData.pulseSpeed = 0.0012 + stableUnit(`pulse-speed:${item.node.id}`) * 0.0032;
      sphere.userData.pulseAmount = 0.045 + stableUnit(`pulse-amount:${item.node.id}`) * 0.095;
      sphere.userData.glowPhase = stableUnit(`glow-phase:${item.node.id}`) * Math.PI * 2;
      sphere.userData.glowSpeed = 0.0011 + stableUnit(`glow-speed:${item.node.id}`) * 0.002;
      sphereObjects.push(sphere);
      sphereByNodeId.set(item.node.id, sphere);
      graphGroup.add(sphere);

      const baseRimOpacity = isService ? 0.94 : isFile ? 0.62 : isApi ? 0.5 : 0.32;
      const rim = new THREE.Mesh(
        new THREE.SphereGeometry(item.radius * 1.16, 32, 20),
        makeRimMaterial(isService ? color.clone().lerp(new THREE.Color("#ffffff"), 0.42) : color, traceDimmed ? baseRimOpacity * TRACE_DIM_FACTOR : baseRimOpacity),
      );
      rim.position.copy(sphere.position);
      rim.userData.nodeId = item.node.id;
      sphere.userData.rim = rim;
      graphGroup.add(rim);

      const baseGlowOpacity = isService ? 0.84 : isFile ? 0.5 : isApi ? 0.48 : 0.24;
      const glowMaterial = new THREE.SpriteMaterial({
        blending: THREE.AdditiveBlending,
        color,
        depthWrite: false,
        map: glowTexture,
        opacity: traceDimmed ? baseGlowOpacity * TRACE_DIM_FACTOR : baseGlowOpacity,
        transparent: true,
      });
      const glow = new THREE.Sprite(glowMaterial);
      glow.position.copy(sphere.position);
      glow.scale.setScalar(item.radius * (isService ? 7.4 : isFile ? 5.3 : 4.4));
      glow.userData.nodeId = item.node.id;
      glow.userData.baseScale = item.radius * (isService ? 7.4 : isFile ? 5.3 : 4.4);
      sphere.userData.glow = glow;
      graphGroup.add(glow);
    }

    for (const edge of graph.edges) {
      if (!sphereByNodeId.has(edge.source) || !sphereByNodeId.has(edge.target)) {
        continue;
      }
      connectedNodeIdsByNodeId.set(edge.source, new Set([...(connectedNodeIdsByNodeId.get(edge.source) ?? []), edge.target]));
      connectedNodeIdsByNodeId.set(edge.target, new Set([...(connectedNodeIdsByNodeId.get(edge.target) ?? []), edge.source]));
    }

    const currentPositions = nodePositionMap(spaceNodes);
    for (const edge of visibleEdges) {
      const source = currentPositions.get(edge.source);
      const target = currentPositions.get(edge.target);
      if (!source || !target) {
        continue;
      }
      const points = [
        new THREE.Vector3(source.x, source.y, source.z),
        new THREE.Vector3(target.x, target.y, target.z),
      ];
      const isServiceEdge = edge.kind === "connects_service" || (source.node.kind === "service" && target.node.kind === "service");
      const isFileEdge = edge.kind === "contains_file";
      const isApiFileEdge = edge.kind === "declares_api";
      const isFunctionDependencyEdge = (edge.kind === "imports" || edge.kind === "calls") && source.node.kind === "function" && target.node.kind === "function";
      const traceStep = traceStepByEdge.get(edge.id);
      const isTraceEdge = Boolean(traceStep);
      const isParentEdge = edge.kind === "contains_file" || edge.kind === "declares_api" || edge.kind === "contains" || edge.kind === "handled_by";
      const hasLightweightNode = !isHeavyNode(source.node) || !isHeavyNode(target.node);
      const traceColor = TRACE_LINE_COLOR;
      const color = new THREE.Color(isTraceEdge ? traceColor : isServiceEdge ? "#fff0a8" : isFileEdge ? "#fbfdff" : isApiFileEdge ? "#ff4f78" : hasLightweightNode ? "#b4b4b4" : target.node.kind === "api_endpoint" ? nodeColor(target.node) : target.node.kind === "file" ? nodeColor(target.node) : isParentEdge ? "#eaf6ff" : nodeColor(source.node));
      const tubeRadius = isTraceEdge ? 2.4 : isServiceEdge ? 2 : isFileEdge || isApiFileEdge ? 1.5 : 0;
      const initialLineOpacity = isTraceEdge ? 1 : isServiceEdge ? 0.96 : tubeRadius > 0 ? 0.58 : isParentEdge ? 0.58 : 0.42;
      const visibleLineOpacity = hasActiveTrace && !isTraceEdge ? initialLineOpacity * TRACE_DIM_FACTOR : initialLineOpacity;
      const line = tubeRadius > 0
        ? (() => {
          const geometry = new LineGeometry();
          geometry.setPositions([
            points[0].x, points[0].y, points[0].z,
            points[1].x, points[1].y, points[1].z,
          ]);
          const material = new LineMaterial({
            blending: THREE.AdditiveBlending,
            color: color.getHex(),
            depthWrite: false,
            linewidth: tubeRadius * 1.7,
            opacity: visibleLineOpacity,
            resolution: new THREE.Vector2(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1)),
            transparent: true,
          });
          const wideLine = new Line2(geometry, material);
          wideLine.userData.isWideLine = true;
          return wideLine;
        })()
        : new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({
            blending: THREE.AdditiveBlending,
            color,
            opacity: visibleLineOpacity,
            transparent: true,
          }),
        );
      line.userData.source = edge.source;
      line.userData.target = edge.target;
      line.userData.edgeId = edge.id;
      line.userData.kind = edge.kind;
      line.userData.baseOpacity = isTraceEdge ? 1 : isServiceEdge ? 0.76 : isParentEdge ? 0.58 : 0.42;
      line.userData.traceOrder = traceStep?.order ?? null;
      line.userData.traceDirection = traceStep?.direction ?? "forward";
      line.userData.isTraceEdge = isTraceEdge;
      line.userData.isServiceEdge = isServiceEdge;
      line.userData.isFunctionDependencyEdge = isFunctionDependencyEdge;
      line.userData.sourcePoint = points[0].clone();
      line.userData.targetPoint = points[1].clone();
      line.userData.sourceSphere = sphereByNodeId.get(edge.source) ?? null;
      line.userData.targetSphere = sphereByNodeId.get(edge.target) ?? null;
      line.userData.packetScale = tubeRadius > 0 ? tubeRadius / 2 : 0.36;
      lineObjects.push(line);
      graphGroup.add(line);
    }

    for (let index = 0; index < MAX_PACKET_COUNT; index += 1) {
      const packet = new THREE.Mesh(
        new THREE.SphereGeometry(5.6, 14, 10),
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: "#ffffff",
          opacity: 0,
          transparent: true,
        }),
      );
      packet.userData.phase = stableUnit(`packet:${index}`);
      packetObjects.push(packet);
      graphGroup.add(packet);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragState = {
      active: false,
      mode: "rotate" as "rotate" | "pan",
      moved: false,
      x: 0,
      y: 0,
    };
    let funHoverTarget: { node: CodeNode; x: number; y: number } | null = null;
    function resize() {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      for (const line of lineObjects) {
        if (line.userData.isWideLine) {
          (line.material as LineMaterial).resolution.set(width, height);
        }
      }
      focusOffsetRef.current.set(focusViewportOffset(width), 0, 0);
    }

    function focusTarget() {
      function rotatedVisibleCentroid() {
        const center = nodeCentroid(positionsRef.current.values());
        return center ? center.applyEuler(graphGroup.rotation) : null;
      }

      function visibleCentroidTarget() {
        const rotatedCenter = rotatedVisibleCentroid();
        return rotatedCenter ? panOffsetRef.current.clone().sub(rotatedCenter) : null;
      }

      if (hasActiveTrace) {
        const tracePositions = [...traceNodeIds]
          .map((nodeId) => positionsRef.current.get(nodeId))
          .filter((item): item is SpaceNode => Boolean(item));
        if (tracePositions.length) {
          const traceCenter = tracePositions.reduce(
            (center, item) => center.add(new THREE.Vector3(item.x, item.y, item.z)),
            new THREE.Vector3(),
          ).divideScalar(tracePositions.length);
          const rotatedCenter = traceCenter.applyEuler(graphGroup.rotation);
          const focusOffset = screenOffsetToWorld(focusOffsetRef.current, camera, renderer.domElement.clientHeight);
          return panOffsetRef.current.clone().add(focusOffset).sub(rotatedCenter);
        }
      }
      if (resetViewActiveRef.current || !selectedIdRef.current) {
        return visibleCentroidTarget();
      }
      const selectedPosition = positionsRef.current.get(selectedIdRef.current);
      if (!selectedPosition) {
        return null;
      }
      const rotatedSelected = new THREE.Vector3(selectedPosition.x, selectedPosition.y, selectedPosition.z).applyEuler(graphGroup.rotation);
      const focusOffset = screenOffsetToWorld(focusOffsetRef.current, camera, renderer.domElement.clientHeight);
      return panOffsetRef.current.clone().add(focusOffset).sub(rotatedSelected);
    }

    function syncPanOffsetToVisibleCentroid() {
      const center = nodeCentroid(positionsRef.current.values());
      if (!center) {
        panOffsetRef.current.copy(graphGroup.position);
        return;
      }
      panOffsetRef.current.copy(graphGroup.position).add(center.applyEuler(graphGroup.rotation));
    }

    function syncPanOffsetToTraceCentroid() {
      const tracePositions = [...traceNodeIds]
        .map((nodeId) => positionsRef.current.get(nodeId))
        .filter((item): item is SpaceNode => Boolean(item));
      if (!tracePositions.length) {
        panOffsetRef.current.copy(graphGroup.position);
        return;
      }
      const traceCenter = tracePositions.reduce(
        (center, item) => center.add(new THREE.Vector3(item.x, item.y, item.z)),
        new THREE.Vector3(),
      ).divideScalar(tracePositions.length);
      const focusOffset = screenOffsetToWorld(focusOffsetRef.current, camera, renderer.domElement.clientHeight);
      panOffsetRef.current.copy(graphGroup.position).sub(focusOffset).add(traceCenter.applyEuler(graphGroup.rotation));
    }

    function projectNeighborOverlay(nodeId: string, rect: DOMRect): NeighborOverlay | null {
      const sphere = sphereByNodeId.get(nodeId);
      const node = graphNodeById.get(nodeId);
      if (!sphere || !node) {
        return null;
      }
      const worldPosition = new THREE.Vector3();
      sphere.getWorldPosition(worldPosition);
      const projected = worldPosition.project(camera);
      if (projected.z < -1 || projected.z > 1) {
        return null;
      }
      const screenX = (projected.x * 0.5 + 0.5) * rect.width;
      const screenY = (-projected.y * 0.5 + 0.5) * rect.height;
      return {
        id: nodeId,
        node,
        x: Math.min(Math.max(screenX + 10, 12), Math.max(rect.width - 184, 12)),
        y: Math.min(Math.max(screenY - 14, 12), Math.max(rect.height - 58, 12)),
      };
    }

    function updateNeighborOverlays(node: CodeNode | null, rect: DOMRect) {
      const overlayIds = new Set<string>();
      if (hasActiveTrace) {
        traceNodeIds.forEach((nodeId) => overlayIds.add(nodeId));
      }
      if (showSelectedOverlaysRef.current && selectedIdRef.current) {
        overlayIds.add(selectedIdRef.current);
        for (const nodeId of connectedNodeIdsByNodeId.get(selectedIdRef.current) ?? []) {
          overlayIds.add(nodeId);
        }
      }
      if (node && showHoverOverlaysRef.current && !hasActiveTrace) {
        for (const nodeId of connectedNodeIdsByNodeId.get(node.id) ?? []) {
          overlayIds.add(nodeId);
        }
      }
      if (!overlayIds.size) {
        setNeighborOverlays((current) => current.length ? [] : current);
        return;
      }
      const overlays = [...overlayIds]
        .map((nodeId) => projectNeighborOverlay(nodeId, rect))
        .filter((item): item is NeighborOverlay => Boolean(item));
      setNeighborOverlays((current) => {
        const same = current.length === overlays.length
          && current.every((item, index) => item.id === overlays[index]?.id && Math.abs(item.x - overlays[index].x) < 1 && Math.abs(item.y - overlays[index].y) < 1);
        return same ? current : overlays;
      });
    }

    function pickNode(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(sphereObjects, false)[0];
      if (hit) {
        const nodeId = hit.object.userData.nodeId as string;
        return graphNodeById.get(nodeId) ?? null;
      }
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      let nearestNodeId = "";
      let nearestDistance = HOVER_PICK_RADIUS_PX;
      const worldPosition = new THREE.Vector3();
      for (const sphere of sphereObjects) {
        sphere.getWorldPosition(worldPosition);
        const projected = worldPosition.clone().project(camera);
        if (projected.z < -1 || projected.z > 1) {
          continue;
        }
        const screenX = (projected.x * 0.5 + 0.5) * rect.width;
        const screenY = (-projected.y * 0.5 + 0.5) * rect.height;
        const nodeId = sphere.userData.nodeId as string;
        const node = graphNodeById.get(nodeId);
        const apiPriority = node && (node.kind === "api_endpoint" || node.kind === "websocket_endpoint" || node.kind === "api_client" || node.kind === "route") ? 9 : 0;
        const distance = Math.max(0, Math.hypot(pointerX - screenX, pointerY - screenY) - apiPriority);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestNodeId = nodeId;
        }
      }
      if (nearestNodeId) {
        return graphNodeById.get(nearestNodeId) ?? null;
      }
      return null;
    }

    function updateFunSteering(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      funState.steerX = clamp(((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1, -1, 1);
      funState.steerY = clamp(((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1, -1, 1);
      const node = showHoverOverlaysRef.current ? pickNode(event) : null;
      if (node) {
        const sphere = sphereByNodeId.get(node.id);
        const worldPosition = new THREE.Vector3();
        sphere?.getWorldPosition(worldPosition);
        const distance = sphere ? worldPosition.distanceTo(funState.position) - ((sphere.userData.baseRadius as number | undefined) ?? 0) : Number.POSITIVE_INFINITY;
        if (distance <= FUN_HOVER_PROXIMITY_RADIUS) {
          funHoverTarget = { node, x: event.clientX - rect.left, y: event.clientY - rect.top };
          renderer.domElement.style.cursor = "pointer";
          return;
        }
      }
      funHoverTarget = null;
      renderer.domElement.style.cursor = "crosshair";
    }

    function onPointerDown(event: PointerEvent) {
      if (funMode) {
        event.preventDefault();
        updateFunSteering(event);
        if (event.button === 2) {
          funState.speed = 0;
          return;
        }
        if (event.button === 0) {
          const node = pickNode(event);
          if (node) {
            onSelectRef.current(node.id);
          } else {
            onDeselectRef.current();
          }
        }
        return;
      }
      if (!selectedIdRef.current && !hasActiveTrace) {
        syncPanOffsetToVisibleCentroid();
      }
      resetViewActiveRef.current = false;
      hoverNodeIdRef.current = null;
      setHover(null);
      updateNeighborOverlays(null, renderer.domElement.getBoundingClientRect());
      dragState.active = true;
      dragState.mode = event.shiftKey || event.button === 1 || event.button === 2 ? "pan" : "rotate";
      dragState.moved = false;
      dragState.x = event.clientX;
      dragState.y = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      if (funMode) {
        updateFunSteering(event);
        return;
      }
      if (dragState.active) {
        const dx = event.clientX - dragState.x;
        const dy = event.clientY - dragState.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) {
          dragState.moved = true;
        }
        if (dragState.mode === "pan") {
          panOffsetRef.current.x += dx * 0.82;
          panOffsetRef.current.y -= dy * 0.82;
        } else {
          graphGroup.rotation.y += dx * 0.006;
          graphGroup.rotation.x = clamp(graphGroup.rotation.x + dy * 0.004, -0.95, 0.95);
          if (!selectedIdRef.current && !hasActiveTrace) {
            const targetPosition = focusTarget();
            if (targetPosition) {
              graphGroup.position.copy(targetPosition);
            }
          }
        }
        dragState.x = event.clientX;
        dragState.y = event.clientY;
        return;
      }
      if (hasActiveTrace) {
        hoverNodeIdRef.current = null;
        renderer.domElement.style.cursor = "grab";
        setHover(null);
        updateNeighborOverlays(null, renderer.domElement.getBoundingClientRect());
        return;
      }
      const node = pickNode(event);
      hoverNodeIdRef.current = node?.id ?? null;
      const rect = renderer.domElement.getBoundingClientRect();
      renderer.domElement.style.cursor = node ? "pointer" : "grab";
      setHover(node ? { node, x: event.clientX - rect.left, y: event.clientY - rect.top } : null);
      updateNeighborOverlays(node, rect);
    }

    function onPointerUp(event: PointerEvent) {
      if (funMode) {
        return;
      }
      const node = !dragState.moved ? pickNode(event) : null;
      dragState.active = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      if (node) {
        onSelectRef.current(node.id);
      } else if (!dragState.moved) {
        if (hasActiveTrace) {
          syncPanOffsetToTraceCentroid();
        } else {
          syncPanOffsetToVisibleCentroid();
        }
        onDeselectRef.current();
      }
    }

    function onPointerLeave() {
      dragState.active = false;
      if (funMode) {
        funState.steerX = 0;
        funState.steerY = 0;
        funHoverTarget = null;
        hoverNodeIdRef.current = null;
        setHover(null);
        updateNeighborOverlays(null, renderer.domElement.getBoundingClientRect());
        return;
      }
      hoverNodeIdRef.current = null;
      setHover(null);
      updateNeighborOverlays(null, renderer.domElement.getBoundingClientRect());
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      resetViewActiveRef.current = false;
      if (funMode) {
        funState.speed = clamp(funState.speed - event.deltaY * FUN_SCROLL_SPEED_STEP, FUN_MAX_REVERSE_SPEED, FUN_MAX_FORWARD_SPEED);
        return;
      }
      if (event.shiftKey) {
        panOffsetRef.current.x -= event.deltaY * 0.4;
        panOffsetRef.current.y += event.deltaX * 0.4;
        return;
      }
      const nextCameraDistance = clamp(camera.position.z + event.deltaY * 0.62, minCameraDistance, maxCameraDistance);
      if (!selectedIdRef.current && !hasActiveTrace) {
        syncPanOffsetToVisibleCentroid();
        const rect = renderer.domElement.getBoundingClientRect();
        const pointerOffset = new THREE.Vector3(
          event.clientX - rect.left - rect.width / 2,
          rect.height / 2 - (event.clientY - rect.top),
          0,
        );
        const zoomOffset = screenOffsetToWorld(pointerOffset, camera, renderer.domElement.clientHeight);
        camera.position.z = nextCameraDistance;
        panOffsetRef.current.add(screenOffsetToWorld(pointerOffset, camera, renderer.domElement.clientHeight).sub(zoomOffset));
      } else {
        camera.position.z = nextCameraDistance;
      }
      const targetPosition = focusTarget();
      if (targetPosition) {
        graphGroup.position.copy(targetPosition);
      }
    }

    function onContextMenu(event: MouseEvent) {
      event.preventDefault();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("contextmenu", onContextMenu);

    let frame = 0;
    let focusedTargetKey = "";
    let focusTransition: { from: THREE.Vector3; startAt: number; duration: number } | null = null;
    let packetNodeId = selectedIdRef.current;
    let functionMarkerCycleStartedAt = performance.now();
    let packetInitialBurstPending = true;
    let packetNextLaunchAt = 0;
    let overlayNextUpdateAt = 0;
    let lastFrameAt = performance.now();
    const packetCooldownUntil = new Map<string, number>();
    function hidePackets() {
      for (const packet of packetObjects) {
        packet.userData.edge = null;
        packet.userData.edgeId = null;
        (packet.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }

    function eligiblePacketEdges(activeDepths: Map<string, number>, now: number) {
      const busyEdgeIds = new Set(
        packetObjects
          .map((packet) => packet.userData.edgeId as string | null)
          .filter((edgeId): edgeId is string => Boolean(edgeId)),
      );
      const traceLines = lineObjects
        .filter((line) => line.userData.isTraceEdge)
        .filter((line) => {
          const edgeId = line.userData.edgeId as string;
          return (packetCooldownUntil.get(edgeId) ?? 0) <= now;
        })
        .sort((a, b) => (a.userData.traceOrder as number) - (b.userData.traceOrder as number));
      if (hasActiveTrace) {
        return traceLines;
      }
      if (traceLines.length) {
        return traceLines;
      }
      return lineObjects
        .filter((line) => {
          const edgeId = line.userData.edgeId as string;
          if (busyEdgeIds.has(edgeId) || (packetCooldownUntil.get(edgeId) ?? 0) > now) {
            return false;
          }
          const sourceDepth = activeDepths.get(line.userData.source as string);
          const targetDepth = activeDepths.get(line.userData.target as string);
          return sourceDepth !== undefined && targetDepth !== undefined && Math.max(sourceDepth, targetDepth) <= 3;
        })
        .map((line) => ({ line, order: Math.random() }))
        .sort((a, b) => a.order - b.order)
        .map((item) => item.line);
    }

    function launchPackets(count: number, activeDepths: Map<string, number>, now: number) {
      const freePackets = packetObjects.filter((packet) => !packet.userData.edge);
      const packetEdges = eligiblePacketEdges(activeDepths, now);
      const launches = Math.min(count, freePackets.length, packetEdges.length);
      for (let index = 0; index < launches; index += 1) {
        const packet = freePackets[index];
        const packetEdge = packetEdges[index];
        const material = packet.material as THREE.MeshBasicMaterial;
        const sourcePoint = packetEdge.userData.sourcePoint as THREE.Vector3;
        const targetPoint = packetEdge.userData.targetPoint as THREE.Vector3;
        const traceDirection = packetEdge.userData.traceDirection as string | undefined;
        const direction = traceDirection === "reverse" ? -1 : traceDirection === "forward" ? 1 : Math.random() < 0.5 ? 1 : -1;
        const edgeId = packetEdge.userData.edgeId as string;
        packet.userData.edge = packetEdge;
        packet.userData.edgeId = edgeId;
        packet.userData.startedAt = now;
        packet.userData.direction = direction;
        const travelMs = packetTravelMs(sourcePoint, targetPoint);
        packet.userData.travelMs = travelMs;
        packet.position.copy(direction > 0 ? sourcePoint : targetPoint);
        packet.scale.setScalar(packetEdge.userData.packetScale as number);
        material.opacity = 0;
        packetCooldownUntil.set(edgeId, now + (hasActiveTrace ? TRACE_PACKET_REST_MS : travelMs + PACKET_REST_MS));
      }
      return launches;
    }

    function updateFunMode(dt: number) {
      if (resetViewActiveRef.current) {
        resetFunState();
        resetViewActiveRef.current = false;
        hoverNodeIdRef.current = null;
        setHover(null);
        setNeighborOverlays([]);
      }
      const steerDistance = Math.hypot(funState.steerX, funState.steerY);
      if (steerDistance > FUN_STEER_DEAD_ZONE) {
        const steerAmount = clamp((steerDistance - FUN_STEER_DEAD_ZONE) / (1 - FUN_STEER_DEAD_ZONE), 0, 1);
        const steerX = (funState.steerX / steerDistance) * steerAmount;
        const steerY = (funState.steerY / steerDistance) * steerAmount;
        const speedResistance = 1 / (1 + Math.abs(funState.speed) * 4.6);
        const turnStep = (FUN_BASE_TURN_RATE + FUN_EXTRA_TURN_RATE * steerAmount) * dt * speedResistance;
        funState.yaw += steerX * turnStep;
        funState.pitch = clamp(funState.pitch - steerY * turnStep, -FUN_MAX_PITCH, FUN_MAX_PITCH);
      }
      funState.direction.copy(funDirection(funState.yaw, funState.pitch));
      const currentDistance = funState.position.distanceTo(funBounds.center);
      let candidatePosition = funState.position.clone().addScaledVector(funState.direction, funState.speed * dt);
      let candidateDistance = candidatePosition.distanceTo(funBounds.center);
      if (candidateDistance > currentDistance && currentDistance > funBounds.radius - FUN_BOUNDARY_SLOW_RADIUS) {
        const room = clamp((funBounds.radius - currentDistance) / FUN_BOUNDARY_SLOW_RADIUS, 0, 1);
        const maxSpeed = (funState.speed >= 0 ? FUN_MAX_FORWARD_SPEED : Math.abs(FUN_MAX_REVERSE_SPEED)) * (0.12 + room * 0.88);
        if (Math.abs(funState.speed) > maxSpeed) {
          funState.speed = Math.sign(funState.speed) * maxSpeed;
          candidatePosition = funState.position.clone().addScaledVector(funState.direction, funState.speed * dt);
          candidateDistance = candidatePosition.distanceTo(funBounds.center);
        }
      }
      if (candidateDistance > funBounds.radius) {
        const radial = candidatePosition.sub(funBounds.center).normalize();
        candidatePosition = funBounds.center.clone().add(radial.multiplyScalar(funBounds.radius));
        funState.speed *= 0.18;
      }
      funState.position.copy(candidatePosition);
      reportFunSpeedLevel(funState.speed);
      if (selectedIdRef.current) {
        const selectedSphere = sphereByNodeId.get(selectedIdRef.current);
        const selectedWorldPosition = new THREE.Vector3();
        selectedSphere?.getWorldPosition(selectedWorldPosition);
        const selectedDistance = selectedSphere ? selectedWorldPosition.distanceTo(funState.position) - ((selectedSphere.userData.baseRadius as number | undefined) ?? 0) : Number.POSITIVE_INFINITY;
        if (selectedDistance > FUN_HOVER_PROXIMITY_RADIUS) {
          selectedIdRef.current = "";
          onDeselectRef.current();
        }
      }
      vehicleGroup.visible = true;
      vehicleLight.visible = true;
      vehicleGroup.position.copy(funState.position);
      vehicleGroup.lookAt(funState.position.clone().add(funState.direction));
      vehicleGroup.rotateY(Math.PI);
      vehicleGroup.rotateZ(-funState.steerX * 0.32 * clamp(1 - Math.abs(funState.speed) / FUN_MAX_FORWARD_SPEED, 0.34, 1));
      const trail = vehicleGroup.userData.trail as THREE.Group | undefined;
      if (trail) {
        const speedRatio = clamp(Math.abs(funState.speed) / FUN_MAX_FORWARD_SPEED, 0, 1);
        trail.visible = speedRatio > 0.03;
        trail.scale.z = 0.75 + speedRatio * 1.55;
        for (const [index, child] of trail.children.entries()) {
          if (child instanceof THREE.Line) {
            const material = child.material as THREE.LineBasicMaterial;
            material.opacity = (index === 1 ? 0.1 : 0.06) + speedRatio * (index === 1 ? 0.28 : 0.18);
          }
        }
      }
      const tailLightTrails = vehicleGroup.userData.tailLightTrails as THREE.Group | undefined;
      if (tailLightTrails) {
        const forwardSpeedRatio = clamp(funState.speed / FUN_MAX_FORWARD_SPEED, 0, 1);
        tailLightTrails.visible = forwardSpeedRatio > 0.03;
        tailLightTrails.scale.z = 0.85 + forwardSpeedRatio * 1.25;
        for (const [index, child] of tailLightTrails.children.entries()) {
          if (child instanceof THREE.Line) {
            const material = child.material as THREE.LineBasicMaterial;
            material.opacity = (index % 2 === 0 ? 0.1 : 0.07) + forwardSpeedRatio * 0.36;
          }
        }
      }
      const cameraTarget = funState.position.clone().sub(funState.direction.clone().multiplyScalar(FUN_CAMERA_DISTANCE)).add(new THREE.Vector3(0, FUN_CAMERA_HEIGHT, 0));
      funState.cameraPosition.lerp(cameraTarget, 0.16);
      camera.position.copy(funState.cameraPosition);
      camera.lookAt(funState.position.clone().add(funState.direction.clone().multiplyScalar(FUN_LOOK_AHEAD)));
      vehicleLight.position.copy(funState.position).add(new THREE.Vector3(0, 24, 22));
      skySphere.position.copy(camera.position);
      skySphere.rotation.y += funState.speed * dt * 0.000045;
      skySphere.rotation.x += (funState.pitch * 0.08 - skySphere.rotation.x) * 0.03;
      shootingStarGroup.position.copy(camera.position);
    }

    function updateFunProximityOverlay(rect: DOMRect) {
      if (!showHoverOverlaysRef.current) {
        funHoverTarget = null;
        hoverNodeIdRef.current = null;
        setHover(null);
        updateNeighborOverlays(null, rect);
        return;
      }
      if (funHoverTarget) {
        const target = funHoverTarget;
        const hoverSphere = sphereByNodeId.get(target.node.id);
        const hoverWorldPosition = new THREE.Vector3();
        hoverSphere?.getWorldPosition(hoverWorldPosition);
        const hoverDistance = hoverSphere ? hoverWorldPosition.distanceTo(funState.position) - ((hoverSphere.userData.baseRadius as number | undefined) ?? 0) : Number.POSITIVE_INFINITY;
        if (hoverDistance <= FUN_HOVER_PROXIMITY_RADIUS) {
          hoverNodeIdRef.current = target.node.id;
          setHover((current) => {
            const next = { node: target.node, x: target.x, y: target.y };
            return current?.node.id === next.node.id && Math.abs(current.x - next.x) < 1 && Math.abs(current.y - next.y) < 1 ? current : next;
          });
          updateNeighborOverlays(target.node, rect);
          return;
        }
        funHoverTarget = null;
      }
      let nearestNode: CodeNode | null = null;
      let nearestSphere: THREE.Mesh | null = null;
      let nearestDistance = FUN_PROXIMITY_RADIUS;
      const worldPosition = new THREE.Vector3();
      for (const sphere of sphereObjects) {
        sphere.getWorldPosition(worldPosition);
        const distance = worldPosition.distanceTo(funState.position) - ((sphere.userData.baseRadius as number | undefined) ?? 0);
        if (distance < nearestDistance) {
          const nodeId = sphere.userData.nodeId as string;
          nearestNode = graphNodeById.get(nodeId) ?? null;
          nearestSphere = sphere;
          nearestDistance = distance;
        }
      }
      if (!nearestNode || !nearestSphere) {
        hoverNodeIdRef.current = null;
        setHover(null);
        updateNeighborOverlays(null, rect);
        return;
      }
      nearestSphere.getWorldPosition(worldPosition);
      const projected = worldPosition.clone().project(camera);
      if (projected.z < -1 || projected.z > 1) {
        hoverNodeIdRef.current = null;
        setHover(null);
        updateNeighborOverlays(null, rect);
        return;
      }
      const screenX = (projected.x * 0.5 + 0.5) * rect.width;
      const screenY = (-projected.y * 0.5 + 0.5) * rect.height;
      hoverNodeIdRef.current = nearestNode.id;
      setHover((current) => {
        const next = { node: nearestNode, x: screenX, y: screenY };
        return current?.node.id === next.node.id && Math.abs(current.x - next.x) < 1 && Math.abs(current.y - next.y) < 1 ? current : next;
      });
      updateNeighborOverlays(nearestNode, rect);
    }

    function animate() {
      frame = requestAnimationFrame(animate);
      const selectedNodeId = selectedIdRef.current;
      const now = performance.now();
      const dt = Math.min(48, Math.max(1, now - lastFrameAt));
      lastFrameAt = now;
      if (selectedNodeId !== packetNodeId) {
        packetNodeId = selectedNodeId;
        functionMarkerCycleStartedAt = now;
        packetInitialBurstPending = true;
        packetNextLaunchAt = now + (hasActiveTrace ? TRACE_PACKET_STAGGER_MS : PACKET_STAGGER_MS);
        packetCooldownUntil.clear();
        hidePackets();
      }
      if (funMode) {
        updateFunMode(dt);
      } else {
        const resetActive = resetViewActiveRef.current;
        const targetKey = hasActiveTrace
          ? resetActive ? `trace-reset:${activeTrace?.trace_id ?? [...traceNodeIds].join(",")}:${resetViewSignalRef.current}` : `trace:${activeTrace?.trace_id ?? [...traceNodeIds].join(",")}`
          : resetActive ? `reset:${resetViewSignalRef.current}` : `node:${selectedNodeId}`;
        if (resetActive) {
          const targetDistance = fitCameraDistance(initialCameraExtent, minCameraDistance, maxCameraDistance);
          camera.position.z += (targetDistance - camera.position.z) * 0.12;
        }
        if (targetKey !== focusedTargetKey) {
          focusTransition = { from: graphGroup.position.clone(), startAt: now, duration: hasActiveTrace ? 1450 : 1250 };
          focusedTargetKey = targetKey;
        }
        const targetPosition = focusTarget();
        if (targetPosition) {
          if (focusTransition) {
            const progress = clamp((now - focusTransition.startAt) / focusTransition.duration, 0, 1);
            graphGroup.position.copy(focusTransition.from).lerp(targetPosition, easedCruise(progress));
            if (progress >= 1) {
              focusTransition = null;
            }
          } else {
            graphGroup.position.lerp(targetPosition, 0.12);
          }
        } else {
          graphGroup.position.lerp(panOffsetRef.current, 0.12);
        }
        skySphere.position.copy(camera.position);
        starfield.rotation.x += (graphGroup.rotation.x * 0.22 - starfield.rotation.x) * 0.08;
        starfield.rotation.y += (graphGroup.rotation.y * 0.22 - starfield.rotation.y) * 0.08;
        starfield.position.x += (panOffsetRef.current.x * 0.18 - starfield.position.x) * 0.08;
        starfield.position.y += (panOffsetRef.current.y * 0.18 - starfield.position.y) * 0.08;
        shootingStarGroup.rotation.x += (graphGroup.rotation.x * 0.16 - shootingStarGroup.rotation.x) * 0.08;
        shootingStarGroup.rotation.y += (graphGroup.rotation.y * 0.16 - shootingStarGroup.rotation.y) * 0.08;
        shootingStarGroup.position.x += (panOffsetRef.current.x * 0.12 - shootingStarGroup.position.x) * 0.08;
        shootingStarGroup.position.y += (panOffsetRef.current.y * 0.12 - shootingStarGroup.position.y) * 0.08;
      }
      updateShootingStars(shootingStarObjects, now);
      const activeDepths = depthsRef.current;
      const hoverNodeId = hoverNodeIdRef.current;
      const hoverSphere = hoverNodeId ? sphereByNodeId.get(hoverNodeId) : null;
      const hoverBasePosition = hoverSphere?.userData.basePosition as THREE.Vector3 | undefined;
      const selectedSphere = sphereByNodeId.get(selectedNodeId);
      const selectedBasePosition = selectedSphere?.userData.basePosition as THREE.Vector3 | undefined;
      for (const sphere of sphereObjects) {
        const nodeId = sphere.userData.nodeId as string;
        const material = sphere.material as THREE.MeshStandardMaterial;
        const basePosition = sphere.userData.basePosition as THREE.Vector3;
        const spreadTarget = basePosition.clone();
        if (selectedBasePosition && nodeId !== selectedNodeId) {
          applyNodeSpread(spreadTarget, basePosition, selectedBasePosition, SELECTED_SPREAD_RADIUS, SELECTED_SPREAD_STRENGTH, `selected-spread:${nodeId}`);
        }
        if (hoverBasePosition && nodeId !== hoverNodeId) {
          applyNodeSpread(spreadTarget, basePosition, hoverBasePosition, HOVER_SPREAD_RADIUS, HOVER_SPREAD_STRENGTH, `hover-spread:${nodeId}`);
        }
        sphere.position.lerp(spreadTarget, HOVER_SPREAD_EASE);
        const visualDepth = activeDepths.get(nodeId);
        const isSelected = nodeId === selectedNodeId;
        const isTraceNode = sphere.userData.isTraceNode as boolean;
        const traceDimmed = hasActiveTrace && !isTraceNode;
        const selectedEmphasis = isSelected && !traceDimmed;
        const unselectedAura = !selectedEmphasis && !traceDimmed && (sphere.userData.nodeKind === "service" || sphere.userData.nodeKind === "file" || sphere.userData.nodeKind === "config_file");
        const phase = sphere.userData.phase as number;
        const pulseSpeed = sphere.userData.pulseSpeed as number;
        const pulseAmount = sphere.userData.pulseAmount as number;
        const pulseWave = (Math.sin(now * pulseSpeed + phase) + 1) / 2;
        const baseOpacity = sphere.userData.baseOpacity as number;
        const normalTargetOpacity = hasActiveTrace ? Math.max(baseOpacity, depthOpacity(visualDepth)) : baseOpacity;
        const targetOpacity = traceDimmed ? Math.max(0.035, normalTargetOpacity * TRACE_DIM_FACTOR) : normalTargetOpacity;
        const targetScale = Math.max(depthScale(visualDepth, selectedEmphasis), hasActiveTrace && isTraceNode ? 1.48 : 0);
        const stellarPulse = 1 + (pulseWave - 0.5) * 2 * (selectedEmphasis ? pulseAmount + 0.07 : pulseAmount);
        const baseColor = sphere.userData.baseColor as THREE.Color;
        const hotColor = sphere.userData.hotColor as THREE.Color;
        const baseEmissive = sphere.userData.baseEmissive as number;
        const colorPulse = traceDimmed ? 0.02 + pulseWave * 0.04 : selectedEmphasis ? 0.34 + pulseWave * 0.5 : visualDepth !== undefined ? 0.16 + pulseWave * 0.32 : 0.06 + pulseWave * 0.2;
        const brightness = traceDimmed ? TRACE_DIM_FACTOR : 1;
        material.opacity += (targetOpacity - material.opacity) * (traceDimmed ? 0.42 : 0.12);
        material.color.copy(baseColor).lerp(hotColor, colorPulse);
        material.emissiveIntensity += (((selectedEmphasis ? baseEmissive * (1.45 + pulseWave * 0.78) : visualDepth !== undefined ? baseEmissive * (1 + pulseWave * 0.58) : baseEmissive * (0.68 + pulseWave * 0.32)) * brightness) - material.emissiveIntensity) * (traceDimmed ? 0.42 : 0.12);
        sphere.scale.setScalar(sphere.scale.x + (targetScale * stellarPulse - sphere.scale.x) * 0.12);
        const rim = sphere.userData.rim as THREE.Mesh;
        const rimMaterial = rim.material as THREE.ShaderMaterial;
        rim.position.copy(sphere.position);
        rim.scale.setScalar(targetScale * (1.06 + pulseWave * 0.22));
        rimMaterial.uniforms.uPulse.value += (pulseWave - rimMaterial.uniforms.uPulse.value) * 0.16;
        const rimBaseOpacity = 0.24;
        const rimTargetOpacity = ((hasActiveTrace || selectedEmphasis) ? (selectedEmphasis ? 0.82 : visualDepth !== undefined ? 0.48 : rimBaseOpacity) : rimBaseOpacity) * brightness;
        rimMaterial.uniforms.uOpacity.value += (rimTargetOpacity - rimMaterial.uniforms.uOpacity.value) * (traceDimmed ? 0.42 : 0.12);
        const glow = sphere.userData.glow as THREE.Sprite;
        const glowMaterial = glow.material as THREE.SpriteMaterial;
        const glowPhase = sphere.userData.glowPhase as number;
        const glowSpeed = sphere.userData.glowSpeed as number;
        const glowWave = Math.sin(now * glowSpeed + glowPhase);
        const glowBaseOpacity = unselectedAura ? 0.3 + pulseWave * 0.18 : 0.18 + pulseWave * 0.14;
        const glowTargetOpacity = ((hasActiveTrace || selectedEmphasis) ? (selectedEmphasis ? 0.9 : visualDepth !== undefined ? 0.48 + pulseWave * 0.22 : glowBaseOpacity) : glowBaseOpacity) * brightness;
        glowMaterial.opacity += (glowTargetOpacity - glowMaterial.opacity) * (traceDimmed ? 0.42 : 0.12);
        glow.position.copy(sphere.position);
        glow.scale.setScalar((glow.userData.baseScale as number) * targetScale * ((unselectedAura ? 1.32 : 1.12) + glowWave * 0.16 + pulseWave * 0.12));
      }
      for (const line of lineObjects) {
        const material = line.material as THREE.LineBasicMaterial | LineMaterial;
        const sourceSphere = line.userData.sourceSphere as THREE.Mesh | null;
        const targetSphere = line.userData.targetSphere as THREE.Mesh | null;
        const sourcePoint = line.userData.sourcePoint as THREE.Vector3;
        const targetPoint = line.userData.targetPoint as THREE.Vector3;
        if (sourceSphere && targetSphere) {
          const moved = sourcePoint.distanceToSquared(sourceSphere.position) > 0.01 || targetPoint.distanceToSquared(targetSphere.position) > 0.01;
          sourcePoint.copy(sourceSphere.position);
          targetPoint.copy(targetSphere.position);
          if (moved) {
            updateGraphEdgeGeometry(line, sourcePoint, targetPoint);
          }
        }
        const sourceDepth = activeDepths.get(line.userData.source as string);
        const targetDepth = activeDepths.get(line.userData.target as string);
        const touchesSelected = line.userData.source === selectedNodeId || line.userData.target === selectedNodeId;
        const closeToSelected = sourceDepth !== undefined && targetDepth !== undefined && sourceDepth <= 2 && targetDepth <= 2;
        const isParentEdge = line.userData.kind === "contains_file" || line.userData.kind === "declares_api" || line.userData.kind === "contains" || line.userData.kind === "handled_by";
        const edgeDepth = Math.min(sourceDepth ?? 5, targetDepth ?? 5);
        const depthDim = Math.max(0.2, 1 - edgeDepth * 0.2);
        const isTraceEdge = line.userData.isTraceEdge;
        const baseTargetOpacity = isTraceEdge ? 1 : touchesSelected ? 0.98 : line.userData.isServiceEdge ? 0.76 : closeToSelected ? (isParentEdge ? 0.74 : 0.62) : isParentEdge ? 0.46 : 0.34;
        const normalTargetOpacity = baseTargetOpacity * depthDim;
        const targetOpacity = hasActiveTrace ? (isTraceEdge ? 1 : normalTargetOpacity * TRACE_DIM_FACTOR) : normalTargetOpacity;
        material.opacity += (targetOpacity - material.opacity) * (hasActiveTrace ? 0.42 : 0.14);
        if (line.userData.isFunctionDependencyEdge) {
          let importDirectionMarkers = line.userData.importDirectionMarkers as ImportDirectionMarker[] | undefined;
          if (touchesSelected) {
            if (!importDirectionMarkers) {
              importDirectionMarkers = [];
              line.userData.importDirectionMarkers = importDirectionMarkers;
            }
            const travelMs = packetTravelMs(targetPoint, sourcePoint);
            const edgeLength = targetPoint.distanceTo(sourcePoint);
            const markerCount = importDirectionMarkerCount(edgeLength);
            while (importDirectionMarkers.length < markerCount) {
              const marker = makeImportDirectionMarker(0);
              marker.cone.frustumCulled = false;
              marker.tail.frustumCulled = false;
              importDirectionMarkers.push(marker);
              graphGroup.add(marker.tail);
              graphGroup.add(marker.cone);
            }
            const baseProgress = ((now - functionMarkerCycleStartedAt) % travelMs) / travelMs;
            for (let index = 0; index < importDirectionMarkers.length; index += 1) {
              const marker = importDirectionMarkers[index];
              if (index >= markerCount) {
                hideImportDirectionMarker(marker);
                continue;
              }
              const progress = (baseProgress + index / markerCount) % 1;
              const fade = progress < 0.18 ? progress / 0.18 : progress > 0.82 ? (1 - progress) / 0.18 : 1;
              updateImportDirectionMarker(marker, targetPoint, sourcePoint, progress);
              setImportDirectionMarkerOpacity(marker, Math.min(1, Math.max(0, fade) * material.opacity * 1.85));
            }
          } else if (importDirectionMarkers) {
            importDirectionMarkers.forEach(hideImportDirectionMarker);
          }
        }
      }
      if (packetInitialBurstPending) {
        launchPackets(hasActiveTrace ? TRACE_PACKET_INITIAL_BURST : PACKET_INITIAL_BURST, activeDepths, now);
        packetInitialBurstPending = false;
        packetNextLaunchAt = now + (hasActiveTrace ? TRACE_PACKET_STAGGER_MS : PACKET_STAGGER_MS);
      } else if (now >= packetNextLaunchAt) {
        launchPackets(hasActiveTrace ? TRACE_PACKET_PAIR_BURST : PACKET_PAIR_BURST, activeDepths, now);
        packetNextLaunchAt = now + (hasActiveTrace ? TRACE_PACKET_STAGGER_MS : PACKET_STAGGER_MS);
      }
      for (const packet of packetObjects) {
        const material = packet.material as THREE.MeshBasicMaterial;
        const packetEdge = packet.userData.edge as GraphEdgeObject | null;
        if (!packetEdge) {
          material.opacity += (0 - material.opacity) * 0.18;
          continue;
        }
        const sourcePoint = packetEdge.userData.sourcePoint as THREE.Vector3;
        const targetPoint = packetEdge.userData.targetPoint as THREE.Vector3;
        const elapsed = now - (packet.userData.startedAt as number);
        const travelMs = packet.userData.travelMs as number || packetTravelMs(sourcePoint, targetPoint);
        if (elapsed >= travelMs) {
          packet.userData.edge = null;
          packet.userData.edgeId = null;
          material.opacity += (0 - material.opacity) * 0.18;
          continue;
        }
        const progress = elapsed / travelMs;
        const direction = packet.userData.direction as number;
        const t = direction > 0 ? progress : 1 - progress;
        const pulseWindow = Math.sin(progress * Math.PI);
        packet.position.copy(sourcePoint).lerp(targetPoint, t);
        packet.scale.setScalar(packetEdge.userData.packetScale as number);
        material.opacity += ((0.32 + pulseWindow * 0.68) - material.opacity) * 0.16;
      }
      if (now >= overlayNextUpdateAt) {
        const rect = renderer.domElement.getBoundingClientRect();
        if (funMode) {
          updateFunProximityOverlay(rect);
        } else {
          const hoverNode = hoverNodeIdRef.current ? graphNodeById.get(hoverNodeIdRef.current) ?? null : null;
          updateNeighborOverlays(hoverNode, rect);
        }
        overlayNextUpdateAt = now + OVERLAY_UPDATE_MS;
      }
      if (!funMode) {
        graphPositionRef.current.copy(graphGroup.position);
        graphRotationRef.current.copy(graphGroup.rotation);
        reportZoomLevel();
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      renderer.dispose();
      starfield.geometry.dispose();
      const starfieldMaterial = starfield.material;
      if (Array.isArray(starfieldMaterial)) {
        starfieldMaterial.forEach((item) => item.dispose());
      } else {
        starfieldMaterial.dispose();
      }
      for (const line of shootingStarObjects) {
        line.geometry.dispose();
        const material = line.material;
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else {
          material.dispose();
        }
      }
      skySphere.geometry.dispose();
      const skyMaterial = skySphere.material as THREE.MeshBasicMaterial;
      skyMaterial.map?.dispose();
      skyMaterial.dispose();
      vehicleGroup.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((item) => {
              (item as THREE.Material & { map?: THREE.Texture }).map?.dispose();
              item.dispose();
            });
          } else {
            (material as THREE.Material & { map?: THREE.Texture }).map?.dispose();
            material.dispose();
          }
        }
      });
      glowTexture?.dispose();
      setNeighborOverlays([]);
      for (const object of graphGroup.children) {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
          } else {
            material.dispose();
          }
        } else if (object instanceof THREE.Sprite) {
          object.material.dispose();
        }
      }
      host.replaceChildren();
    };
  }, [activeTrace, funMode, graph.nodes, hasActiveTrace, maxUniverseExtent, maxUniverseRadius, spaceNodes, traceNodeIds, traceUniverseExtent, visibleEdges]);

  return (
    <div className="graph-space">
      <div className="graph-canvas-host" ref={hostRef} />
      {neighborOverlays.map((item) => (
        <aside
          key={item.id}
          className="neighbor-card"
          style={{
            left: `${item.x}px`,
            top: `${item.y}px`,
            borderColor: nodeColor(item.node),
          }}
        >
          <span style={{ color: nodeColor(item.node) }}>{KIND_LABELS[item.node.kind] ?? item.node.kind}</span>
          <strong>{item.node.label}</strong>
        </aside>
      ))}
      {hover && (
        <aside
          className="hover-card"
          style={{
            left: `${Math.min(hover.x + 18, Math.max((hostRef.current?.clientWidth ?? 320) - 270, 18))}px`,
            top: `${Math.max(hover.y - 18, 18)}px`,
            borderColor: nodeColor(hover.node),
          }}
        >
          <span style={{ color: nodeColor(hover.node) }}>{KIND_LABELS[hover.node.kind] ?? hover.node.kind}</span>
          <strong>{hover.node.label}</strong>
          <small>{hover.node.file}{hover.node.line_start ? `:${hover.node.line_start}` : ""}</small>
          <p>{hover.node.summary.agentic ?? hover.node.summary.deterministic}</p>
        </aside>
      )}
    </div>
  );
}
