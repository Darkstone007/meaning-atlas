import { createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";

const COOKIE = "atlas";

export type PublicEntry = {
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
  tags: { emotion: string[]; context: string[]; intention: string[] };
  alsoUsed: string;
  image: string | null;
  audio: string | null;
  video: string | null;
  source: string;
  userId: string | null;
  mine: boolean;
};

const SEED = [
  {
    id: "acct-4f2a",
    profile: "U-4F2A",
    expression: "Massa",
    language: "Wolof",
    community: "Wolof",
    meaning:
      "I did not realize I used it so often until I came here and had to explain the whole meaning to my friends. I love this word because it can communicate so much in such a simple manner.",
    example:
      'Someone is aching or hurt. "I stub my toe." "Ow, massa." "I failed my exam." "Aw, massa, it\'s going to be okay." It is not for the heaviest losses.',
    feeling: "Care, said lightly.",
    context: "With some friends and family. Not as a second language of the word itself.",
    intention: "Comfort.",
    rephrasing: "The closest word I have found in use is the Arabic مِسْكِين. Before that I explained it, then kept saying it.",
    change: "A few sentences have to stand in for one word.",
    withheld: "I wouldn't use it with people who are not close friends, whether they understand it or not. Massa is informal in Wolof and wouldn't be said to a professor.",
    languagePractice: "French and Wolof with some friends and family. English with friends.",
    origin: "It comes from Wolof.",
    identity: "",
    listenerPractice: "I ask what it means, even for small things, rather than stay confused. That is also why I explain Massa instead of changing my vocabulary.",
    emotion: "care",
    contextTags: "friends;family",
    intentionTags: "comfort",
    source: "survey",
  },
  {
    id: "acct-91c7",
    profile: "U-91C7",
    expression: "Massa",
    language: "Wolof",
    community: "Senegal",
    meaning:
      "When I say Massa, I am telling someone that I see their pain and that they do not have to feel alone in it. It still works when there is nothing else to say.",
    example: "A child who falls. A friend who has lost someone. The situations differ. The word still fits.",
    feeling: "Care, and solidarity.",
    context: "With family, and with friends who have learned what it means.",
    intention: "Comfort.",
    rephrasing: 'I usually say it is something like "I\'m sorry". That sounds more polite, and less close.',
    change: "I can explain the meaning. I am not sure I can translate how it feels.",
    withheld: "When I am around Senegalese people I use it without thinking. I also use it with friends who are not Senegalese, and some of them use it with me.",
    languagePractice: "Wolof with family and other Senegalese people. French with friends and classmates. English with classmates, professors, and anyone who does not speak Wolof or French.",
    origin: "I grew up hearing and using it in Senegal. It is how we express empathy, care, and solidarity.",
    identity: "",
    listenerPractice: "I ask what it means when a simple translation does not seem enough.",
    emotion: "care",
    contextTags: "friends;family",
    intentionTags: "comfort",
    source: "survey",
  },
  {
    id: "acct-3b80",
    profile: "U-3B80",
    expression: "Čist račun - duga ljubav",
    language: "Montenegrin",
    community: "The Balkans",
    alsoUsed: "Serbian; Bosnian",
    meaning:
      "It says somebody is rightful and respects the deal. If the dealing stays clean, the love can last, because there is no bad blood. The same saying is also used in Serbian and Bosnian. The entry is filed under one language, Montenegrin, so it is not split into three shelves.",
    example: "Somebody is giving a debt back, even to a close friend.",
    feeling: "Affection for a sentence that feels like home.",
    context: "Friends, including when money is between them.",
    intention: "Approval of a clean dealing.",
    rephrasing: "The literal translation is clear debt, long love.",
    change: "The sentence is not replaced. It is only pointed at.",
    withheld: "",
    languagePractice: "Montenegrin, Serbian, Bosnian, English, French, Arabic.",
    origin: "The Balkans.",
    identity: "It is part of my identity when it is accurate. There is no other sentence like it, and it feels like home.",
    listenerPractice: "I ask about it and try to carry the saying into my own language, or learn an English translation.",
    emotion: "affection",
    contextTags: "friends",
    intentionTags: "approval",
    source: "survey",
  },
  {
    id: "ex-lekker",
    profile: "U-LEKR",
    expression: "lekker",
    language: "Afrikaans",
    community: "",
    meaning:
      "An illustrative account, not a survey response. Lekker says something is pleasant, tasty, or good. Food can be lekker. A day can be lekker. It is approval you can almost taste.",
    example: 'After a meal: "That was lekker."',
    feeling: "Pleasure, said easily.",
    context: "Friends, often around food or a good moment.",
    intention: "Approval.",
    rephrasing: "Nice, tasty, or great, depending on what it is attached to.",
    change: "The English words split one feeling into several.",
    withheld: "",
    emotion: "joy",
    contextTags: "friends",
    intentionTags: "approval",
    source: "example",
  },
  {
    id: "ex-shame",
    profile: "U-SHME",
    expression: "shame",
    language: "Afrikaans",
    community: "",
    meaning:
      "An illustrative account, not a survey response. In this Afrikaans and South African use, shame is not disgrace. It is a small sound of sympathy or tenderness, for a person who is hurt, tired, or simply dear.",
    example: 'A child shows a scraped knee. "Shame."',
    feeling: "Care, without a speech.",
    context: "Friends and family.",
    intention: "Comfort.",
    rephrasing: "Something like \"oh, you poor thing\", or \"that's sweet\", depending on the moment.",
    change: "English makes it sound like guilt. That is not this use.",
    withheld: "",
    emotion: "care",
    contextTags: "friends;family",
    intentionTags: "comfort",
    source: "example",
  },
];

function hashPass(id: string, passphrase: string) {
  return createHash("sha256").update(`${id}:${passphrase}`).digest("hex");
}

function mintId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(4);
  return "U-" + [...bytes].map((value) => alphabet[value % alphabet.length]).join("");
}

function splitTags(value: string) {
  return [...new Set(value.split(";").map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

function cookie(request: Request) {
  const raw = request.headers.get("cookie") || "";
  const part = raw.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE}=`));
  return part ? decodeURIComponent(part.slice(COOKIE.length + 1)) : "";
}

function setCookie(token: string) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;
}

export async function ensureSeed() {
  const sql = await getSql();
  const existing = await sql<{ n: number }>`select count(*)::int as n from atlas_entry`;
  if (Number(existing[0]?.n || 0) > 0) return;
  for (const item of SEED) {
    await sql`insert into atlas_profile (id, guest, reveal) values (${item.profile}, false, false) on conflict (id) do nothing`;
    await sql`
      insert into atlas_entry (
        id, profile_id, expression, language, community, meaning, example, feeling, context, intention,
        rephrasing, change_note, withheld, language_practice, origin, identity, listener_practice, emotion, context_tags, intention_tags, also_used, source
      ) values (
        ${item.id}, ${item.profile}, ${item.expression}, ${item.language}, ${item.community}, ${item.meaning},
        ${item.example}, ${item.feeling}, ${item.context}, ${item.intention}, ${item.rephrasing}, ${item.change},
        ${item.withheld}, ${item.languagePractice || ""}, ${item.origin || ""}, ${item.identity || ""}, ${item.listenerPractice || ""}, ${item.emotion}, ${item.contextTags}, ${item.intentionTags}, ${"alsoUsed" in item ? item.alsoUsed : ""}, ${item.source}
      ) on conflict (id) do nothing
    `;
  }
}

export async function currentProfile(request: Request) {
  const token = cookie(request);
  if (!token) return null;
  const sql = await getSql();
  const rows = await sql<{ id: string; guest: boolean; reveal: boolean }>`
    select p.id, p.guest, p.reveal
    from atlas_session s
    join atlas_profile p on p.id = s.profile_id
    where s.token = ${token}
  `;
  return rows[0] || null;
}

export async function enter(body: { kind?: string; id?: string; passphrase?: string }) {
  const sql = await getSql();
  const kind = body.kind;
  let profileId = "";
  if (kind === "guest") {
    profileId = mintId();
    await sql`insert into atlas_profile (id, guest, reveal) values (${profileId}, true, false)`;
  } else if (kind === "create") {
    const passphrase = String(body.passphrase || "");
    if (passphrase.length < 4) throw new Error("Use at least 4 characters.");
    profileId = mintId();
    await sql`insert into atlas_profile (id, pass_hash, guest, reveal) values (${profileId}, ${hashPass(profileId, passphrase)}, false, false)`;
  } else if (kind === "return") {
    profileId = String(body.id || "").trim().toUpperCase();
    const rows = await sql<{ pass_hash: string | null; guest: boolean }>`select pass_hash, guest from atlas_profile where id = ${profileId}`;
    const person = rows[0];
    if (!person || person.guest || !person.pass_hash) throw new Error("That ID is not a saved record.");
    if (hashPass(profileId, String(body.passphrase || "")) !== person.pass_hash) throw new Error("That passphrase does not match.");
  } else {
    throw new Error("Choose guest, a new record, or a return.");
  }
  const token = randomBytes(24).toString("hex");
  await sql`insert into atlas_session (token, profile_id) values (${token}, ${profileId})`;
  return { token, id: profileId };
}

export function sessionCookie(token: string) {
  return setCookie(token);
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

type Row = {
  id: string;
  profile_id: string;
  expression: string;
  language: string;
  community: string;
  meaning: string;
  example: string;
  feeling: string;
  context: string;
  intention: string;
  rephrasing: string;
  change_note: string;
  withheld: string;
  language_practice: string;
  origin: string;
  identity: string;
  listener_practice: string;
  emotion: string;
  context_tags: string;
  intention_tags: string;
  image_data: string | null;
  image_mime: string | null;
  audio_data: string | null;
  audio_mime: string | null;
  video_data: string | null;
  video_mime: string | null;
  also_used: string;
  source: string;
  reveal: boolean;
};

function present(row: Row, viewer: string | null): PublicEntry {
  const show = row.reveal || viewer === row.profile_id;
  return {
    id: row.id,
    expression: row.expression,
    language: row.language,
    community: row.community,
    meaning: row.meaning,
    example: row.example,
    feeling: row.feeling,
    context: row.context,
    intention: row.intention,
    rephrasing: row.rephrasing,
    change: row.change_note,
    withheld: row.withheld,
    languagePractice: row.language_practice || "",
    origin: row.origin || "",
    identity: row.identity || "",
    listenerPractice: row.listener_practice || "",
    tags: {
      emotion: splitTags(row.emotion),
      context: splitTags(row.context_tags),
      intention: splitTags(row.intention_tags),
    },
    image: row.image_data && row.image_mime ? `data:${row.image_mime};base64,${row.image_data}` : null,
    audio: row.audio_data && row.audio_mime ? `data:${row.audio_mime};base64,${row.audio_data}` : null,
    video: row.video_data && row.video_mime ? `data:${row.video_mime};base64,${row.video_data}` : null,
    alsoUsed: row.also_used || "",
    source: row.source,
    userId: show ? row.profile_id : null,
    mine: viewer === row.profile_id,
  };
}

export async function listEntries(viewer: string | null): Promise<PublicEntry[]> {
  await ensureSeed();
  const sql = await getSql();
  const rows = await sql<Row>`
    select e.*, p.reveal
    from atlas_entry e
    join atlas_profile p on p.id = e.profile_id
    order by e.created_at asc
  `;
  return rows.map((row) => present(row, viewer));
}

export async function listProfiles(viewer: string | null) {
  const sql = await getSql();
  const rows = await sql<{ id: string; reveal: boolean; guest: boolean; words: number }>`
    select p.id, p.reveal, p.guest, count(e.id)::int as words
    from atlas_profile p
    left join atlas_entry e on e.profile_id = p.id
    group by p.id
    order by p.created_at asc
  `;
  return rows
    .filter((row) => row.reveal || row.id === viewer)
    .map((row) => ({
      id: row.reveal || row.id === viewer ? row.id : null,
      words: Number(row.words),
      guest: row.guest,
      reveal: row.reveal,
      mine: row.id === viewer,
    }));
}

export async function setReveal(profileId: string, reveal: boolean) {
  const sql = await getSql();
  await sql`update atlas_profile set reveal = ${reveal} where id = ${profileId}`;
}

const allowedImage = /^image\/(jpeg|png|webp|gif)$/;
const allowedAudio = /^audio\/(mpeg|mp3|mp4|wav|x-wav|ogg|webm|aac|flac)$/;
const allowedVideo = /^video\/(mp4|webm)$/;

function takeFile(value: unknown, pattern: RegExp, label: string) {
  if (!value || typeof value !== "object") return { data: null as string | null, mime: null as string | null };
  const file = value as { mime?: string; data?: string };
  if (!file.data) return { data: null, mime: null };
  if (!file.mime || !pattern.test(file.mime)) throw new Error(`That ${label} type is not supported.`);
  const body = String(file.data).replace(/^data:[^,]*,/, "");
  if (body.length > 2_200_000) throw new Error(`That ${label} is too large.`);
  return { data: body, mime: file.mime };
}

export async function addEntry(profileId: string, body: Record<string, unknown>) {
  const expression = String(body.expression || "").trim();
  const language = String(body.language || "").split(";")[0].trim();
  const meaning = String(body.meaning || "").trim();
  if (!expression || !language || !meaning) throw new Error("A word, one language, and a meaning are required.");
  if (expression.length > 120 || language.length > 80) throw new Error("The word or the language label is too long.");
  const image = takeFile(body.image, allowedImage, "image");
  const audio = takeFile(body.audio, allowedAudio, "audio");
  const video = takeFile(body.video, allowedVideo, "video");
  const id = crypto.randomUUID();
  const sql = await getSql();
  await sql`
    insert into atlas_entry (
      id, profile_id, expression, language, community, meaning, example, feeling, context, intention,
      rephrasing, change_note, withheld, language_practice, origin, identity, listener_practice, emotion, context_tags, intention_tags, also_used, image_data, image_mime, audio_data, audio_mime, video_data, video_mime, source
    ) values (
      ${id}, ${profileId}, ${expression}, ${language}, ${String(body.community || "").trim()}, ${meaning},
      ${String(body.example || "").trim()}, ${String(body.feeling || "").trim()}, ${String(body.context || "").trim()},
      ${String(body.intention || "").trim()}, ${String(body.rephrasing || "").trim()}, ${String(body.change || "").trim()},
      ${String(body.withheld || "").trim()}, ${String(body.languagePractice || "").trim()}, ${String(body.origin || "").trim()},
      ${String(body.identity || "").trim()}, ${String(body.listenerPractice || "").trim()}, ${splitTags(String(body.emotion || "")).join(";")},
      ${splitTags(String(body.contextTags || "")).join(";")}, ${splitTags(String(body.intentionTags || "")).join(";")},
      ${String(body.alsoUsed || "").trim()}, ${image.data}, ${image.mime}, ${audio.data}, ${audio.mime}, ${video.data}, ${video.mime}, 'visitor'
    )
  `;
  return id;
}

export async function updateEntry(profileId: string, body: Record<string, unknown>) {
  const id = String(body.id || "");
  const expression = String(body.expression || "").trim();
  const language = String(body.language || "").split(";")[0].trim();
  const meaning = String(body.meaning || "").trim();
  if (!expression || !language || !meaning) throw new Error("A word, one language, and a meaning are required.");
  const image = takeFile(body.image, allowedImage, "image");
  const audio = takeFile(body.audio, allowedAudio, "audio");
  const video = takeFile(body.video, allowedVideo, "video");
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    update atlas_entry set
      expression = ${expression},
      language = ${language},
      community = ${String(body.community || "").trim()},
      meaning = ${meaning},
      example = ${String(body.example || "").trim()},
      feeling = ${String(body.feeling || "").trim()},
      context = ${String(body.context || "").trim()},
      intention = ${String(body.intention || "").trim()},
      rephrasing = ${String(body.rephrasing || "").trim()},
      change_note = ${String(body.change || "").trim()},
      withheld = ${String(body.withheld || "").trim()},
      language_practice = ${String(body.languagePractice || "").trim()},
      origin = ${String(body.origin || "").trim()},
      identity = ${String(body.identity || "").trim()},
      listener_practice = ${String(body.listenerPractice || "").trim()},
      emotion = ${splitTags(String(body.emotion || "")).join(";")},
      context_tags = ${splitTags(String(body.contextTags || "")).join(";")},
      intention_tags = ${splitTags(String(body.intentionTags || "")).join(";")},
      also_used = ${String(body.alsoUsed || "").trim()},
      image_data = case when ${Boolean(image.data)} then ${image.data} else image_data end,
      image_mime = case when ${Boolean(image.data)} then ${image.mime} else image_mime end,
      audio_data = case when ${Boolean(audio.data)} then ${audio.data} else audio_data end,
      audio_mime = case when ${Boolean(audio.data)} then ${audio.mime} else audio_mime end,
      video_data = case when ${Boolean(video.data)} then ${video.data} else video_data end,
      video_mime = case when ${Boolean(video.data)} then ${video.mime} else video_mime end
    where id = ${id} and profile_id = ${profileId}
    returning id
  `;
  if (!rows[0]) throw new Error("That word is not on your account.");
  return rows[0].id;
}
