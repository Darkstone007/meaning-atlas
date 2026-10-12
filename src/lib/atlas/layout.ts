import { displayName, grouped } from "./core.ts";
import type { Account, Edge } from "./types.ts";

export type SceneNode = {
  id: string;
  label: string;
  type: "word" | "response" | "leaf";
  open?: string;
  section?: string;
  x: number;
  y: number;
  z: number;
  title: string;
};

export type SceneLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed: boolean;
};

export const LEAVES: { label: string; section: string }[] = [
  { label: "Meaning", section: "meaning" },
  { label: "Feeling", section: "feeling" },
  { label: "Context", section: "context" },
  { label: "Adaptation", section: "adaptation" },
  { label: "Change", section: "change" },
  { label: "Media", section: "media" },
];

function project(point: number[], yaw: number, pitch: number, width: number, height: number, scale: number) {
  const x1 = point[0] * Math.cos(yaw) + point[2] * Math.sin(yaw);
  const z1 = -point[0] * Math.sin(yaw) + point[2] * Math.cos(yaw);
  const y1 = point[1] * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = point[1] * Math.sin(pitch) + z1 * Math.cos(pitch);
  const depth = 700 / (700 - z2);
  return [width / 2 + x1 * scale * depth, height / 2 + y1 * scale * depth, z2] as const;
}

export function layoutScene(options: {
  visible: Account[];
  records: Account[];
  edges: Edge[];
  selectedId: string | null;
  yawDeg: number;
  pitchDeg: number;
  width: number;
  height: number;
}): { nodes: SceneNode[]; lines: SceneLine[]; truncated: boolean } {
  const { visible, records, edges, selectedId, yawDeg, pitchDeg, width, height } = options;
  const list = visible.slice(0, 50);
  const shownIds = new Set(list.map((record) => record.id));
  const groups = grouped(visible).filter((group) => group.accounts.some((record) => shownIds.has(record.id)));
  const raw: { id: string; label: string; type: SceneNode["type"]; open?: string; section?: string; p: number[]; title: string }[] = [];
  const tree: [string, string][] = [];
  const scale = Math.max(0.55, Math.min((width - 72) / 560, (height - 64) / 320));
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;

  groups.forEach((group, index) => {
    const x = (index - (groups.length - 1) / 2) * 230;
    const wordId = `w${index}`;
    const first = group.accounts.find((record) => shownIds.has(record.id));
    raw.push({
      id: wordId,
      label: group.expression,
      type: "word",
      open: first?.id,
      p: [x, -150, 0],
      title: `${group.expression}${group.community ? ` · ${group.community}` : ""}`,
    });
    const accounts = group.accounts.filter((record) => shownIds.has(record.id));
    accounts.forEach((record, child) => {
      const spread = accounts.length === 1 ? 0 : (child - (accounts.length - 1) / 2) * 100;
      raw.push({
        id: record.id,
        label: displayName(record, records.indexOf(record)),
        type: "response",
        open: record.id,
        p: [x + spread, 40, 20],
        title: `${displayName(record, records.indexOf(record))} · ${record.expression}`,
      });
      tree.push([wordId, record.id]);
    });
  });

  const pos = new Map(raw.map((node) => [node.id, project(node.p, yaw, pitch, width, height, scale)]));
  const lines: SceneLine[] = [];
  const segment = (a: string, b: string, dashed: boolean) => {
    const start = pos.get(a);
    const end = pos.get(b);
    if (!start || !end) return;
    lines.push({ x1: start[0], y1: start[1], x2: end[0], y2: end[1], dashed });
  };
  tree.forEach(([a, b]) => segment(a, b, false));
  edges.forEach((edge) => segment(edge.source, edge.target, true));

  const nodes = raw
    .map((node) => {
      const point = pos.get(node.id)!;
      return {
        id: node.id,
        label: node.label,
        type: node.type,
        open: node.open,
        section: node.section,
        x: Math.max(64, Math.min(width - 64, point[0])),
        y: Math.max(22, Math.min(height - 22, point[1])),
        z: point[2],
        title: node.title,
      };
    })
    .sort((a, b) => a.z - b.z);

  return { nodes, lines, truncated: visible.length > 50 };
}
