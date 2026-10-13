import { useEffect, useMemo, useRef, useState } from "react";

type Entry = {
  id: string;
  expression: string;
  language: string;
  community: string;
  meaning: string;
  example: string;
  feeling: string;
  context: string;
  intention: string;
  rephrasing: string;
  change: string;
  withheld: string;
  languagePractice: string;
  origin: string;
  identity: string;
  listenerPractice: string;
  alsoUsed: string;
  tags: { emotion: string[]; context: string[]; intention: string[] };
  image: string | null;
  audio: string | null;
  video: string | null;
  source: string;
  userId: string | null;
  mine: boolean;
};

type Profile = { id: string | null; words: number; guest: boolean; reveal: boolean; mine: boolean };

const VOCAB = {
  emotion: ["care", "affection", "joy", "longing", "pride", "frustration", "mixed"],
  context: ["friends", "family", "home", "work", "celebration", "greeting"],
  intention: ["comfort", "approval", "belonging", "humour", "address", "disagreement"],
};

const HINTS: { layer: keyof typeof VOCAB; tag: string; words: string[] }[] = [
  { layer: "emotion", tag: "care", words: ["care", "pain", "hurt", "sorry", "alone", "shame", "sympathy"] },
  { layer: "emotion", tag: "affection", words: ["love", "home", "dear", "sweet"] },
  { layer: "emotion", tag: "joy", words: ["lekker", "tasty", "nice", "good", "pleasure", "great"] },
  { layer: "context", tag: "friends", words: ["friend", "friends"] },
  { layer: "context", tag: "family", words: ["family", "child", "children"] },
  { layer: "context", tag: "home", words: ["home"] },
  { layer: "intention", tag: "comfort", words: ["comfort", "sorry", "pain", "shame", "alone"] },
  { layer: "intention", tag: "approval", words: ["lekker", "deal", "rightful", "approval", "good"] },
];

const STORY: [string, keyof Entry][] = [
  ["Languages you use, and who you use them with", "languagePractice"],
  ["Where it comes from", "origin"],
  ["Also used in", "alsoUsed"],
  ["Meaning", "meaning"],
  ["Example", "example"],
  ["Feeling", "feeling"],
  ["Context", "context"],
  ["Intention", "intention"],
  ["How you would explain it", "rephrasing"],
  ["What changes", "change"],
  ["Who you are around", "withheld"],
  ["Being yourself", "identity"],
  ["When an expression is unfamiliar", "listenerPractice"],
];

function normalize(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

function suggest(text: string) {
  const hay = normalize(text);
  return HINTS.filter((hint) => hint.words.some((word) => hay.includes(word)));
}

function project(point: number[], yaw: number, pitch: number, width: number, height: number) {
  const x1 = point[0] * Math.cos(yaw) + point[2] * Math.sin(yaw);
  const z1 = -point[0] * Math.sin(yaw) + point[2] * Math.cos(yaw);
  const y1 = point[1] * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = point[1] * Math.sin(pitch) + z1 * Math.cos(pitch);
  const depth = 680 / (680 - z2);
  return [width / 2 + x1 * depth, height / 2 + y1 * depth] as const;
}

async function readFile(file: File) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
  return { mime: file.type, data };
}

export function Carry() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [view, setView] = useState<"web" | "shelves" | "add" | "people">("web");
  const [gate, setGate] = useState<"home" | "return" | "create" | "made">("return");
  const [madeId, setMadeId] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [layer, setLayer] = useState<"emotion" | "context" | "intention" | "none">("emotion");
  const [selected, setSelected] = useState<string | null>(null);
  const [yaw, setYaw] = useState(18);
  const [pitch, setPitch] = useState(12);
  const [reveal, setRevealFlag] = useState(false);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 480 });

  async function refresh() {
    const response = await fetch("/api/atlas/entries");
    const data = await response.json();
    if (data.profile && sessionStorage.getItem("atlas-open") === "1") {
      setProfileId(data.profile.id);
      setRevealFlag(Boolean(data.profile.reveal));
    }
    setEntries(data.entries || []);
    const people = await fetch("/api/atlas/profiles");
    const listed = await people.json();
    setProfiles(listed.profiles || []);
  }

  useEffect(() => {
    void refresh().catch(() => setNote("The archive server did not answer."));
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setSize({ width: node.clientWidth || 800, height: node.clientHeight || 480 });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [profileId, view]);

  async function comeIn(body: Record<string, string>) {
    setNote("");
    const response = await fetch("/api/atlas/enter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      setNote(data.error || "Could not come in.");
      return;
    }
    sessionStorage.setItem("atlas-open", "1");
    if (body.kind === "create") {
      setMadeId(data.id);
      setGate("made");
      return;
    }
    await refresh();
  }

  const visible = useMemo(() => {
    const terms = normalize(query).split(" ").filter(Boolean);
    return entries.filter((entry) => {
      const hay = normalize([entry.expression, entry.language, entry.meaning, entry.feeling, entry.context, ...entry.tags.emotion, ...entry.tags.context, ...entry.tags.intention].join(" "));
      return terms.every((term) => hay.includes(term));
    });
  }, [entries, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    visible.forEach((entry) => {
      const key = `${normalize(entry.expression)}|${normalize(entry.language)}`;
      map.set(key, [...(map.get(key) || []), entry]);
    });
    return [...map.entries()].map(([key, accounts]) => ({
      key,
      expression: accounts[0].expression,
      language: accounts[0].language,
      accounts,
    }));
  }, [visible]);

  const scene = useMemo(() => {
    const nodes: { id: string; label: string; sub: string; x: number; y: number }[] = [];
    const lines: { a: string; b: string }[] = [];
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;
    const golden = Math.PI * (3 - Math.sqrt(5));
    groups.forEach((group, index) => {
      const count = Math.max(groups.length, 2);
      const y = 1 - (index / (count - 1)) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * index;
      const point = project(
        [Math.cos(theta) * ring * 230, y * 150, Math.sin(theta) * ring * 230],
        yawRad,
        pitchRad,
        size.width,
        size.height,
      );
      nodes.push({ id: group.key, label: group.expression, sub: group.language, x: point[0], y: point[1] });
    });
    if (layer !== "none") {
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const shared = groups[i].accounts.some((left) =>
            groups[j].accounts.some((right) => left.tags[layer].some((tag) => right.tags[layer].includes(tag))),
          );
          if (shared) lines.push({ a: groups[i].key, b: groups[j].key });
        }
      }
    }
    return { nodes, lines };
  }, [groups, yaw, pitch, size, layer]);

  const chosen = groups.find((group) => group.key === selected) || null;
  const [editing, setEditing] = useState<Entry | null>(null);

  if (!profileId) {
    return (
      <section className="carry-gate">
        <div className="carry-card">
          <p className="carry-eyebrow">Meaning Atlas</p>
          <h1>Meaning Atlas</h1>
          <p className="carry-lede">Choose a word to discover what it means to someone.</p>
          <div className="carry-stack">
            <button className="carry-primary" type="button" onClick={() => void comeIn({ kind: "guest" })}>Explore as a guest</button>
            <button type="button" onClick={() => setGate("return")}>I have an ID</button>
            <button type="button" onClick={() => setGate("create")}>Make an ID</button>
          </div>
          {gate === "create" ? (
            <form className="carry-stack" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void comeIn({ kind: "create", passphrase: String(data.get("pass")) }); }}>
              <label>Choose a passphrase<input name="pass" type="password" minLength={4} required autoComplete="new-password" /></label>
              <button className="carry-primary" type="submit">Make my ID</button>
              <button type="button" onClick={() => setGate("home")}>Back</button>
            </form>
          ) : null}
          {gate === "made" ? (
            <div>
              <p className="carry-lede">Write this down. It is how you log in again.</p>
              <p className="carry-id">{madeId}</p>
              <button className="carry-primary" type="button" onClick={() => void refresh()}>Enter the atlas</button>
            </div>
          ) : null}
          {note ? <p className="carry-bad">{note}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <div className="carry">
      <header className="carry-top">
        <div>
          <strong>Meaning Atlas</strong>
        </div>
        <nav>
          <button type="button" className={view === "web" ? "on" : ""} onClick={() => setView("web")}>Word web</button>
          {profileId ? (
            <>
              <button type="button" className={view === "shelves" ? "on" : ""} onClick={() => setView("shelves")}>Shelves</button>
              <button type="button" className={view === "add" ? "on" : ""} onClick={() => { setEditing(null); setView("add"); }}>Add a word</button>
              <button type="button" className={view === "people" ? "on" : ""} onClick={() => setView("people")}>Your account</button>
            </>
          ) : null}
        </nav>
        <div className="carry-who">
          {profileId ? <span>{reveal ? profileId : "ID hidden"}</span> : null}
          {profileId ? <button type="button" onClick={() => void fetch("/api/atlas/leave", { method: "POST" }).then(() => { sessionStorage.removeItem("atlas-open"); setProfileId(null); setGate("return"); setView("web"); })}>Log out</button> : null}
        </div>
      </header>
      {view === "web" ? (
        <main className="carry-main">
          <div className="carry-tools">
            <label>Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Word, language or meaning" /></label>
            <label>Similarity layer
              <select value={layer} onChange={(event) => setLayer(event.target.value as typeof layer)}>
                <option value="emotion">Emotion</option>
                <option value="context">Context</option>
                <option value="intention">Intention</option>
                <option value="none">No dashed lines</option>
              </select>
            </label>
          </div>
          <p className="carry-fine">Drag the web, or use the controls under it. Only words are in the web. A dashed line is a shared label. Press a word for its meanings. Press it again to return to the project.</p>
          <div
            ref={stageRef}
            className="carry-stage"
            onPointerDown={(event) => { if ((event.target as HTMLElement).closest(".carry-node")) return; drag.current = { x: event.clientX, y: event.clientY, yaw, pitch }; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); }}
            onPointerMove={(event) => {
              if (!drag.current) return;
              setYaw(drag.current.yaw + (event.clientX - drag.current.x) * 0.35);
              setPitch(Math.max(-55, Math.min(55, drag.current.pitch + (event.clientY - drag.current.y) * 0.15)));
            }}
            onPointerUp={() => { drag.current = null; }}
          >
            <svg aria-hidden="true">
              {scene.lines.map((line) => {
                const a = scene.nodes.find((node) => node.id === line.a);
                const b = scene.nodes.find((node) => node.id === line.b);
                if (!a || !b) return null;
                return <line key={`${line.a}-${line.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#d7c6e6" strokeDasharray="5 6" />;
              })}
            </svg>
            {scene.nodes.map((node) => (
              <button key={node.id} type="button" className={`carry-node word${node.id === selected ? " on" : ""}`} style={{ left: node.x, top: node.y }} onClick={() => setSelected((current) => current === node.id ? null : node.id)}>
                <b>{node.label}</b>
                <small>{node.sub}</small>
              </button>
            ))}
          </div>
          <div className="carry-controls">
            <label>Rotate<input type="range" min={-180} max={180} value={yaw} onChange={(event) => setYaw(Number(event.target.value))} /></label>
            <label>Tilt<input type="range" min={-55} max={55} value={pitch} onChange={(event) => setPitch(Number(event.target.value))} /></label>
            <button type="button" onClick={() => { setYaw(24); setPitch(16); }}>Reset view</button>
          </div>
          <article className="carry-story">
            {chosen ? chosen.accounts.map((entry) => <Story key={entry.id} entry={entry} />) : <ProjectInfo />}
          </article>
        </main>
      ) : null}
      {view === "shelves" ? <Shelves entries={visible} query={query} onQuery={setQuery} /> : null}
      {view === "people" ? (
        <Account
          entries={entries.filter((entry) => entry.mine)}
          profileId={profileId}
          reveal={reveal}
          onToggle={async (next) => { await fetch("/api/atlas/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reveal: next }) }); setRevealFlag(next); await refresh(); }}
          onEdit={(entry) => { setEditing(entry); setView("add"); }}
          onLeave={() => void fetch("/api/atlas/leave", { method: "POST" }).then(() => { sessionStorage.removeItem("atlas-open"); setProfileId(null); setGate("return"); setView("web"); })}
        />
      ) : null}
      {view === "add" ? <Add key={editing?.id || "new"} initial={editing} onDone={async () => { setEditing(null); await refresh(); setView("people"); }} /> : null}
    </div>
  );
}

function ProjectInfo() {
  return (
    <section className="carry-concept">
      <p className="carry-eyebrow">Meaning Atlas</p>
      <h2>What this is</h2>
      <p>The current website is a proof of concept for Meaning Atlas. I wanted to show how a word can open into someone’s personal experience, including what it means to them, how they use it, and the emotions or memories attached to it. Visitors can explore the map, search for words, and select them to read the accounts behind them. The connections show where people have used similar labels for feelings, contexts, or intentions, while still keeping their individual explanations visible.</p>
      <p>With the wider project, I want to explore what we miss when we translate a word without understanding the person or context behind it. Meaning Atlas would become an interactive installation where people can explore these accounts and contribute their own. I am considering a projected map alongside VR, where others can see an avatar interacting with the nodes, and a possible floor projection that visitors can explore separately. People would also be able to scan a QR code and add words through their phones. The aim is to let people find connections across their experiences while leaving room for meanings that are different or difficult to explain.</p>
    </section>
  );
}

function Story({ entry }: { entry: Entry }) {
  return (
    <>
      <p className="carry-eyebrow">{entry.source === "example" ? "Example, not a survey response" : entry.source === "survey" ? "From the survey" : "Added here"}</p>
      <h2>{entry.expression}</h2>
      <p className="carry-fine">{entry.language}{entry.community ? ` · ${entry.community}` : ""}{entry.userId ? ` · ${entry.userId}` : ""}</p>
      {STORY.map(([label, key]) => {
        const text = String(entry[key] || "");
        if (!text) return null;
        return <div className="carry-pair" key={label}><span>{label}</span><p>{text}</p></div>;
      })}
      {entry.image ? <img src={entry.image} alt="" /> : null}
      {entry.audio ? <audio controls src={entry.audio} /> : null}
      {entry.video ? <video controls src={entry.video} /> : null}
    </>
  );
}

function Shelves({ entries, query, onQuery }: { entries: Entry[]; query: string; onQuery: (value: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const languages = [...new Set(entries.map((entry) => entry.language))].sort((a, b) => a.localeCompare(b, "en"));
  return (
    <main className="carry-main">
      <h2>Language shelves</h2>
      <p className="carry-lede">The books stand in alphabetical order. Open one and it lays flat so you can read it. Search stays on this shelf.</p>
      <label className="carry-search">Search<input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Language, word or meaning" /></label>
      <div className="shelf-row">
        {languages.map((language) => {
          const isOpen = open === language;
          return (
            <button key={language} type="button" className={`spine${isOpen ? " on" : ""}`} onClick={() => { setOpen(isOpen ? null : language); setReading(null); }}>
              <span>{language}</span>
            </button>
          );
        })}
      </div>
      {open ? (
        <article className="spread">
          <header>
            <h2>{open}</h2>
            <button type="button" onClick={() => { setOpen(null); setReading(null); }}>Close the book</button>
          </header>
          <div className="spread-body">
            <nav>
              {entries.filter((entry) => entry.language === open).sort((a, b) => a.expression.localeCompare(b.expression, "en")).map((entry) => (
                <button key={entry.id} type="button" className={reading === entry.id ? "on" : ""} onClick={() => setReading(reading === entry.id ? null : entry.id)}>
                  {entry.expression}
                </button>
              ))}
            </nav>
            <div>
              {entries.find((entry) => entry.id === reading) ? <Story entry={entries.find((entry) => entry.id === reading)!} /> : <p>Choose a word. They are in alphabetical order.</p>}
            </div>
          </div>
        </article>
      ) : null}
    </main>
  );
}

function Account({ entries, profileId, reveal, onToggle, onEdit, onLeave }: { entries: Entry[]; profileId: string; reveal: boolean; onToggle: (next: boolean) => void; onEdit: (entry: Entry) => void; onLeave: () => void }) {
  const mine = [...entries].sort((a, b) => a.expression.localeCompare(b.expression, "en"));
  return (
    <main className="carry-main">
      <h2>Your account</h2>
      <p className="carry-lede">{reveal ? profileId : "Your ID is hidden on the web."} You can log out, or open a word you posted and change it.</p>
      <div className="carry-stack">
        <label className="carry-check"><input type="checkbox" checked={reveal} onChange={(event) => onToggle(event.target.checked)} /> Show my ID</label>
        <button type="button" onClick={onLeave}>Log out</button>
      </div>
      {mine.length ? mine.map((entry) => (
        <article key={entry.id} className="carry-book">
          <strong>{entry.expression}</strong>
          <span>{entry.language}</span>
          <button type="button" onClick={() => onEdit(entry)}>Edit</button>
        </article>
      )) : <p>You have not posted a word yet.</p>}
    </main>
  );
}

function People({ profiles, reveal, onToggle }: { profiles: Profile[]; reveal: boolean; onToggle: (next: boolean) => void }) {
  return (
    <main className="carry-main">
      <h2>Profiles</h2>
      <p className="carry-lede">People stay hidden. This list shows only those who chose to show an ID, and your own record.</p>
      <label className="carry-check"><input type="checkbox" checked={reveal} onChange={(event) => onToggle(event.target.checked)} /> Show my ID on the web</label>
      <div className="carry-books">
        {profiles.map((person) => (
          <div key={person.mine ? "me" : person.id || "hidden"} className="carry-book">
            <strong>{person.mine && !person.reveal ? "Your ID is hidden" : person.id}</strong>
            <span>{person.words} {person.words === 1 ? "word" : "words"}{person.mine ? " · you" : ""}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

function Add({ initial, onDone }: { initial?: Entry | null; onDone: (id: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Record<string, string[]>>({
    emotion: initial?.tags.emotion || [],
    context: initial?.tags.context || [],
    intention: initial?.tags.intention || [],
  });
  const [custom, setCustom] = useState({ emotion: "", context: "", intention: "" });
  const [image, setImage] = useState<{ mime: string; data: string } | null>(null);
  const [audio, setAudio] = useState<{ mime: string; data: string } | null>(null);
  const [video, setVideo] = useState<{ mime: string; data: string } | null>(null);
  const [error, setError] = useState("");
  const noticed = suggest(text).filter((hint) => !picked[hint.layer].includes(hint.tag));

  function toggle(layer: keyof typeof VOCAB, tag: string) {
    setPicked((current) => {
      const has = current[layer].includes(tag);
      return { ...current, [layer]: has ? current[layer].filter((item) => item !== tag) : [...current[layer], tag] };
    });
  }

  return (
    <main className="carry-main">
      <form className="carry-form" onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const data = new FormData(event.currentTarget);
        const emotion = [...picked.emotion, ...custom.emotion.split(";")].filter(Boolean).join(";");
        const contextTags = [...picked.context, ...custom.context.split(";")].filter(Boolean).join(";");
        const intentionTags = [...picked.intention, ...custom.intention.split(";")].filter(Boolean).join(";");
        const response = await fetch(initial ? "/api/atlas/update" : "/api/atlas/entries", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: initial?.id,
            expression: data.get("expression"),
            language: data.get("language"),
            alsoUsed: data.get("alsoUsed"),
            community: data.get("community"),
            meaning: data.get("meaning"),
            example: data.get("example"),
            feeling: data.get("feeling"),
            context: data.get("context"),
            intention: data.get("intention"),
            rephrasing: data.get("rephrasing"),
            change: data.get("change"),
            withheld: data.get("withheld"),
            languagePractice: data.get("languagePractice"),
            origin: data.get("origin"),
            identity: data.get("identity"),
            listenerPractice: data.get("listenerPractice"),
            emotion,
            contextTags,
            intentionTags,
            image,
            audio,
            video,
          }),
        });
        const body = await response.json();
        if (!response.ok) { setError(body.error || "Could not save that."); return; }
        await onDone(body.id);
      }}>
        <p className="carry-eyebrow">One language for this word</p>
        <h2>{initial ? "Edit this word" : "Add what it means to you"}</h2>
        <div className="carry-two">
          <label>Word<input name="expression" required maxLength={120} defaultValue={initial?.expression || ""} /></label>
          <label>One language<input name="language" required maxLength={80} placeholder="The language this word belongs to" defaultValue={initial?.language || ""} /></label>
        </div>
        <label>Also used in other languages<input name="alsoUsed" placeholder="Only if you use it across others. Separate with ;" defaultValue={initial?.alsoUsed || ""} /></label>
        <div className="carry-uploads">
          <label>Image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async (event) => { const file = event.target.files?.[0]; setImage(file ? await readFile(file) : null); }} /><span>Optional. Empty means no picture.</span></label>
          <label>Audio<input type="file" accept="audio/*" onChange={async (event) => { const file = event.target.files?.[0]; setAudio(file ? await readFile(file) : null); }} /><span>Optional. Empty means no player.</span></label>
          <label>Video<input type="file" accept="video/mp4,video/webm" onChange={async (event) => { const file = event.target.files?.[0]; setVideo(file ? await readFile(file) : null); }} /><span>Optional. Empty means no video.</span></label>
        </div>
        <label>Community, if it matters<input name="community" defaultValue={initial?.community || ""} /></label>
        <label>What languages or ways of speaking do you use, and who do you usually use them with?<textarea name="languagePractice" defaultValue={initial?.languagePractice || ""} /></label>
        <label>Where does this expression come from for you?<textarea name="origin" defaultValue={initial?.origin || ""} /></label>
        <label>In an example, what does it mean to you, and what feeling are you trying to express?<textarea name="meaning" required defaultValue={initial?.meaning || ""} onChange={(event) => setText(event.target.value)} /></label>
        <label>How would you use it? Give an example and who you would be speaking to.<textarea name="example" defaultValue={initial?.example || ""} /></label>
        <label>How would you explain or replace it for someone who doesn’t understand it?<textarea name="rephrasing" defaultValue={initial?.rephrasing || ""} /></label>
        <label>What, if anything, changes when you explain it?<textarea name="change" defaultValue={initial?.change || ""} /></label>
        <label>Does who you are around change whether you use it?<textarea name="withheld" defaultValue={initial?.withheld || ""} /></label>
        <label>Does changing how you speak affect how comfortable you feel being yourself?<textarea name="identity" defaultValue={initial?.identity || ""} /></label>
        <label>When someone uses an expression you don’t know, what do you usually do?<textarea name="listenerPractice" defaultValue={initial?.listenerPractice || ""} /></label>
        <details>
          <summary>Separate a feeling, context, or intention</summary>
          <label>Feeling<textarea name="feeling" defaultValue={initial?.feeling || ""} onChange={(event) => setText((value) => `${value} ${event.target.value}`)} /></label>
          <label>Who you use it with<textarea name="context" defaultValue={initial?.context || ""} /></label>
          <label>What you are trying to do<textarea name="intention" defaultValue={initial?.intention || ""} /></label>
        </details>
        <p className="carry-fine">Choose a label, or add your own. Anything noticed in what you wrote is offered here. It is not applied until you choose it.</p>
        {noticed.length ? (
          <div className="carry-chips">
            {noticed.map((hint) => (
              <button key={`${hint.layer}-${hint.tag}`} type="button" onClick={() => toggle(hint.layer, hint.tag)}>Add {hint.tag} · {hint.layer}</button>
            ))}
          </div>
        ) : null}
        {(Object.keys(VOCAB) as (keyof typeof VOCAB)[]).map((layer) => (
          <fieldset key={layer}>
            <legend>{layer}</legend>
            <div className="carry-chips">
              {VOCAB[layer].map((tag) => (
                <label key={tag} className={picked[layer].includes(tag) ? "on" : ""}>
                  <input type="checkbox" checked={picked[layer].includes(tag)} onChange={() => toggle(layer, tag)} /> {tag}
                </label>
              ))}
            </div>
            <label>Add to {layer}<input value={custom[layer]} placeholder="your own labels, separated by ;" onChange={(event) => setCustom((current) => ({ ...current, [layer]: event.target.value }))} /></label>
          </fieldset>
        ))}
        <button className="carry-primary" type="submit">{initial ? "Save changes" : "Place it on the web"}</button>
        {error ? <p className="carry-bad">{error}</p> : null}
      </form>
    </main>
  );
}
