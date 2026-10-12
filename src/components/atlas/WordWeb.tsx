import { useEffect, useRef, useState } from "react";
import { layoutScene } from "@/lib/atlas/layout";
import type { Account, Edge } from "@/lib/atlas/types";

export function WordWeb({
  visible,
  records,
  edges,
  selectedId,
  yaw,
  pitch,
  onSelect,
  onLeaf,
  onContribute,
}: {
  visible: Account[];
  records: Account[];
  edges: Edge[];
  selectedId: string | null;
  yaw: number;
  pitch: number;
  onSelect: (id: string) => void;
  onLeaf: (section: string) => void;
  onContribute: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setSize({ width: node.clientWidth || 680, height: node.clientHeight || 460 });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scene = size
    ? layoutScene({ visible, records, edges, selectedId, yawDeg: yaw, pitchDeg: pitch, width: size.width, height: size.height })
    : null;

  return (
    <div ref={stageRef} className="stage" aria-label="Word and response graph">
      {!visible.length ? (
        <div className="empty">
          <span className="eyebrow">Nothing in this search</span>
          <h2>{records.length ? "No matching accounts." : "Every expression starts with a voice."}</h2>
          <p>{records.length ? "Try another word, language, name or caption." : "Add a response from the survey, or contribute here."}</p>
          <button className="primary" type="button" onClick={onContribute}>
            Add an account
          </button>
        </div>
      ) : null}
      {scene ? (
        <svg aria-hidden="true">
          {scene.lines.map((line, index) => (
            <line
              key={index}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.dashed ? "#cbb8d8" : "#5a3f72"}
              strokeOpacity={line.dashed ? 0.9 : 0.85}
              strokeDasharray={line.dashed ? "5 5" : undefined}
            />
          ))}
        </svg>
      ) : null}
      {scene?.nodes.map((node, index) => (
        <button
          key={node.id}
          type="button"
          className={`node ${node.type}${node.id === selectedId ? " selected" : ""}`}
          style={{ left: node.x, top: node.y, zIndex: index + 2 }}
          title={node.title}
          aria-label={node.title}
          onClick={() => {
            if (node.section) onLeaf(node.section);
            else if (node.open) onSelect(node.open);
          }}
        >
          {node.label}
        </button>
      ))}
    </div>
  );
}
