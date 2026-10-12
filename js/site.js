const KEY = "meaning-atlas-pages-v2";
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
  return { session: null, records: SEED.map((record) => ({ ...record, also: record.also || (record.expression.startsWith("Čist") ? "Serbian; Bosnian" : ""), image: record.image || "", audio: record.audio || "", video: "" })) };
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
  return `<p class="eyebrow">Meaning Atlas</p><h2>The words we carry</h2>
  <p>Meaning Atlas is this project. It was first called The Words We Carry. The name changed. The work is the same: start with a word and stay with what it means to the person who uses it.</p>
  <p>Each word belongs to one language. If it is also used in other languages, that is written beside it and does not make another shelf. Massa is Wolof. The proverb is Montenegrin, and it is also used in Serbian and Bosnian. Lekker and shame are Afrikaans examples, not survey findings.</p>
  <p>The web holds words, not people. Press a word and the meanings appear here. Press it again and this note returns. A dashed line is a shared label, not a cultural score. People stay hidden unless they choose to show an ID. A picture, a voice, or a video appears only if someone gave one.</p>`;
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
function who() { document.getElementById("who").textContent = state.session ? "ID hidden" : "Come in"; }
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
  const media = `${record.image ? `<img alt="" src="${record.image}">` : ""}${record.audio ? `<audio controls src="${record.audio}"></audio>` : ""}${record.video ? `<video controls src="${record.video}"></video>` : ""}`;
  return `<article class="story"><h2>${record.expression}</h2><p class="legend">${record.language}${record.also ? " · also used in " + record.also : ""}</p><p>${record.meaning || ""}</p>${media}</article>`;
}
function renderShelves() {
  const host = document.getElementById("shelves");
  host.replaceChildren();
  const intro = document.createElement("p");
  intro.className = "lede";
  intro.textContent = "Each language is a book. Open it here. The words stay on this shelf.";
  host.append(intro);
  const languages = [...new Set(state.records.map((record) => record.language))].sort((a, b) => a.localeCompare(b, "en"));
  languages.forEach((language) => {
    const words = state.records.filter((record) => record.language === language);
    const volume = document.createElement("div");
    volume.className = "volume" + (openBook === language ? " open" : "");
    const cover = document.createElement("button");
    cover.type = "button";
    cover.className = "cover";
    cover.innerHTML = `<span>${language}</span><small>${openBook === language ? "Close the book" : "Open the book"}</small>`;
    cover.onclick = () => { openBook = openBook === language ? null : language; reading = null; renderShelves(); };
    const pages = document.createElement("div");
    pages.className = "pages";
    pages.innerHTML = `<p>${language}. ${words.length} filed here. This does not open the word web.</p>`;
    words.forEach((record) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = record.expression;
      button.onclick = () => { reading = reading === record.id ? null : record.id; renderShelves(); };
      pages.append(button);
      if (reading === record.id) pages.insertAdjacentHTML("beforeend", meaningHtml(record));
    });
    volume.append(cover, pages);
    host.append(volume);
  });
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
    also: form.also.value.trim(), meaning: form.meaning.value.trim(), community: "",
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
setupLabels();
who();
show("home");
window.addEventListener("resize", () => { if (view === "web") renderWeb(); });
