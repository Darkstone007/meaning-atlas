import { MEDIA_MIME, tags, validate } from "./core.ts";
import { NARRATIVE_FIELDS, type Account, type Consent } from "./types.ts";

const MAX_FILE = 8 * 1024 * 1024;

function consentOf(value: unknown, displayConsent: boolean): Consent {
  const source = value && typeof value === "object" ? (value as Partial<Consent>) : {};
  const consent: Consent = {
    classWritten: source.classWritten === true,
    publicWritten: source.publicWritten === true || (source.publicWritten === undefined && displayConsent),
    classRecording: source.classRecording === true,
    publicRecording: source.publicRecording === true,
    informOnly: source.informOnly === true,
  };
  if (consent.informOnly) {
    consent.classWritten = false;
    consent.publicWritten = false;
    consent.classRecording = false;
    consent.publicRecording = false;
  }
  return consent;
}

export function cleanBackup(raw: unknown): Account[] {
  if (!raw || typeof raw !== "object") throw new Error("Unsupported backup format.");
  const body = raw as { schemaVersion?: number; accounts?: unknown };
  if (body.schemaVersion !== 1 || !Array.isArray(body.accounts) || body.accounts.length > 200) {
    throw new Error("Unsupported backup format.");
  }
  const ids = new Set<string>();
  return body.accounts.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid account in backup.");
    const source = item as Record<string, unknown>;
    if (typeof source.id !== "string" || source.id.length > 120 || ids.has(source.id)) {
      throw new Error("Invalid or repeated account ID.");
    }
    ids.add(source.id);
    const consent = consentOf(source.consent, source.displayConsent === true);
    const record = {
      id: source.id,
      kind: source.kind,
      source: String(source.source || "restored backup").slice(0, 80),
      codingSource: String(source.codingSource || "restored").slice(0, 80),
      typeReviewed: source.typeReviewed === true,
      displayConsent: !consent.informOnly && (consent.publicWritten || consent.classWritten),
      consent,
      createdAt: String(source.createdAt || ""),
      updatedAt: String(source.updatedAt || ""),
      tags: {
        emotion: tags((source.tags as { emotion?: unknown } | undefined)?.emotion),
        context: tags((source.tags as { context?: unknown } | undefined)?.context),
        intention: tags((source.tags as { intention?: unknown } | undefined)?.intention),
      },
      relations: [],
      media: [],
    } as unknown as Account;
    for (const key of NARRATIVE_FIELDS) record[key] = String(source[key] || "");
    if (!Array.isArray(source.media) || source.media.length > 3) throw new Error("Invalid media list.");
    record.media = source.media.map((media) => {
      const file = media as Record<string, unknown>;
      if (typeof file.mime !== "string" || !MEDIA_MIME.test(file.mime) || typeof file.data !== "string") {
        throw new Error("Invalid or oversized embedded media.");
      }
      if (!file.data.startsWith(`data:${file.mime};base64,`) || file.data.length > Math.ceil((MAX_FILE * 4) / 3) + 100) {
        throw new Error("Invalid or oversized embedded media.");
      }
      return {
        id: String(file.id || crypto.randomUUID()),
        name: String(file.name || "Attachment").slice(0, 240),
        mime: file.mime,
        data: file.data,
        caption: String(file.caption || "").slice(0, 6000),
        tags: tags(file.tags),
      };
    });
    const links = Array.isArray(source.relations) ? source.relations : [];
    record.relations = links.slice(0, 1).flatMap((link) => {
      const entry = link as Record<string, unknown>;
      if (typeof entry.target !== "string" || typeof entry.reason !== "string") return [];
      return [{ target: entry.target.slice(0, 120), reason: entry.reason.slice(0, 600), source: "restored participant association" }];
    });
    return validate(record);
  });
}
