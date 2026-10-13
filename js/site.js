const KEY = "meaning-atlas-pages-v2";
const MORE = {
  "acct-4f2a": {
    languagePractice: "French and Wolof with some friends and family. English with friends.",
    origin: "It comes from Wolof.",
    listenerPractice: "I ask what it means, even for small things, rather than stay confused.",
  },
  "acct-91c7": {
    languagePractice: "Wolof with family and other Senegalese people. French with friends and classmates. English with classmates, professors, and anyone who does not speak Wolof or French.",
    origin: "I grew up hearing and using it in Senegal. It is how we express empathy, care, and solidarity.",
    listenerPractice: "I ask what it means when a simple translation does not seem enough.",
  },
  "acct-3b80": {
    languagePractice: "Montenegrin, Serbian, Bosnian, English, French, Arabic.",
    origin: "The Balkans.",
    identity: "It is part of my identity when it is accurate. There is no other sentence like it, and it feels like home.",
    listenerPractice: "I ask about it and try to carry the saying into my own language, or learn an English translation.",
    also: "Serbian; Bosnian",
  },
};
const VOCAB = {
  emotion: ["care", "affection", "joy", "longing", "pride", "frustration", "mixed"],
  context: ["friends", "family", "home", "work", "celebration", "greeting"],
  intention: ["comfort", "approval", "belonging", "humour", "address", "disagreement"],
};
const HINTS = [
  ["emotion", "care", ["care", "pain", "hurt", "sorry", "shame"]],
  ["emotion", "joy", ["lekker", "tasty", "nice", "good"]],
  ["emotion", "affection", ["love", "home", "dear"]],
  ["context", "friends", ["friend"]],
  ["context", "family", ["family", "child"]],
  ["intention", "comfort", ["comfort", "sorry", "shame"]],
  ["intention", "approval", ["lekker", "deal", "good"]],
];
let state = load();
let view = "home";
let selected = null;
let yaw = 24;
let pitch = 16;
let drag = null;
let openBook = null;
let reading = null;
const OWNER_HASH = "a3b39f5277df6de836221ba3271b8f265f1810fdf9f48f98e402f0c724809c7d";
let copy = {
  title: "What this is",
  paragraphs: [
    "Meaning Atlas is a place to follow a word into the account around it: how someone uses it, who they use it with, where it comes from for them, and a picture, voice, or a video only if they gave one.",
    "Each word belongs to one language. If it is also used in other languages, that is written beside it and does not make another shelf. Massa is Wolof. The proverb is Montenegrin, and it is also used in Serbian and Bosnian. Lekker and shame are Afrikaans examples, not survey findings.",
    "The web holds words, not people. Press a word and the survey answers appear here. Press it again and this note returns. A dashed line is a shared label, not a cultural score. Turning the web does not measure closeness. People stay hidden unless they choose to show an ID.",
  ],
};
let editingId = null;
function esc(value) {
  return String(value || "").replace(/&/g, "\u0026amp;").replace(/</g, "\u0026lt;").replace(/>/g, "\u0026gt;");
}
async function sha(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function currentCopy() {
  try {
    const saved = JSON.parse(localStorage.getItem("meaning-atlas-copy") || "null");
    if (saved && Array.isArray(saved.paragraphs)) return saved;
  } catch { /* use the file */ }
  return copy;
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && Array.isArray(saved.records)) return saved;
  } catch { /* fresh */ }
  return { session: null, records: SEED.map((record) => ({ ...(MORE[record.id] || {}), ...record, also: record.also || (MORE[record.id] && MORE[record.id].also) || "", image: record.image || "", audio: record.audio || "", video: "" })) };
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function norm(value) { return String(value || "").normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en"); }
function project(p) {
  const yr = yaw * Math.PI / 180, pr = pitch * Math.PI / 180;
  const x1 = p[0] * Math.cos(yr) + p[2] * Math.sin(yr);
  const z1 = -p[0] * Math.sin(yr) + p[2] * Math.cos(yr);
  const y1 = p[1] * Math.cos(pr) - z1 * Math.sin(pr);
  const z2 = p[1] * Math.sin(pr) + z1 * Math.cos(pr);
  const depth = 680 / (680 - z2);
  const stage = document.getElementById("stage");
  return [stage.clientWidth / 2 + x1 * depth, stage.clientHeight / 2 + y1 * depth];
}
function groups() {
  const q = norm(document.getElementById("search")?.value || "");
  const terms = q.split(" ").filter(Boolean);
  const map = new Map();
  state.records.filter((record) => terms.every((term) => norm([record.expression, record.language, record.meaning, record.also, ...(record.tags?.emotion || [])].join(" ")).includes(term))).forEach((record) => {
    const key = norm(record.expression) + "|" + norm(record.language);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(record);
  });
  return [...map.entries()].map(([key, accounts]) => ({ key, expression: accounts[0].expression, language: accounts[0].language, accounts }));
}
function show(name) {
  view = name;
  ["home", "web", "shelves", "add", "account"].forEach((item) => {
    const node = document.getElementById("view-" + item);
    if (node) node.hidden = item !== name;
  });
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  if (name === "web") renderWeb();
  if (name === "shelves") renderShelves();
  if (name === "account") renderAccount();
}
function projectHtml() {
  const text = currentCopy();
  return `<p class="eyebrow">Meaning Atlas</p><h2>${esc(text.title || "What this is")}</h2>${(text.paragraphs || []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}`;
}
function renderHome() {
  const box = document.getElementById("view-home");
  box.innerHTML = `<article class="story">${projectHtml()}</article>
    <div class="card" style="margin-top:24px"><h2>Keep a record</h2><p class="lede">Browsing needs no ID. An ID only keeps the words you add, and it stays hidden.</p>
    ${state.session ? `<p>You are in. Your ID stays hidden on the web.</p>` : `<div class="stack"><button class="btn primary" id="guest" type="button">Enter as a guest</button><button class="btn" id="make" type="button">Make a record</button></div>`}
    </div>`;
  document.getElementById("guest")?.addEventListener("click", () => { state.session = { id: "U-" + Math.random().toString(36).slice(2, 6).toUpperCase(), reveal: false }; save(); who(); renderHome(); });
  document.getElementById("make")?.addEventListener("click", () => { state.session = { id: "U-" + Math.random().toString(36).slice(2, 6).toUpperCase(), reveal: false }; save(); who(); renderHome(); });
}
function who() {
  const inside = sessionStorage.getItem("atlas-open") === "1";
  const welcome = document.getElementById("welcome");
  const app = document.getElementById("app");
  if (welcome) welcome.hidden = inside;
  if (app) app.hidden = !inside;
  const whoNode = document.getElementById("who");
  if (whoNode) whoNode.textContent = inside && state.session ? state.session.id : "Log in";
}
function renderWeb() {
  const list = groups();
  const stage = document.getElementById("stage");
  stage.replaceChildren();
  const layer = document.getElementById("layer").value;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const nodes = list.map((group, index) => {
    const count = Math.max(list.length, 2);
    const y = 1 - (index / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * index;
    const point = project([Math.cos(theta) * ring * 230, y * 150, Math.sin(theta) * ring * 230]);
    return { ...group, x: point[0], y: point[1] };
  });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  if (layer !== "none") {
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const shared = nodes[i].accounts.some((a) => nodes[j].accounts.some((b) => (a.tags[layer] || []).some((tag) => (b.tags[layer] || []).includes(tag))));
      if (!shared) continue;
      const line = document.createElementNS(svg.namespaceURI, "line");
      line.setAttribute("x1", nodes[i].x); line.setAttribute("y1", nodes[i].y); line.setAttribute("x2", nodes[j].x); line.setAttribute("y2", nodes[j].y);
      line.setAttribute("stroke", "#d7c6e6"); line.setAttribute("stroke-dasharray", "5 6");
      svg.append(line);
    }
  }
  stage.append(svg);
  nodes.forEach((node) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "node word" + (node.key === selected ? " on" : "");
    button.innerHTML = `<b>${node.expression}</b><small>${node.language}</small>`;
    button.style.left = node.x + "px";
    button.style.top = node.y + "px";
    button.onpointerdown = (event) => event.stopPropagation();
    button.onclick = () => { selected = selected === node.key ? null : node.key; renderWeb(); };
    stage.append(button);
  });
  const under = document.getElementById("under");
  const chosen = nodes.find((node) => node.key === selected);
  under.innerHTML = chosen ? chosen.accounts.map(meaningHtml).join("") : `<article class="story">${projectHtml()}</article>`;
}
function meaningHtml(record) {
  const rows = [
    ["Languages you use", record.languagePractice],
    ["Where it comes from", record.origin],
    ["Also used in", record.also],
    ["Meaning", record.meaning],
    ["Example", record.example],
    ["Feeling", record.feeling],
    ["How you would explain it", record.rephrasing],
    ["What changes", record.change],
    ["Who you are around", record.withheld],
    ["Being yourself", record.identity],
    ["When an expression is unfamiliar", record.listenerPractice],
  ].filter((row) => row[1]);
  const media = `${record.image ? `<img alt="" src="${record.image}">` : ""}${record.audio ? `<audio controls src="${record.audio}"></audio>` : ""}${record.video ? `<video controls src="${record.video}"></video>` : ""}`;
  return `<article class="story"><h2>${record.expression}</h2><p class="legend">${record.language}${record.community ? " · " + record.community : ""}</p>${rows.map((row) => `<div class="pair"><span>${row[0]}</span><p>${row[1]}</p></div>`).join("")}${media}</article>`;
}
function renderShelves() {
  const host = document.getElementById("shelves");
  const q = norm(document.getElementById("shelf-search")?.value || "");
  host.replaceChildren();
  const row = document.createElement("div");
  row.className = "shelf-row";
  const languages = [...new Set(state.records.map((record) => record.language))].sort((a, b) => a.localeCompare(b, "en"));
  languages.forEach((language) => {
    const words = state.records.filter((record) => record.language === language && (!q || norm([record.expression, record.language, record.meaning].join(" ")).includes(q)));
    if (!words.length && q && !norm(language).includes(q)) return;
    const spine = document.createElement("button");
    spine.type = "button";
    spine.className = "spine" + (openBook === language ? " on" : "");
    spine.textContent = language;
    spine.onclick = () => { openBook = openBook === language ? null : language; reading = null; renderShelves(); };
    row.append(spine);
  });
  host.append(row);
  if (!openBook) return;
  const words = state.records.filter((record) => record.language === openBook).sort((a, b) => a.expression.localeCompare(b.expression, "en"));
  const spread = document.createElement("article");
  spread.className = "spread";
  spread.innerHTML = `<header><h2>${openBook}</h2><button type="button" id="close-book">Close the book</button></header><div class="spread-body"><nav id="book-words"></nav><div id="book-page"><p>Choose a word. They are in alphabetical order.</p></div></div>`;
  host.append(spread);
  spread.querySelector("#close-book").onclick = () => { openBook = null; reading = null; renderShelves(); };
  const nav = spread.querySelector("#book-words");
  words.forEach((record) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = record.expression;
    if (reading === record.id) button.className = "on";
    button.onclick = () => { reading = reading === record.id ? null : record.id; renderShelves(); };
    nav.append(button);
  });
  const page = words.find((record) => record.id === reading);
  if (page) spread.querySelector("#book-page").innerHTML = meaningHtml(page);
}
function setupLabels() {
  const host = document.getElementById("labels");
  Object.entries(VOCAB).forEach(([layer, values]) => {
    const field = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = layer;
    field.append(legend);
    const chips = document.createElement("div");
    chips.className = "checks";
    values.forEach((value) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" name="tag-${layer}" value="${value}"> ${value}`;
      chips.append(label);
    });
    const own = document.createElement("input");
    own.name = "own-" + layer;
    own.placeholder = "Add your own, separated by ;";
    field.append(chips, own);
    host.append(field);
  });
}
document.querySelectorAll("[data-view]").forEach((button) => { button.onclick = () => show(button.dataset.view); });
document.getElementById("search").addEventListener("input", renderWeb);
document.getElementById("layer").addEventListener("change", renderWeb);
document.getElementById("reset-view").onclick = () => { yaw = 24; pitch = 16; document.getElementById("yaw").value = 24; document.getElementById("pitch").value = 16; renderWeb(); };
document.getElementById("yaw").oninput = (event) => { yaw = Number(event.target.value); renderWeb(); };
document.getElementById("pitch").oninput = (event) => { pitch = Number(event.target.value); renderWeb(); };
const stage = document.getElementById("stage");
stage.onpointerdown = (event) => { if (event.target.closest(".node")) return; drag = { x: event.clientX, y: event.clientY, yaw, pitch }; };
stage.onpointermove = (event) => { if (!drag) return; yaw = drag.yaw + (event.clientX - drag.x) * 0.35; pitch = Math.max(-55, Math.min(55, drag.pitch + (event.clientY - drag.y) * 0.15)); renderWeb(); };
stage.onpointerup = () => { drag = null; };
document.getElementById("add").onsubmit = async (event) => {
  event.preventDefault();
  if (!state.session) { document.getElementById("add-note").textContent = "Come in from the home page first."; return; }
  const form = event.currentTarget;
  const file = async (input) => input.files[0] ? await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(input.files[0]); }) : "";
  const record = {
    id: crypto.randomUUID(), userId: state.session.id, reveal: false,
    expression: form.expression.value.trim(), language: form.language.value.split(";")[0].trim(),
    also: form.also.value.trim(),
    languagePractice: form.languagePractice.value.trim(),
    origin: form.origin.value.trim(),
    example: form.example.value.trim(),
    rephrasing: form.rephrasing.value.trim(),
    withheld: form.withheld.value.trim(),
    identity: form.identity.value.trim(),
    listenerPractice: form.listenerPractice.value.trim(),
    meaning: form.meaning.value.trim(), community: "",
    tags: { emotion: [], context: [], intention: [] },
    image: await file(form.image), audio: await file(form.audio), video: await file(form.video), source: "visitor",
  };
  Object.keys(VOCAB).forEach((layer) => {
    record.tags[layer] = [...form.querySelectorAll(`[name="tag-${layer}"]:checked`)].map((input) => input.value);
    const own = form.querySelector(`[name="own-${layer}"]`);
    if (own && own.value.trim()) record.tags[layer].push(...own.value.split(";").map((item) => item.trim()).filter(Boolean));
  });
  if (editingId) {
    const index = state.records.findIndex((item) => item.id === editingId && item.userId === state.session.id);
    if (index >= 0) {
      record.id = editingId;
      record.image = record.image || state.records[index].image;
      record.audio = record.audio || state.records[index].audio;
      record.video = record.video || state.records[index].video;
      state.records[index] = record;
    }
    editingId = null;
  } else state.records.push(record);
  save();
  form.reset();
  selected = norm(record.expression) + "|" + norm(record.language);
  show("web");
};
document.querySelector("[name=meaning]").addEventListener("input", (event) => {
  const hay = norm(event.target.value);
  const host = document.getElementById("noticed");
  host.replaceChildren();
  HINTS.filter((hint) => hint[2].some((word) => hay.includes(word))).forEach((hint) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.textContent = `Add ${hint[1]} · ${hint[0]}`;
    button.onclick = () => { const box = document.querySelector(`[name="tag-${hint[0]}"][value="${hint[1]}"]`); if (box) box.checked = true; };
    host.append(button);
  });
});
function enterAs(id) {
  state.session = { id, reveal: false };
  sessionStorage.setItem("atlas-open", "1");
  save();
  who();
  show("web");
}
function knownIds() {
  const raw = JSON.parse(localStorage.getItem(KEY + "-ids") || "[]");
  return raw.map((item) => (typeof item === "string" ? { id: item, pass: "" } : item));
}
function renderAccount() {
  const host = document.getElementById("mine");
  if (!host) return;
  host.replaceChildren();
  const mine = state.records.filter((record) => record.userId === state.session?.id).sort((a, b) => a.expression.localeCompare(b.expression, "en"));
  if (!mine.length) { host.textContent = "You have not posted a word yet."; return; }
  mine.forEach((record) => {
    const row = document.createElement("article");
    row.className = "book";
    row.innerHTML = `<strong>${esc(record.expression)}</strong><span>${esc(record.language)}</span>`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.textContent = "Edit";
    button.onclick = () => {
      editingId = record.id;
      const form = document.getElementById("add");
      ["expression", "language", "also", "languagePractice", "origin", "meaning", "example", "rephrasing", "withheld", "identity", "listenerPractice"].forEach((name) => {
        if (form[name]) form[name].value = record[name] || (name === "also" ? record.also || "" : "");
      });
      show("add");
    };
    row.append(button);
    host.append(row);
  });
}
document.getElementById("guest")?.addEventListener("click", () => enterAs("guest"));
document.getElementById("make")?.addEventListener("click", async () => {
  const pass = document.getElementById("login-pass").value;
  if (pass.length < 4) { document.getElementById("welcome-note").textContent = "Choose a passphrase of at least 4 characters in the login form, then make an ID."; return; }
  const id = "U-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  const list = knownIds().filter((item) => item.id !== id);
  list.push({ id, pass: await sha(pass) });
  localStorage.setItem(KEY + "-ids", JSON.stringify(list));
  document.getElementById("welcome-note").textContent = "Your ID is " + id + ". Write it down with the passphrase.";
  enterAs(id);
});
document.getElementById("login-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.getElementById("login-id").value.trim().toUpperCase();
  const pass = document.getElementById("login-pass").value;
  const found = knownIds().find((item) => item.id === id);
  if (!found || (found.pass && found.pass !== await sha(pass))) { document.getElementById("welcome-note").textContent = "That ID and passphrase do not match an ID made on this browser."; return; }
  enterAs(id);
});
document.getElementById("logout")?.addEventListener("click", () => {
  sessionStorage.removeItem("atlas-open");
  who();
});
document.getElementById("show-owner")?.addEventListener("click", () => { document.getElementById("owner-gate").hidden = false; });
document.getElementById("owner-gate")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (await sha(document.getElementById("owner-pass").value) !== OWNER_HASH) { document.getElementById("welcome-note").textContent = "That is not the owner passphrase."; return; }
  const text = currentCopy();
  document.getElementById("copy-title").value = text.title || "";
  document.getElementById("copy-body").value = (text.paragraphs || []).join("\n\n");
  document.getElementById("owner-edit").hidden = false;
});
document.getElementById("owner-edit")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const next = { title: document.getElementById("copy-title").value.trim() || "What this is", paragraphs: document.getElementById("copy-body").value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean) };
  localStorage.setItem("meaning-atlas-copy", JSON.stringify(next));
  const token = document.getElementById("owner-token").value.trim();
  if (!token) { document.getElementById("welcome-note").textContent = "Saved on this browser. Add a GitHub token to publish it for everyone."; return; }
  const path = "js/copy.json";
  const api = "https://api.github.com/repos/Darkstone007/meaning-atlas/contents/" + path;
  const headers = { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" };
  const current = await fetch(api, { headers }).then((response) => response.json());
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(next, null, 2) + "\n")));
  const saved = await fetch(api, { method: "PUT", headers, body: JSON.stringify({ message: "Update the project text", content, sha: current.sha, branch: "main" }) });
  document.getElementById("welcome-note").textContent = saved.ok ? "Published. The live site updates in about a minute." : "Saved here. GitHub did not accept that token.";
});
document.getElementById("shelf-search")?.addEventListener("input", renderShelves);
setupLabels();
who();
show("web");
window.addEventListener("resize", () => { if (view === "web") renderWeb(); });
