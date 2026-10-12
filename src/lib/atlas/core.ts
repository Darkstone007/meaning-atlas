import {
  KINDS,
  LAYERS,
  NARRATIVE_FIELDS,
  type Account,
  type Consent,
  type Edge,
  type Kind,
  type Layer,
  type NarrativeField,
  type WordGroup,
} from "./types.ts";

export const VOCAB: Record<Exclude<Layer, "media">, readonly string[]> = {
  emotion: ["care", "affection", "joy", "longing", "pride", "frustration", "mixed"],
  context: ["friends", "family", "home", "work", "celebration", "greeting"],
  intention: ["comfort", "approval", "belonging", "humour", "address", "disagreement"],
};

export const FIELD_LABELS: Record<NarrativeField, string> = {
  expression: "Expression",
  languages: "Language label(s)",
  community: "Community or place",
  languagePractice: "Languages you use",
  origin: "Where it comes from",
  meaning: "Meaning and feeling",
  example: "Example",
  feeling: "Feeling",
  context: "Context",
  intention: "Intention",
  rephrasing: "Rephrasing",
  change: "What changes",
  identity: "Being yourself",
  withheld: "Who you are around",
  listenerPractice: "Unfamiliar expressions",
  attribution: "Display name",
};

const MEDIA_MIME =
  /^(image\/(jpeg|png|webp|gif)|audio\/(mpeg|mp3|mp4|wav|x-wav|ogg|webm|aac|flac|x-m4a)|video\/(mp4|webm))$/;

export function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

export function languageLabels(value: string): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const part of String(value || "").split(";")) {
    const label = part.trim().replace(/\s+/g, " ");
    const key = normalize(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

export function tags(value: unknown): string[] {
  const list = Array.isArray(value) ? value : String(value || "").split(";");
  return [...new Set(list.map((item) => normalize(item)).filter(Boolean))].slice(0, 20);
}

export function wordKey(record: Pick<Account, "expression" | "languages" | "community">): string {
  return JSON.stringify([normalize(record.expression), tags(record.languages).sort(), normalize(record.community)]);
}

export function layerTags(record: Account, layer: string): string[] {
  if (layer === "media") return tags(record.media.flatMap((item) => item.tags));
  if (layer === "emotion" || layer === "context" || layer === "intention") return tags(record.tags[layer]);
  return [];
}

export function connections(records: Account[], layer: string): Edge[] {
  if (!LAYERS.includes(layer as Layer)) return [];
  const edges: Edge[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const shared = layerTags(records[i], layer).filter((tag) => layerTags(records[j], layer).includes(tag));
      if (shared.length) {
        edges.push({
          source: records[i].id,
          target: records[j].id,
          layer,
          shared,
          basis: "exact shared labels",
        });
      }
    }
  }
  return edges;
}

export function personalEdges(records: Account[]): Edge[] {
  return records.flatMap((record) =>
    record.relations
      .filter((link) => records.some((other) => other.id === link.target))
      .map((link) => ({
        source: record.id,
        target: link.target,
        layer: "personal",
        shared: [link.reason],
        basis: "participant association",
      })),
  );
}

export function search(records: Account[], query: string): Account[] {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (!terms.length) return records;
  return records.filter((record) => {
    const values = [
      ...NARRATIVE_FIELDS.map((key) => record[key]),
      record.kind,
      record.attribution,
      ...LAYERS.map((layer) => layerTags(record, layer).join(" ")),
      ...record.media.map((item) => item.caption),
    ];
    const haystack = normalize(values.join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

export function grouped(list: Account[]): WordGroup[] {
  const groups = new Map<string, WordGroup>();
  for (const record of list) {
    const key = wordKey(record);
    const existing = groups.get(key);
    if (existing) existing.accounts.push(record);
    else {
      groups.set(key, {
        key,
        expression: record.expression,
        languages: record.languages,
        community: record.community,
        accounts: [record],
      });
    }
  }
  return [...groups.values()];
}

export function isDisplayed(record: Account): boolean {
  if (record.consent.informOnly) return false;
  return record.displayConsent && (record.consent.publicWritten || record.consent.classWritten);
}

export function emptyConsent(): Consent {
  return {
    classWritten: false,
    publicWritten: false,
    classRecording: false,
    publicRecording: false,
    informOnly: false,
  };
}

export function consentFromCell(cell: string): Consent {
  const clauses = cell
    .split(/\.\s*,\s*|\n+/)
    .map((part) => normalize(part))
    .filter(Boolean);
  const informOnly = clauses.some((text) => text.includes("without displaying") || text.includes("inform the project"));
  const has = (needles: string[]) => clauses.some((text) => needles.every((needle) => text.includes(needle)));
  if (informOnly) {
    return { classWritten: false, publicWritten: false, classRecording: false, publicRecording: false, informOnly: true };
  }
  return {
    classWritten: has(["written", "class presentation"]),
    publicWritten: has(["written", "public visualization"]),
    classRecording: has(["recording", "class presentation"]),
    publicRecording: has(["recording", "public visualization"]),
    informOnly: false,
  };
}

export function displayName(record: Account, index: number): string {
  const name = record.attribution.trim();
  return name || `Account ${index + 1}`;
}

export function kindLabel(kind: Kind): string {
  if (kind === "personal") return "Personally created meaning";
  if (kind === "listener") return "Listener interpretation";
  return "Personal use of an existing expression";
}

export function validate(record: Account): Account {
  for (const key of ["expression", "languages", "meaning"] as const) {
    if (typeof record[key] !== "string" || !record[key].trim()) {
      throw new Error("Expression, language and meaning are required.");
    }
  }
  for (const key of NARRATIVE_FIELDS) {
    if (record[key] && String(record[key]).length > 6000) throw new Error("An answer exceeds 6,000 characters.");
  }
  if (record.expression.length > 120 || record.languages.length > 240) {
    throw new Error("Expression or language label is too long.");
  }
  if (!KINDS.includes(record.kind)) throw new Error("Choose the type of account.");
  if (record.consent.informOnly) {
    if (record.consent.publicWritten || record.consent.classWritten || record.consent.publicRecording || record.consent.classRecording) {
      throw new Error("“Inform the project only” cannot be combined with display or playback permission.");
    }
    if (record.displayConsent) throw new Error("An account withheld from display cannot be marked for display.");
  } else if (!record.consent.publicWritten && !record.consent.classWritten) {
    throw new Error("Choose how the writing may be used, or hold it from display.");
  } else if (record.displayConsent !== true) {
    throw new Error("Display permission is required.");
  }
  if (record.media.length > 3) throw new Error("Attach at most 3 files per account.");
  for (const item of record.media) {
    if (!item.caption.trim()) throw new Error("Every attachment needs a caption or transcript.");
    if (!MEDIA_MIME.test(item.mime)) throw new Error("Unsupported media type.");
    if (!item.data.startsWith(`data:${item.mime};base64,`)) throw new Error("Media must stay attached to its account.");
  }
  const recording = record.media.some((item) => item.mime.startsWith("audio/") || item.mime.startsWith("video/"));
  if (recording && !record.consent.classRecording && !record.consent.publicRecording) {
    throw new Error("A voice or video needs permission to be played, or remove the file.");
  }
  return record;
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = String(text).replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell !== "") throw new Error("Unexpected quote in CSV.");
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("Unclosed quote in CSV.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) throw new Error("CSV needs a header and at least one response.");
  if (rows.slice(1).some((record) => record.length !== rows[0].length)) {
    throw new Error("CSV rows have inconsistent column counts.");
  }
  return rows;
}

export type ColumnMap = Partial<Record<NarrativeField | "consent", number>>;

const CONTACT = /email|e-mail|phone|whatsapp|contact|timestamp/i;

export function isContactHeader(header: string): boolean {
  return CONTACT.test(header);
}

export type Draft = Omit<Account, "id" | "createdAt" | "updatedAt">;

export function csvRecords(
  rows: string[][],
  map: ColumnMap,
  limit: number,
  defaults?: { languages?: string; community?: string },
): { ready: Draft[]; skipped: string[] } {
  const ready: Draft[] = [];
  const skipped: string[] = [];
  const body = rows.slice(1, 1 + limit);
  body.forEach((row, index) => {
    const read = (key: NarrativeField) => {
      const column = map[key];
      if (column === undefined || column < 0) return "";
      return String(row[column] ?? "").trim();
    };
    const consentColumn = map.consent;
    const consent =
      consentColumn === undefined || consentColumn < 0 ? null : consentFromCell(String(row[consentColumn] ?? ""));
    if (consent?.informOnly) {
      skipped.push(`Row ${index + 1} is held: the contributor asked not to display it.`);
      return;
    }
    if (consent && !consent.publicWritten && !consent.classWritten) {
      skipped.push(`Row ${index + 1} has no permission to display the writing.`);
      return;
    }
    const draft: Draft = {
      source: "survey CSV",
      codingSource: "not yet assigned",
      kind: "established",
      typeReviewed: false,
      displayConsent: true,
      consent: consent ?? {
        classWritten: true,
        publicWritten: true,
        classRecording: false,
        publicRecording: false,
        informOnly: false,
      },
      attribution: read("attribution"),
      expression: read("expression"),
      languages: read("languages") || defaults?.languages?.trim() || "",
      community: read("community") || defaults?.community?.trim() || "",
      languagePractice: read("languagePractice"),
      origin: read("origin"),
      meaning: read("meaning"),
      example: read("example"),
      feeling: read("feeling"),
      context: read("context"),
      intention: read("intention"),
      rephrasing: read("rephrasing"),
      change: read("change"),
      identity: read("identity"),
      withheld: read("withheld"),
      listenerPractice: read("listenerPractice"),
      tags: { emotion: [], context: [], intention: [] },
      media: [],
      relations: [],
    };
    validate({ ...draft, id: "draft", createdAt: "", updatedAt: "" });
    ready.push(draft);
  });
  return { ready, skipped };
}

export { MEDIA_MIME };
