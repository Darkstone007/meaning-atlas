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
  ["home", "web", "shelves", "add"].forEach((item) => { document.getElementById("view-" + item).hidden = item !== name; });
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  if (name === "home") renderHome();
  if (name === "web") renderWeb();
  if (name === "shelves") renderShelves();
}
function projectHtml() {
  return `<p class="eyebrow">Meaning Atlas</p><h2>What this is</h2>
  <p>Meaning Atlas is a place to follow a word into the account around it: how someone uses it, who they use it with, where it comes from for them, and a picture, voice, or video only if they gave one.</p>
  <p>Each word belongs to one language. If it is also used in other languages, that is written beside it and does not make another shelf. Massa is Wolof. The proverb is Montenegrin, and it is also used in Serbian and Bosnian. Lekker and shame are Afrikaans examples, not survey findings.</p>
  <p>The web holds words, not people. Press a word and the survey answers appear here. Press it again and this note returns. A dashed line is a shared label, not a cultural score. Turning the web does not measure closeness. People stay hidden unless they choose to show an ID.</p>`;
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
  const inside = Boolean(state.session);
  const welcome = document.getElementById("welcome");
  const app = document.getElementById("app");
  if (welcome) welcome.hidden = inside;
  if (app) app.hidden = !inside;
  const whoNode = document.getElementById("who");
  if (whoNode) whoNode.textContent = inside ? "ID hidden" : "Welcome";
  const shelves = document.getElementById("nav-shelves");
  const add = document.getElementById("nav-add");
  if (shelves) shelves.hidden = !inside;
  if (add) add.hidden = !inside;
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
  Object.keys(VOCAB).forEach((layer) => { record.tags[layer] = [...form.querySelectorAll(`[name="tag-${layer}"]:checked`)].map((input) => input.value); });
  state.records.push(record);
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
  state.session = { id: id || ("U-" + Math.random().toString(36).slice(2, 6).toUpperCase()), reveal: false };
  save();
  who();
  show("web");
}
document.getElementById("guest")?.addEventListener("click", () => enterAs());
document.getElementById("make")?.addEventListener("click", () => {
  const id = "U-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  const known = JSON.parse(localStorage.getItem(KEY + "-ids") || "[]");
  localStorage.setItem(KEY + "-ids", JSON.stringify([...known, id]));
  document.getElementById("welcome-note").textContent = "Your ID is " + id + ". Write it down, then you are in.";
  enterAs(id);
});
document.getElementById("show-login")?.addEventListener("click", () => { document.getElementById("login-form").hidden = false; });
document.getElementById("login-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = document.getElementById("login-id").value.trim().toUpperCase();
  const known = JSON.parse(localStorage.getItem(KEY + "-ids") || "[]");
  if (!known.includes(id)) { document.getElementById("welcome-note").textContent = "That ID is not on this browser."; return; }
  enterAs(id);
});
document.getElementById("shelf-search")?.addEventListener("input", renderShelves);
setupLabels();
who();
show("web");
window.addEventListener("resize", () => { if (view === "web") renderWeb(); });
