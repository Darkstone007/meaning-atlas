import { useState } from "react";
import { cleanBackup } from "@/lib/atlas/backup";
import { csvRecords, FIELD_LABELS, isContactHeader, normalize, parseCSV, type ColumnMap, type Draft } from "@/lib/atlas/core";
import { NARRATIVE_FIELDS, type NarrativeField } from "@/lib/atlas/types";

const MAP_FIELDS: (NarrativeField | "consent")[] = [...NARRATIVE_FIELDS, "consent"];

function guess(header: string, field: string): boolean {
  const text = normalize(header);
  const hints: Record<string, string[]> = {
    expression: ["word or expression", "one word"],
    languagePractice: ["ways of speaking", "languages or ways"],
    origin: ["come from", "where does this"],
    example: ["sentence or conversation", "how would you use"],
    meaning: ["what does it mean", "feeling are you trying"],
    rephrasing: ["explain or replace", "understand it"],
    withheld: ["who you are around", "whether you use"],
    identity: ["being yourself", "comfortable you feel"],
    listenerPractice: ["you don’t know", "you don't know", "unfamiliar"],
    attribution: ["what name", "would you like shown"],
    consent: ["comfortable having", "contribution used"],
    languages: ["language label"],
    community: ["community, dialect", "community or variety"],
  };
  return (hints[field] ?? [field]).some((hint) => text.includes(normalize(hint)));
}

export function ImportView({
  held,
  onCommit,
  onRestore,
  onExport,
}: {
  held: { id: string; expression: string; attribution: string }[];
  onCommit: (items: Draft[]) => Promise<void>;
  onRestore: (file: File) => Promise<void>;
  onExport: () => void;
}) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [map, setMap] = useState<ColumnMap>({});
  const [limit, setLimit] = useState("5");
  const [languages, setLanguages] = useState("");
  const [community, setCommunity] = useState("");
  const [preview, setPreview] = useState<{ ready: Draft[]; skipped: string[] } | null>(null);
  const [attest, setAttest] = useState(false);
  const [restoreAttest, setRestoreAttest] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const onCsv = async (file: File | undefined) => {
    setError("");
    setPreview(null);
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("CSV limit is 5 MB.");
      const parsed = parseCSV(await file.text());
      const next: ColumnMap = {};
      for (const field of MAP_FIELDS) {
        const index = parsed[0].findIndex((header) => !isContactHeader(header) && guess(header, field));
        next[field] = index;
      }
      setRows(parsed);
      setMap(next);
    } catch (caught) {
      setRows(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const previewImport = () => {
    if (!rows) return;
    setError("");
    try {
      if ((map.expression ?? -1) < 0 || (map.meaning ?? -1) < 0) throw new Error("Map the expression and the meaning first.");
      if ((map.languages ?? -1) < 0 && !languages.trim()) {
        throw new Error("Map a language column, or give a shelf language label for this import.");
      }
      const count = limit === "all" ? Math.min(rows.length - 1, 200) : 5;
      const result = csvRecords(rows, map, count, { languages, community });
      setPreview(result);
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  return (
    <div className="import-panel">
      <span className="eyebrow">Survey export</span>
      <h2>From the form into the archive.</h2>
      <p className="intro">
        Export the form as CSV, then match columns. Only mapped answers are imported. Email, phone, WhatsApp and timestamp columns are ignored. A response that asks not to be displayed is skipped.
      </p>
      {error ? <p className="danger">{error}</p> : null}
      <label>
        Survey CSV
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            void onCsv(event.target.files?.[0]);
          }}
        />
      </label>
      {rows ? (
        <div>
          <div className="import-grid">
            {MAP_FIELDS.map((field) => (
              <label key={field}>
                {field === "consent" ? "How the contribution may be used" : FIELD_LABELS[field]}
                {field === "expression" || field === "meaning" ? " *" : ""}
                <select
                  value={String(map[field] ?? -1)}
                  onChange={(event) => {
                    setPreview(null);
                    setMap((current) => ({ ...current, [field]: Number(event.target.value) }));
                  }}
                >
                  <option value={-1}>Do not import</option>
                  {rows[0].map((header, index) => (
                    <option key={header + index} value={index} disabled={isContactHeader(header)}>
                      {isContactHeader(header) ? `${header} (never imported)` : header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="two">
            <label>
              Shelf language if the CSV has no language column
              <input value={languages} maxLength={240} placeholder="Wolof" onChange={(event) => { setPreview(null); setLanguages(event.target.value); }} />
            </label>
            <label>
              Community label if the CSV has no community column
              <input value={community} maxLength={240} onChange={(event) => { setPreview(null); setCommunity(event.target.value); }} />
            </label>
          </div>
          <label>
            How many responses?
            <select value={limit} onChange={(event) => { setPreview(null); setLimit(event.target.value); }}>
              <option value="5">First 5 data rows</option>
              <option value="all">All data rows (up to 200)</option>
            </select>
          </label>
          <button type="button" onClick={previewImport}>
            Preview mapped answers
          </button>
          <div className="preview">
            {!preview ? <p>Preview again after changing the mapping.</p> : null}
            {preview?.skipped.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {preview?.ready.map((item, index) => (
              <div key={item.expression + index}>
                <h3>
                  {index + 1}. {item.expression} · {item.languages}
                  {item.attribution ? ` · ${item.attribution}` : ""}
                </h3>
                {NARRATIVE_FIELDS.filter((key) => item[key] && !["expression", "languages"].includes(key)).map((key) => (
                  <p key={key}>
                    {FIELD_LABELS[key]}: {item[key]}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={attest} onChange={(event) => setAttest(event.target.checked)} />
            <span>I have verified permission to display these answers. I will review account types and attach only permitted media after importing.</span>
          </label>
          <button
            type="button"
            className="primary"
            disabled={!preview?.ready.length || !attest}
            onClick={() => preview && void onCommit(preview.ready)}
          >
            Import reviewed responses
          </button>
        </div>
      ) : null}

      <hr />
      <h3>Held from display</h3>
      {!held.length ? <p className="quiet">No withheld accounts are stored in this browser.</p> : null}
      {held.map((item) => (
        <p key={item.id} className="quiet">
          {item.expression} · {item.attribution || "No name"} — kept in this browser, not shown in the web or shelves.
        </p>
      ))}

      <hr />
      <h3>Move or back up this archive</h3>
      <p className="quiet">
        A JSON backup includes accounts and media on this browser, including anything held from display. Keep it private unless contributors agreed to share it. Restore adds only records whose IDs are not already present.
      </p>
      <button type="button" onClick={onExport}>
        Download complete backup
      </button>
      <label>
        Restore a backup
        <input type="file" accept=".json,application/json" onChange={(event) => setRestoreFile(event.target.files?.[0] ?? null)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={restoreAttest} onChange={(event) => setRestoreAttest(event.target.checked)} />
        <span>I have permission to display the content of this backup here.</span>
      </label>
      <button
        type="button"
        onClick={() => {
          if (!restoreFile) {
            setError("Choose a JSON backup.");
            return;
          }
          if (!restoreAttest) {
            setError("Confirm permission to display this backup.");
            return;
          }
          void onRestore(restoreFile);
        }}
      >
        Restore selected backup
      </button>
    </div>
  );
}

export async function readBackup(file: File) {
  if (file.size > 36 * 1024 * 1024) throw new Error("Backup exceeds 36 MB.");
  return cleanBackup(JSON.parse(await file.text()));
}
