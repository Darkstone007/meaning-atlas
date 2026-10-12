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
  tags: { emotion: string[]; context: string[]; intention: string[] };
  image: string | null;
  audio: string | null;
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
  ["Meaning", "meaning"],
  ["Example", "example"],
  ["Feeling", "feeling"],
  ["Context", "context"],
  ["Intention", "intention"],
  ["Rephrasing", "rephrasing"],
  ["What changes", "change"],
  ["When it is held back", "withheld"],
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
  const [gate, setGate] = useState<"home" | "return" | "create" | "made">("home");
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
    if (data.profile) {
      setProfileId(data.profile.id);
      setRevealFlag(Boolean(data.profile.reveal));
    }
    setEntries(data.entries || []);
    if (!selected && data.entries?.[0]) setSelected(data.entries[0].id);
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

  const scene = useMemo(() => {
    const groups = new Map<string, Entry[]>();
    visible.forEach((entry) => {
      const key = `${normalize(entry.expression)}|${normalize(entry.language)}`;
      groups.set(key, [...(groups.get(key) || []), entry]);
    });
    const list = [...groups.values()];
    const nodes: { id: string; label: string; kind: string; open: string; x: number; y: number }[] = [];
    const lines: { a: string; b: string; dashed: boolean }[] = [];
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;
    list.forEach((accounts, index) => {
      const x = (index - (list.length - 1) / 2) * 190;
      const wordId = `w${index}`;
      const wordPoint = project([x, -120, 0], yawRad, pitchRad, size.width, size.height);
      nodes.push({ id: wordId, label: accounts[0].expression, kind: "word", open: accounts[0].id, x: wordPoint[0], y: wordPoint[1] });
      accounts.forEach((entry, child) => {
        const spread = accounts.length === 1 ? 0 : (child - (accounts.length - 1) / 2) * 86;
        const point = project([x + spread, 70, 36], yawRad, pitchRad, size.width, size.height);
        nodes.push({
          id: entry.id,
          label: entry.userId || "account",
          kind: "response",
          open: entry.id,
          x: point[0],
          y: point[1],
        });
        lines.push({ a: wordId, b: entry.id, dashed: false });
      });
    });
    if (layer !== "none") {
      for (let i = 0; i < visible.length; i++) {
        for (let j = i + 1; j < visible.length; j++) {
          const shared = visible[i].tags[layer].filter((tag) => visible[j].tags[layer].includes(tag));
          if (shared.length) lines.push({ a: visible[i].id, b: visible[j].id, dashed: true });
        }
      }
    }
    return { nodes, lines };
  }, [visible, yaw, pitch, size, layer]);

  const chosen = entries.find((entry) => entry.id === selected) || null;

  if (!profileId) {
    return (
      <section className="carry-gate">
        <div className="carry-card">
          <p className="carry-eyebrow">The Words We Carry</p>
          <h1>Meaning Atlas</h1>
          <p className="carry-lede">Start with a word. Open the account around it. Come in as a guest, or keep an ID so this browser can find your words again.</p>
          {gate === "home" ? (
            <div className="carry-stack">
              <button className="carry-primary" type="button" onClick={() => void comeIn({ kind: "guest" })}>Enter as a guest</button>
              <button type="button" onClick={() => setGate("return")}>I already have an ID</button>
              <button type="button" onClick={() => setGate("create")}>Make a record</button>
            </div>
          ) : null}
          {gate === "return" ? (
            <form className="carry-stack" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void comeIn({ kind: "return", id: String(data.get("id")), passphrase: String(data.get("pass")) }); }}>
              <label>Your ID<input name="id" required placeholder="U-0000" /></label>
              <label>Passphrase<input name="pass" type="password" required /></label>
              <button className="carry-primary" type="submit">Come back in</button>
            </form>
          ) : null}
          {gate === "create" ? (
            <form className="carry-stack" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void comeIn({ kind: "create", passphrase: String(data.get("pass")) }); }}>
              <label>Choose a passphrase<input name="pass" type="password" minLength={4} required /></label>
              <button className="carry-primary" type="submit">Make my ID</button>
            </form>
          ) : null}
          {gate === "made" ? (
            <div>
              <p className="carry-lede">Write this down. It is how you return to your words.</p>
              <p className="carry-id">{madeId}</p>
              <button className="carry-primary" type="button" onClick={() => void refresh()}>Enter the atlas</button>
            </div>
          ) : null}
          {note ? <p className="carry-bad">{note}</p> : null}
          <p className="carry-fine">Your ID stays hidden on the web unless you choose to show it. A guest and a saved record are both kept by the server in this project.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="carry">
      <header className="carry-top">
        <div>
          <p className="carry-eyebrow">The Words We Carry</p>
          <strong>Meaning Atlas</strong>
        </div>
        <nav>
          {(["web", "shelves", "add", "people"] as const).map((item) => (
            <button key={item} type="button" className={view === item ? "on" : ""} onClick={() => setView(item)}>
              {item === "web" ? "Word web" : item === "shelves" ? "Shelves" : item === "add" ? "Add a word" : "Profiles"}
            </button>
          ))}
        </nav>
        <div className="carry-who">
          <span>{reveal ? profileId : "ID hidden"}</span>
          <button type="button" onClick={() => void fetch("/api/atlas/leave", { method: "POST" }).then(() => setProfileId(null))}>Leave</button>
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
                <option value="none">Branches only</option>
              </select>
            </label>
          </div>
          <p className="carry-fine">Drag the web, or use the controls underneath. Solid lines are a word and its accounts. A dashed line is a shared label, not a translation.</p>
          <div
            ref={stageRef}
            className="carry-stage"
            onPointerDown={(event) => { drag.current = { x: event.clientX, y: event.clientY, yaw, pitch }; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); }}
            onPointerMove={(event) => {
              if (!drag.current) return;
              setYaw(drag.current.yaw + (event.clientX - drag.current.x) * 0.35);
              setPitch(Math.max(-40, Math.min(40, drag.current.pitch + (event.clientY - drag.current.y) * 0.12)));
            }}
            onPointerUp={() => { drag.current = null; }}
          >
            <svg aria-hidden="true">
              {scene.lines.map((line, index) => {
                const a = scene.nodes.find((node) => node.id === line.a);
                const b = scene.nodes.find((node) => node.id === line.b);
                if (!a || !b) return null;
                return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={line.dashed ? "#d7c6e6" : "#7a5a9a"} strokeDasharray={line.dashed ? "5 6" : undefined} />;
              })}
            </svg>
            {scene.nodes.map((node) => (
              <button key={node.id} type="button" className={`carry-node ${node.kind}${node.open === selected ? " on" : ""}`} style={{ left: node.x, top: node.y }} onClick={() => setSelected(node.open)}>
                {node.label}
              </button>
            ))}
          </div>
          <div className="carry-controls">
            <label>Rotate<input type="range" min={-180} max={180} value={yaw} onChange={(event) => setYaw(Number(event.target.value))} /></label>
            <label>Tilt<input type="range" min={-40} max={40} value={pitch} onChange={(event) => setPitch(Number(event.target.value))} /></label>
            <button type="button" onClick={() => { setYaw(18); setPitch(12); }}>Reset view</button>
          </div>
          <article className="carry-story">
            {chosen ? <Story entry={chosen} /> : <p>Choose a word, then the account beneath it.</p>}
          </article>
          <section className="carry-concept">
            <h2>What this is trying to do</h2>
            <p>The Words We Carry is an installation where a visitor starts with a word and opens the account around it: what it means to that person, when they use it, and a voice or image only if they gave one. Two people can use the same spelling without becoming one definition. Massa is filed only under Wolof. The proverb is filed only under Montenegrin, even though the writer also named Serbian and Bosnian. Lekker and shame are Afrikaans examples of the same kind of encounter. They are not survey findings.</p>
            <p>The three other accounts are writings that were cleared to be shown. No name is on the web. An ID appears only when that person chooses to show it. A solid branch belongs to one account. A dashed line means both people chose the same label. The distance on the screen is only so you can move around the collection. It is not a score of how close two cultures are.</p>
            <p>This form came from wanting a visitor to follow an expression into someone else’s explanation, and to leave room for their own. The categories are optional and can be extended. They are not detected from a voice. That limit follows the interactional account of emotion in Boehner, DePaula, Dourish and Sengers, “How emotion is made and measured” (2007). The refusal to treat the picture as proof follows Johanna Drucker, “Humanities approaches to graphical display” (2011).</p>
          </section>
        </main>
      ) : null}
      {view === "shelves" ? <Shelves entries={visible} onOpen={(id) => { setSelected(id); setView("web"); }} /> : null}
      {view === "people" ? (
        <People profiles={profiles} reveal={reveal} onToggle={async (next) => { await fetch("/api/atlas/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reveal: next }) }); setRevealFlag(next); await refresh(); }} />
      ) : null}
      {view === "add" ? <Add onDone={async (id) => { await refresh(); setSelected(id); setView("web"); }} /> : null}
    </div>
  );
}

function Story({ entry }: { entry: Entry }) {
  return (
    <>
      <p className="carry-eyebrow">{entry.source === "example" ? "Illustrative account" : entry.source === "survey" ? "Survey account" : "Added here"}</p>
      <h2>{entry.expression}</h2>
      <p className="carry-fine">{entry.language}{entry.community ? ` · ${entry.community}` : ""}{entry.userId ? ` · ${entry.userId}` : " · ID hidden"}</p>
      {STORY.map(([label, key]) => {
        const text = String(entry[key] || "");
        if (!text) return null;
        return <div className="carry-pair" key={label}><span>{label}</span><p>{text}</p></div>;
      })}
      {entry.image ? <img src={entry.image} alt="" /> : null}
      {entry.audio ? <audio controls src={entry.audio} /> : null}
    </>
  );
}

function Shelves({ entries, onOpen }: { entries: Entry[]; onOpen: (id: string) => void }) {
  const languages = [...new Set(entries.map((entry) => entry.language))].sort((a, b) => a.localeCompare(b, "en"));
  return (
    <main className="carry-main">
      {languages.map((language) => (
        <section key={language}>
          <h2>{language}</h2>
          <div className="carry-books">
            {entries.filter((entry) => entry.language === language).map((entry) => (
              <button key={entry.id} type="button" onClick={() => onOpen(entry.id)}>
                <strong>{entry.expression}</strong>
                <span>{entry.userId || "ID hidden"}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
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

function Add({ onDone }: { onDone: (id: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Record<string, string[]>>({ emotion: [], context: [], intention: [] });
  const [custom, setCustom] = useState({ emotion: "", context: "", intention: "" });
  const [image, setImage] = useState<{ mime: string; data: string } | null>(null);
  const [audio, setAudio] = useState<{ mime: string; data: string } | null>(null);
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
        const response = await fetch("/api/atlas/entries", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expression: data.get("expression"),
            language: data.get("language"),
            community: data.get("community"),
            meaning: data.get("meaning"),
            example: data.get("example"),
            feeling: data.get("feeling"),
            context: data.get("context"),
            intention: data.get("intention"),
            rephrasing: data.get("rephrasing"),
            change: data.get("change"),
            withheld: data.get("withheld"),
            emotion,
            contextTags,
            intentionTags,
            image,
            audio,
          }),
        });
        const body = await response.json();
        if (!response.ok) { setError(body.error || "Could not save that."); return; }
        await onDone(body.id);
      }}>
        <p className="carry-eyebrow">One language for this word</p>
        <h2>Add what it means to you</h2>
        <div className="carry-two">
          <label>Word<input name="expression" required maxLength={120} /></label>
          <label>Language<input name="language" required maxLength={80} placeholder="One language" /></label>
        </div>
        <label>Community, if it matters<input name="community" /></label>
        <label>Meaning<textarea name="meaning" required onChange={(event) => setText(event.target.value)} /></label>
        <details>
          <summary>More, if you want it</summary>
          <label>Example<textarea name="example" /></label>
          <label>Feeling<textarea name="feeling" onChange={(event) => setText((value) => `${value} ${event.target.value}`)} /></label>
          <label>Who you use it with<textarea name="context" /></label>
          <label>What you are trying to do<textarea name="intention" /></label>
          <label>How you would explain it<textarea name="rephrasing" /></label>
          <label>What changes<textarea name="change" /></label>
          <label>When you hold it back<textarea name="withheld" /></label>
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
        <div className="carry-two">
          <label>Image, if you want one<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async (event) => { const file = event.target.files?.[0]; setImage(file ? await readFile(file) : null); }} /></label>
          <label>Audio, if you want one<input type="file" accept="audio/*" onChange={async (event) => { const file = event.target.files?.[0]; setAudio(file ? await readFile(file) : null); }} /></label>
        </div>
        <p className="carry-fine">If you leave these empty, the account simply has no picture and no sound. Nothing blank is shown.</p>
        <button className="carry-primary" type="submit">Place it on the web</button>
        {error ? <p className="carry-bad">{error}</p> : null}
      </form>
    </main>
  );
}
