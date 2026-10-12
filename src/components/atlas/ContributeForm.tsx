import { useState, type FormEvent } from "react";
import { displayName, MEDIA_MIME, tags, VOCAB, validate } from "@/lib/atlas/core";
import type { Account, Consent, Kind, MediaItem } from "@/lib/atlas/types";

const MAX_FILE = 8 * 1024 * 1024;

type DraftForm = {
  expression: string;
  languages: string;
  community: string;
  languagePractice: string;
  origin: string;
  kind: Kind;
  meaning: string;
  example: string;
  feeling: string;
  context: string;
  intention: string;
  rephrasing: string;
  change: string;
  identity: string;
  withheld: string;
  listenerPractice: string;
  relatedId: string;
  relatedReason: string;
  consent: Consent;
  checked: Record<"emotion" | "context" | "intention", string[]>;
  custom: Record<"emotion" | "context" | "intention", string>;
};

function blank(edit: Account | null, copy: Account | null): DraftForm {
  const source = edit;
  const carried = copy && !edit ? copy : null;
  return {
    expression: source?.expression || carried?.expression || "",
    languages: source?.languages || carried?.languages || "",
    community: source?.community || carried?.community || "",
    languagePractice: source?.languagePractice || "",
    origin: source?.origin || "",
    kind: source?.kind || "established",
    meaning: source?.meaning || "",
    example: source?.example || "",
    feeling: source?.feeling || "",
    context: source?.context || "",
    intention: source?.intention || "",
    rephrasing: source?.rephrasing || "",
    change: source?.change || "",
    identity: source?.identity || "",
    withheld: source?.withheld || "",
    listenerPractice: source?.listenerPractice || "",
    relatedId: source?.relations[0]?.target || "",
    relatedReason: source?.relations[0]?.reason || "",
    consent: source?.consent || {
      classWritten: false,
      publicWritten: false,
      classRecording: false,
      publicRecording: false,
      informOnly: false,
    },
    checked: {
      emotion: source?.tags.emotion.filter((tag) => VOCAB.emotion.includes(tag)) || [],
      context: source?.tags.context.filter((tag) => VOCAB.context.includes(tag)) || [],
      intention: source?.tags.intention.filter((tag) => VOCAB.intention.includes(tag)) || [],
    },
    custom: {
      emotion: source?.tags.emotion.filter((tag) => !VOCAB.emotion.includes(tag)).join("; ") || "",
      context: source?.tags.context.filter((tag) => !VOCAB.context.includes(tag)).join("; ") || "",
      intention: source?.tags.intention.filter((tag) => !VOCAB.intention.includes(tag)).join("; ") || "",
    },
  };
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function ContributeForm({
  records,
  edit,
  copy,
  userId,
  onCancel,
  onSave,
}: {
  records: Account[];
  edit: Account | null;
  copy: Account | null;
  userId: string;
  onCancel: () => void;
  onSave: (account: Account) => Promise<void>;
}) {
  const [form, setForm] = useState(() => blank(edit, copy));
  const [media, setMedia] = useState<MediaItem[]>(() => (edit ? structuredClone(edit.media) : []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof DraftForm>(key: K, value: DraftForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const toggleConsent = (key: keyof Consent) => {
    setForm((current) => ({ ...current, consent: { ...current.consent, [key]: !current.consent[key] } }));
  };

  const toggleTag = (layer: "emotion" | "context" | "intention", value: string) => {
    setForm((current) => {
      const has = current.checked[layer].includes(value);
      return {
        ...current,
        checked: {
          ...current.checked,
          [layer]: has ? current.checked[layer].filter((item) => item !== value) : [...current.checked[layer], value],
        },
      };
    });
  };

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    setError("");
    try {
      if (list.length + media.length > 3) throw new Error("Attach at most 3 files per account.");
      const incoming: MediaItem[] = [];
      for (const file of list) {
        if (file.size > MAX_FILE) throw new Error(`${file.name} exceeds 8 MB.`);
        if (!MEDIA_MIME.test(file.type)) throw new Error(`Unsupported media type: ${file.name}`);
        incoming.push({
          id: crypto.randomUUID(),
          name: file.name,
          mime: file.type,
          data: await readFile(file),
          caption: "",
          tags: [],
        });
      }
      setMedia((current) => [...current, ...incoming]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const consent = { ...form.consent };
      const now = new Date().toISOString();
      const record: Account = {
        id: edit?.id || crypto.randomUUID(),
        createdAt: edit?.createdAt || now,
        updatedAt: now,
        source: edit?.source || "direct contribution",
        codingSource: edit?.codingSource === "researcher" ? "researcher" : "participant",
        kind: form.kind,
        typeReviewed: true,
        displayConsent: !consent.informOnly && (consent.publicWritten || consent.classWritten),
        consent,
        attribution: "",
        userId: edit?.userId || userId,
        expression: form.expression.trim(),
        languages: form.languages.trim(),
        community: form.community.trim(),
        languagePractice: form.languagePractice.trim(),
        origin: form.origin.trim(),
        meaning: form.meaning.trim(),
        example: form.example.trim(),
        feeling: form.feeling.trim(),
        context: form.context.trim(),
        intention: form.intention.trim(),
        rephrasing: form.rephrasing.trim(),
        change: form.change.trim(),
        identity: form.identity.trim(),
        withheld: form.withheld.trim(),
        listenerPractice: form.listenerPractice.trim(),
        tags: {
          emotion: tags([...form.checked.emotion, ...tags(form.custom.emotion)]),
          context: tags([...form.checked.context, ...tags(form.custom.context)]),
          intention: tags([...form.checked.intention, ...tags(form.custom.intention)]),
        },
        media: media.map((item) => ({ ...item, tags: tags(item.tags) })),
        relations: [],
      };
      if (form.relatedId && !form.relatedReason.trim()) throw new Error("Explain why you connected these accounts.");
      if (form.relatedId) {
        record.relations.push({
          target: form.relatedId,
          reason: form.relatedReason.trim(),
          source: "participant or local reviewer",
        });
      }
      validate(record);
      await onSave(record);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form-panel" onSubmit={submit}>
      <span className="eyebrow">Add your voice</span>
      <h2>{edit ? "Review this local account" : copy ? `Add your own meaning for ${copy.expression}` : "What does this expression mean to you?"}</h2>
      <p className="intro">
        These are the survey questions. There is no single correct account. Required fields are marked. Email and phone are not collected here — a shared browser cannot keep contact details private.
      </p>
      {error ? <p className="danger">{error}</p> : null}

      <fieldset>
        <legend>01 / The expression</legend>
        <label>
          What languages or ways of speaking do you use, and who do you usually use them with? *
          <textarea required value={form.languagePractice} maxLength={6000} onChange={(event) => set("languagePractice", event.target.value)} />
        </label>
        <div className="two">
          <label>
            What is one word or expression you use that you find yourself having to explain? *
            <input required maxLength={120} value={form.expression} onChange={(event) => set("expression", event.target.value)} />
          </label>
          <label>
            Language label for the shelf *
            <input
              required
              maxLength={240}
              placeholder="Wolof, or Montenegrin; Serbian; Bosnian"
              value={form.languages}
              onChange={(event) => set("languages", event.target.value)}
            />
          </label>
        </div>
        <p className="quiet">Separate multiple language labels with semicolons. This is spelling for the shelf, not a nationality.</p>
        <div className="two">
          <label>
            Community, dialect, place or variety, if you want it to group the word
            <input maxLength={240} value={form.community} onChange={(event) => set("community", event.target.value)} />
          </label>
          <label>
            This account is…
            <select value={form.kind} onChange={(event) => set("kind", event.target.value as Kind)}>
              <option value="established">My use of an existing expression</option>
              <option value="personal">A meaning or expression I have created</option>
              <option value="listener">My interpretation as a listener</option>
            </select>
          </label>
        </div>
        <label>
          Where does this expression come from for you?
          <textarea maxLength={6000} value={form.origin} onChange={(event) => set("origin", event.target.value)} />
        </label>
      </fieldset>

      <fieldset>
        <legend>02 / What surrounds the word</legend>
        <label>
          How would you use it in a sentence or conversation? Give an example and who you would be speaking to.
          <textarea maxLength={6000} value={form.example} onChange={(event) => set("example", event.target.value)} />
        </label>
        <label>
          In that example, what does it mean to you, and what feeling are you trying to express? *
          <textarea required maxLength={6000} value={form.meaning} onChange={(event) => set("meaning", event.target.value)} />
        </label>
        <label>
          How would you explain or replace it for someone who doesn’t understand it? What, if anything, changes when you do?
          <textarea maxLength={6000} value={form.rephrasing} onChange={(event) => set("rephrasing", event.target.value)} />
        </label>
        <label>
          Does who you are around change whether you use this expression? Why or why not?
          <textarea maxLength={6000} value={form.withheld} onChange={(event) => set("withheld", event.target.value)} />
        </label>
        <label>
          If it does, does changing how you speak affect how comfortable you feel being yourself?
          <textarea maxLength={6000} value={form.identity} onChange={(event) => set("identity", event.target.value)} />
        </label>
        <label>
          When someone uses an expression you don’t know, what do you usually do? What would make you interested in learning more?
          <textarea maxLength={6000} value={form.listenerPractice} onChange={(event) => set("listenerPractice", event.target.value)} />
        </label>
        <details>
          <summary>Separate a feeling, context, intention or change onto its own branch</summary>
          <div className="two">
            <label>
              Feeling, if you want it separate from the meaning
              <textarea maxLength={6000} value={form.feeling} onChange={(event) => set("feeling", event.target.value)} />
            </label>
            <label>
              What changes, if you want it separate from the rephrasing
              <textarea maxLength={6000} value={form.change} onChange={(event) => set("change", event.target.value)} />
            </label>
          </div>
          <div className="two">
            <label>
              Context of use, if you want it separate from the example
              <textarea maxLength={6000} value={form.context} onChange={(event) => set("context", event.target.value)} />
            </label>
            <label>
              What are you trying to communicate or do?
              <textarea maxLength={6000} value={form.intention} onChange={(event) => set("intention", event.target.value)} />
            </label>
          </div>
        </details>
      </fieldset>

      <fieldset>
        <legend>03 / Choose your connections</legend>
        <p className="quiet">Optional labels connect accounts that use the same label in the same layer. Your explanation stays intact. Add your own labels separated by semicolons.</p>
        {(["emotion", "context", "intention"] as const).map((layer) => (
          <label key={layer}>
            {layer[0].toUpperCase() + layer.slice(1)}
            <div className="tag-options">
              {VOCAB[layer].map((value) => (
                <label key={value}>
                  <input type="checkbox" checked={form.checked[layer].includes(value)} onChange={() => toggleTag(layer, value)} />
                  {value}
                </label>
              ))}
            </div>
            <input
              placeholder={`Your own ${layer} labels; separated by semicolons`}
              maxLength={500}
              value={form.custom[layer]}
              onChange={(event) => setForm((current) => ({ ...current, custom: { ...current.custom, [layer]: event.target.value } }))}
            />
          </label>
        ))}
        <div className="two">
          <label>
            An expression this reminds you of
            <select value={form.relatedId} onChange={(event) => set("relatedId", event.target.value)}>
              <option value="">No association</option>
              {records
                .filter((record) => record.id !== edit?.id)
                .map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.expression} / {displayName(record, records.indexOf(record))}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Why are they connected in your view?
            <input maxLength={600} value={form.relatedReason} onChange={(event) => set("relatedReason", event.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>04 / Let us hear or see it</legend>
        <label>
          Would you like to share a recording, image or short video? Optional.
          <input
            type="file"
            multiple
            accept="audio/*,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            onChange={(event) => {
              void onFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <p className="quiet">Up to 3 files, 8 MB each. Files stay in this browser. Add a caption or transcript. The archive does not analyse voices or images.</p>
        {media.map((item) => (
          <div key={item.id} className="media-item">
            <strong>{item.name}</strong>
            {item.mime.startsWith("image/") ? (
              <img src={item.data} alt={item.caption || item.name} />
            ) : item.mime.startsWith("audio/") ? (
              <audio controls preload="metadata" src={item.data} />
            ) : (
              <video controls preload="metadata" src={item.data} />
            )}
            <label>
              Caption, transcript or description *
              <textarea
                required
                maxLength={6000}
                value={item.caption}
                onChange={(event) =>
                  setMedia((current) => current.map((entry) => (entry.id === item.id ? { ...entry, caption: event.target.value } : entry)))
                }
              />
            </label>
            <label>
              Subjects or associations shown or heard
              <input
                maxLength={500}
                value={item.tags.join("; ")}
                onChange={(event) =>
                  setMedia((current) => current.map((entry) => (entry.id === item.id ? { ...entry, tags: tags(event.target.value) } : entry)))
                }
              />
            </label>
            <button type="button" className="small-button" onClick={() => setMedia((current) => current.filter((entry) => entry.id !== item.id))}>
              Remove attachment
            </button>
          </div>
        ))}
      </fieldset>

      <fieldset className="waiver">
        <legend>05 / How may this be used?</legend>
        <p className="quiet">Select any that apply. A voice or image may still identify someone. This step is the display permission, not a replacement for a study consent form.</p>
        {(
          [
            ["classWritten", "My written responses can be included in class presentations."],
            ["publicWritten", "My written responses can be included in the public visualization or artwork."],
            ["classRecording", "My recording can be played in class presentations."],
            ["publicRecording", "My recording can be included in the public visualization or artwork."],
            ["informOnly", "Please use my responses only to inform the project, without displaying or playing them."],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="check">
            <input type="checkbox" checked={form.consent[key]} onChange={() => toggleConsent(key)} />
            <span>{label}</span>
          </label>
        ))}
        <p className="quiet">The tree shows your user ID, {userId}. Names are not placed on it.</p>
        <div className="row">
          <button className="primary" type="submit" disabled={busy}>
            {edit ? "Save changes" : "Add to the web"}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}
