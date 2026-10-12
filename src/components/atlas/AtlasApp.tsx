import { useEffect, useState } from "react";
import { readBackup } from "@/components/atlas/ImportView";
import { ContributeForm } from "@/components/atlas/ContributeForm";
import { DetailPanel } from "@/components/atlas/DetailPanel";
import { ImportView } from "@/components/atlas/ImportView";
import { MethodView } from "@/components/atlas/MethodView";
import { WordWeb } from "@/components/atlas/WordWeb";
import { deleteStored, loadStored, persistAccounts } from "@/lib/atlas/db";
import { connections, grouped, isDisplayed, languageLabels, normalize, personalEdges, search, tags, type Draft } from "@/lib/atlas/core";
import { SEED } from "@/lib/atlas/seed";
import { NARRATIVE_FIELDS, type Account } from "@/lib/atlas/types";

const MAX_RECORDS = 200;
const MAX_ARCHIVE = 36 * 1024 * 1024;
type View = "explore" | "contribute" | "import" | "method";

export function AtlasApp() {
  const [records, setRecords] = useState<Account[]>(SEED);
  const [view, setView] = useState<View>("explore");
  const [selected, setSelected] = useState<string | null>(SEED[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [layer, setLayer] = useState("emotion");
  const [shelvesOn, setShelvesOn] = useState(false);
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(10);
  const [status, setStatus] = useState("Three permitted survey accounts are in the archive. Additions stay in this browser.");
  const [isError, setIsError] = useState(false);
  const [undo, setUndo] = useState<Account | null>(null);
  const [formMode, setFormMode] = useState<{ edit: Account | null; copy: Account | null; key: number }>({
    edit: null,
    copy: null,
    key: 0,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await loadStored();
        if (cancelled) return;
        if (!stored.length) {
          await persistAccounts(SEED);
          return;
        }
        setRecords(stored);
        setSelected((current) =>
          stored.some((record) => record.id === current) ? current : (stored.find(isDisplayed)?.id ?? stored[0]?.id ?? null),
        );
      } catch (caught) {
        if (cancelled) return;
        setIsError(true);
        setStatus(caught instanceof Error ? caught.message : "Local storage is unavailable.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const note = (text: string, error = false) => {
    setStatus(text);
    setIsError(error);
    setUndo(null);
  };

  const shown = records.filter(isDisplayed);
  const visible = search(shown, query);
  const edges = layer === "personal" ? personalEdges(visible) : connections(visible, layer);
  const groups = grouped(visible);
  const languages = [...new Set(shown.flatMap((record) => tags(record.languages)))];

  const openForm = (edit: Account | null, copy: Account | null) => {
    setFormMode({ edit, copy, key: Date.now() });
    setView("contribute");
    window.scrollTo({ top: 0 });
  };

  const save = async (record: Account) => {
    const exists = records.some((item) => item.id === record.id);
    if (!exists && records.length >= MAX_RECORDS) throw new Error("Prototype limit: 200 accounts.");
    const next = exists ? records.map((item) => (item.id === record.id ? record : item)) : [...records, record];
    if (JSON.stringify(next).length > MAX_ARCHIVE) throw new Error("Local archive size limit reached. Remove or compress media.");
    await persistAccounts([record]);
    setRecords(next);
    setSelected(record.id);
    setQuery("");
    setShelvesOn(false);
    setView("explore");
    note(
      record.consent.informOnly
        ? "Saved in this browser and held from the web, as requested."
        : "Account saved. The web, shelves, search and connections are updated.",
    );
  };

  const remove = async (record: Account) => {
    try {
      await deleteStored(record.id);
      const next = records.filter((item) => item.id !== record.id);
      setRecords(next);
      setSelected(next.find(isDisplayed)?.id ?? null);
      setUndo(record);
      setStatus("Account removed from this browser.");
      setIsError(false);
    } catch (caught) {
      note(caught instanceof Error ? caught.message : String(caught), true);
    }
  };

  const restoreUndo = async () => {
    if (!undo) return;
    try {
      await persistAccounts([undo]);
      setRecords((current) => [...current, undo]);
      setSelected(undo.id);
      note("Account restored.");
    } catch (caught) {
      note(caught instanceof Error ? caught.message : String(caught), true);
    }
  };

  const commit = async (items: Draft[]) => {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(items.map((item) => NARRATIVE_FIELDS.map((key) => item[key]))));
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      const batch = [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, "0")).join("");
      const now = new Date().toISOString();
      const incoming: Account[] = [];
      items.forEach((item, index) => {
        const id = `survey:${batch}:${index}`;
        if (records.some((record) => record.id === id)) return;
        incoming.push({ ...item, id, createdAt: now, updatedAt: now });
      });
      if (records.length + incoming.length > MAX_RECORDS) throw new Error("Prototype limit: 200 accounts.");
      await persistAccounts(incoming);
      setRecords((current) => [...current, ...incoming]);
      if (incoming[0]) setSelected(incoming[0].id);
      setQuery("");
      setView("explore");
      note(`Imported ${incoming.length} accounts. The same mapped batch is skipped if imported again. Review labels before treating a connection as coded.`);
    } catch (caught) {
      note(caught instanceof Error ? caught.message : String(caught), true);
    }
  };

  const restore = async (file: File) => {
    try {
      const restored = await readBackup(file);
      const incoming = restored.filter((record) => !records.some((item) => item.id === record.id));
      if (records.length + incoming.length > MAX_RECORDS || JSON.stringify([...records, ...incoming]).length > MAX_ARCHIVE) {
        throw new Error("Restoring would exceed the archive capacity.");
      }
      await persistAccounts(incoming);
      setRecords((current) => [...current, ...incoming]);
      if (incoming[0]) setSelected(incoming[0].id);
      setView("explore");
      note(`Restored ${incoming.length} new accounts. Existing IDs were kept unchanged.`);
    } catch (caught) {
      note(caught instanceof Error ? caught.message : String(caught), true);
    }
  };

  const exportArchive = () => {
    const json = JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), accounts: records }, null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "meaning-atlas-backup.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    note("Backup downloaded, including media. Store it according to contributor permissions.");
  };

  const go = (next: View) => {
    if (next === "contribute") openForm(null, null);
    else {
      setView(next);
      window.scrollTo({ top: 0 });
    }
  };

  return (
    <div className="atlas">
      <header>
        <div className="brand">
          Meaning Atlas
          <small>WORDS HOLD MORE THAN DEFINITIONS</small>
        </div>
        <nav aria-label="Main navigation">
          {(["explore", "contribute", "import", "method"] as const).map((item) => (
            <button key={item} type="button" className={view === item ? "active" : ""} onClick={() => go(item)}>
              {item === "explore" ? "Explore" : item === "contribute" ? "Contribute" : item === "import" ? "Import & backup" : "Method"}
            </button>
          ))}
        </nav>
      </header>
      <div className={`status${isError ? " error" : ""}`} role="status" aria-live="polite">
        {status}{" "}
        {undo ? (
          <button type="button" className="small-button" onClick={() => void restoreUndo()}>
            Undo
          </button>
        ) : null}
      </div>
      <main>
        {view === "explore" ? (
          <div>
            <span className="eyebrow">An archive shaped by the people who speak</span>
            <h1>
              A word is only
              <br />
              the beginning.
            </h1>
            <p className="intro">
              Follow an expression into the accounts people actually gave. The same spelling can hold different meanings. A dashed line is a shared label, not a translation.
            </p>
            <div className="stats">
              <span>
                <strong>{shown.length}</strong> accounts
              </span>
              <span>
                <strong>{grouped(shown).length}</strong> expressions
              </span>
              <span>
                <strong>{languages.length}</strong> language labels
              </span>
            </div>
            <div className="toolbar">
              <label>
                Find an expression, language, feeling or name
                <input type="search" value={query} placeholder="Search the archive" onChange={(event) => setQuery(event.target.value)} />
              </label>
              <label>
                Connection layer
                <select value={layer} onChange={(event) => setLayer(event.target.value)}>
                  <option value="emotion">Shared feeling</option>
                  <option value="context">Shared context</option>
                  <option value="intention">Shared intention</option>
                  <option value="media">Shared media annotation</option>
                  <option value="personal">Participant associations</option>
                  <option value="none">Tree branches only</option>
                </select>
              </label>
              <div className="row">
                <button type="button" className={shelvesOn ? "" : "active"} aria-pressed={!shelvesOn} onClick={() => setShelvesOn(false)}>
                  Web
                </button>
                <button type="button" className={shelvesOn ? "active" : ""} aria-pressed={shelvesOn} onClick={() => setShelvesOn(true)}>
                  Shelves
                </button>
              </div>
            </div>
            <div className="workspace">
              <div>
                <div className="graph-wrap" hidden={shelvesOn}>
                  <div className="graph-head">
                    <span>
                      {visible.length} accounts · {edges.length} connections
                    </span>
                    <span>Perspective view</span>
                  </div>
                  <WordWeb
                    visible={visible}
                    records={records}
                    edges={edges}
                    selectedId={selected}
                    yaw={yaw}
                    pitch={pitch}
                    onSelect={setSelected}
                    onLeaf={(section) => {
                      document.getElementById(`section-${section}`)?.scrollIntoView({
                        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                        block: "center",
                      });
                    }}
                    onContribute={() => openForm(null, null)}
                  />
                  <div className="graph-foot">
                    <span>Solid: a response branch</span>
                    <span>Dashed: a labelled connection</span>
                    <label>
                      Rotate
                      <input type="range" min={-180} max={180} value={yaw} onChange={(event) => setYaw(Number(event.target.value))} />
                    </label>
                    <label>
                      Tilt
                      <input type="range" min={-40} max={40} value={pitch} onChange={(event) => setPitch(Number(event.target.value))} />
                    </label>
                  </div>
                </div>
                <div hidden={!shelvesOn}>
                  {!groups.length ? <p>No expressions yet. Add a contribution or import survey responses.</p> : null}
                  {(() => {
                    const shelfLanguages = [
                      ...new Map(
                        groups.flatMap((group) => languageLabels(group.languages).map((label) => [normalize(label), label])),
                      ).values(),
                    ].sort((a, b) => a.localeCompare(b, "en"));
                    return shelfLanguages.map((language) => {
                      const shelf = groups.filter((group) =>
                        languageLabels(group.languages).some((label) => normalize(label) === normalize(language)),
                      );
                      return (
                        <section key={language} className="shelf">
                          <div className="shelf-head">
                            <h2>{language}</h2>
                            <span className="quiet">{shelf.length} expressions</span>
                          </div>
                          <div className="shelf-cards">
                            {shelf.map((group) => (
                              <button
                                key={group.key}
                                type="button"
                                className="book"
                                onClick={() => {
                                  setSelected(group.accounts[0].id);
                                  setShelvesOn(false);
                                }}
                              >
                                <strong>{group.expression}</strong>
                                <span>{group.community || "Community not specified"}</span>
                                <span>{group.accounts.length} accounts · locate in web</span>
                              </button>
                            ))}
                          </div>
                        </section>
                      );
                    });
                  })()}
                </div>
                <p className="quiet">
                  {visible.length} matching accounts. Connections compare accounts, not whole languages.
                  {visible.length > 50 ? " The web shows the first 50; shelves keep the rest." : ""} Same spelling with a different community label stays a separate word.
                </p>
              </div>
              <DetailPanel
                records={shown}
                visible={visible}
                selectedId={selected}
                edges={edges}
                onSelect={setSelected}
                onAnother={(account) => openForm(null, account)}
                onEdit={(account) => openForm(account, null)}
                onRemove={(account) => void remove(account)}
              />
            </div>
          </div>
        ) : null}
        {view === "contribute" ? (
          <ContributeForm key={formMode.key} records={shown} edit={formMode.edit} copy={formMode.copy} onCancel={() => setView("explore")} onSave={save} />
        ) : null}
        {view === "import" ? (
          <ImportView
            held={records.filter((record) => !isDisplayed(record)).map((record) => ({
              id: record.id,
              expression: record.expression,
              attribution: record.attribution,
            }))}
            onCommit={commit}
            onRestore={restore}
            onExport={exportArchive}
          />
        ) : null}
        {view === "method" ? <MethodView /> : null}
      </main>
      <footer>
        Local archive · Original accounts remain distinct · No automatic translation or interpretation
        <br />
        Writing is shown only with display permission. Contact details are not stored.
      </footer>
    </div>
  );
}
