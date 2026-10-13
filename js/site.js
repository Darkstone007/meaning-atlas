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
let selectedLine = null;
let panelMode = "start";
let ownerLanguage = "all";
let ownerAccount = "all";
let yaw = 24;
let pitch = 16;
let drag = null;
let openBook = null;
let reading = null;
const OWNER_HASH = "a3b39f5277df6de836221ba3271b8f265f1810fdf9f48f98e402f0c724809c7d";
let copy = {
  title: "What this is",
  paragraphs: [
    "The current website is a proof of concept for Meaning Atlas. I wanted to show how a word can open into someone’s personal experience, including what it means to them, how they use it, and the emotions or memories attached to it. Visitors can explore the map, search for words, and select them to read the accounts behind them. The connections show where people have used similar labels for feelings, contexts, or intentions, while still keeping their individual explanations visible.",
    "With the wider project, I want to explore what we miss when we translate a word without understanding the person or context behind it. Meaning Atlas would become an interactive installation where people can explore these accounts and contribute their own. I am considering a projected map alongside VR, where others can see an avatar interacting with the nodes, and a possible floor projection that visitors can explore separately. People would also be able to scan a QR code and add words through their phones. The aim is to let people find connections across their experiences while leaving room for meanings that are different or difficult to explain.",
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
    const saved = JSON.parse(localStorage.getItem("meaning-atlas-copy-v2") || "null");
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
  ["home", "web", "shelves", "add", "account", "profile"].forEach((item) => {
    const node = document.getElementById("view-" + item);
    if (node) node.hidden = item !== name;
  });
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  if (name === "web") renderWeb();
  if (name === "shelves") renderShelves();
  if (name === "account") renderAccount();
  if (name === "add") {
    const guest = !state.session || state.session.id === "guest";
    const form = document.getElementById("add");
    const gate = document.getElementById("guest-gate");
    if (form) form.hidden = guest;
    if (gate) gate.hidden = !guest;
  }
  if (name === "profile") renderProfile();
}
function projectHtml() {
  const text = siteCopy();
  return `<p class="eyebrow">Meaning Atlas</p><h2>${esc(text.title || "What this is")}</h2>${(text.paragraphs || []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}`;
}
const HOW = [
  "Enter the site. Explore as a guest, or make a record and return with that ID.",
  "Choose a word on the map.",
  "Read the account beside it. Meaning, example, emotion, context, and intention are separate.",
  "Click a dashed line, or use the connection list. It names the two words and the shared label. A shared label is not the same meaning.",
  "Search for a word, language, or meaning. Clear the search to return to the wider map.",
  "Open Shelves to read the words by language.",
  "Add a word when you want to. It does not need to be a dictionary definition.",
  "Open Your words to find what this record posted.",
];
function siteCopy() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("meaning-atlas-site-v3") || "{}") || {}; } catch { saved = {}; }
  const base = currentCopy();
  return {
    welcome: saved.welcome || "Choose a word to discover what it means to someone. You do not need to understand the language.",
    title: saved.title || base.title,
    paragraphs: saved.paragraphs && saved.paragraphs.length ? saved.paragraphs : base.paragraphs,
    how: saved.how && saved.how.length ? saved.how : HOW,
  };
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
  const owner = sessionStorage.getItem("atlas-owner") === "1";
  const inside = sessionStorage.getItem("atlas-open") === "1" && !owner;
  const welcome = document.getElementById("welcome");
  const app = document.getElementById("app");
  const ownerPage = document.getElementById("owner-page");
  if (welcome) welcome.hidden = inside || owner;
  if (app) app.hidden = !inside;
  if (ownerPage) ownerPage.hidden = !owner;
  const whoNode = document.getElementById("who");
  if (whoNode) whoNode.textContent = state.session?.id === "guest" ? "Guest" : "ID hidden";
}
function separate(nodes) {
  const stage = document.getElementById("stage");
  const pad = 120;
  for (let pass = 0; pass < 28; pass++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x;
        let dy = nodes[j].y - nodes[i].y;
        const iw = Math.min(240, 40 + nodes[i].expression.length * 7.2);
        const jw = Math.min(240, 40 + nodes[j].expression.length * 7.2);
        const overlapX = (iw + jw) / 2 + 18 - Math.abs(dx);
        const overlapY = 58 - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          if (overlapX <= overlapY) {
            const push = overlapX / 2 + 1;
            const sign = dx < 0 ? -1 : 1;
            nodes[i].x -= sign * push;
            nodes[j].x += sign * push;
          } else {
            const push = overlapY / 2 + 1;
            const sign = dy < 0 ? -1 : 1;
            nodes[i].y -= sign * push;
            nodes[j].y += sign * push;
          }
        }
      }
    }
  }
  nodes.forEach((node) => {
    node.x = Math.max(pad, Math.min(stage.clientWidth - pad, node.x));
    node.y = Math.max(46, Math.min(stage.clientHeight - 46, node.y));
  });
}
function sharedTags(left, right, layer) {
  const have = new Set(left.accounts.flatMap((record) => record.tags?.[layer] || []));
  return [...new Set(right.accounts.flatMap((record) => record.tags?.[layer] || []))].filter((tag) => have.has(tag));
}
function renderWeb() {
  const list = groups();
  const stage = document.getElementById("stage");
  const note = document.getElementById("search-note");
  const query = document.getElementById("search")?.value.trim();
  if (note) note.textContent = list.length ? `${list.length} ${list.length === 1 ? "word" : "words"}${query ? " match this search" : ""}. Choose a word to discover what it means to someone.` : "No results. Try another word, or clear the search.";
  stage.replaceChildren();
  if (!list.length) { renderPanel(); return; }
  const layer = document.getElementById("layer").value;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const nodes = list.map((group, index) => {
    const count = Math.max(list.length, 2);
    const y = 1 - (index / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * index;
    const point = project([Math.cos(theta) * ring * 280, y * 170, Math.sin(theta) * ring * 280]);
    return { ...group, x: point[0], y: point[1] };
  });
  separate(nodes);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  if (layer !== "none") {
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const tags = sharedTags(nodes[i], nodes[j], layer);
      if (!tags.length) continue;
      const on = selectedLine && selectedLine.layer === layer && selectedLine.a === nodes[i].key && selectedLine.b === nodes[j].key;
      const open = (event) => {
        event.stopPropagation();
        selected = null;
        panelMode = "line";
        selectedLine = { a: nodes[i].key, b: nodes[j].key, from: nodes[i].expression, to: nodes[j].expression, tags, layer };
        renderWeb();
      };
      const hit = document.createElementNS(svg.namespaceURI, "line");
      ["x1", "y1", "x2", "y2"].forEach((name, index) => hit.setAttribute(name, [nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y][index]));
      hit.setAttribute("stroke", "transparent");
      hit.setAttribute("stroke-width", "24");
      hit.style.pointerEvents = "stroke";
      hit.style.cursor = "pointer";
      hit.setAttribute("role", "button");
      hit.setAttribute("tabindex", "0");
      hit.setAttribute("aria-label", `${nodes[i].expression} and ${nodes[j].expression}. Shared ${layer} label: ${tags.join(", ")}`);
      hit.onclick = open;
      hit.onkeydown = (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(event); } };
      const line = document.createElementNS(svg.namespaceURI, "line");
      line.setAttribute("x1", nodes[i].x); line.setAttribute("y1", nodes[i].y); line.setAttribute("x2", nodes[j].x); line.setAttribute("y2", nodes[j].y);
      line.setAttribute("stroke", on ? "#c6b08a" : "#d7c6e6");
      line.setAttribute("stroke-width", on ? "3" : "1.5");
      line.setAttribute("stroke-dasharray", "5 6");
      line.style.pointerEvents = "none";
      svg.append(hit, line);
    }
  }
  stage.append(svg);
  nodes.forEach((node) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "node word" + (node.key === selected ? " on" : "") + (selectedLine && (selectedLine.a === node.key || selectedLine.b === node.key) ? " linked" : "");
    const example = node.accounts.every((record) => record.source === "example");
    button.innerHTML = `<b>${esc(node.expression)}</b><small>${esc(node.language)}${node.accounts.length > 1 ? " · " + node.accounts.length + " accounts" : ""}${example ? " · example" : ""}</small>`;
    button.style.left = node.x + "px";
    button.style.top = node.y + "px";
    button.onpointerdown = (event) => event.stopPropagation();
    button.onclick = () => { selectedLine = null; panelMode = "word"; selected = node.key; renderWeb(); };
    stage.append(button);
  });
  renderPanel(nodes);
  const links = document.getElementById("links");
  if (links) {
    links.replaceChildren();
    if (layer === "none") return;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const tags = sharedTags(nodes[i], nodes[j], layer);
      if (!tags.length) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn";
      button.textContent = `${nodes[i].expression} ↔ ${nodes[j].expression} · ${tags.join(", ")}`;
      button.onclick = () => {
        selected = null;
        panelMode = "line";
        selectedLine = { a: nodes[i].key, b: nodes[j].key, from: nodes[i].expression, to: nodes[j].expression, tags, layer };
        renderWeb();
      };
      links.append(button);
    }
  }
}
function renderPanel(nodes) {
  const panel = document.getElementById("panel");
  if (!panel) return;
  const chosen = (nodes || []).find((node) => node.key === selected);
  if (panelMode === "about") { panel.innerHTML = `<article class="story">${projectHtml()}<button type="button" class="btn" id="back-start">Back</button></article>`; document.getElementById("back-start").onclick = () => { panelMode = "start"; renderWeb(); }; return; }
  if (panelMode === "how") {
    const steps = siteCopy().how.map((step) => `<li>${esc(step)}</li>`).join("");
    panel.innerHTML = `<article class="story"><h2>How to explore</h2><ol class="steps">${steps}</ol><button type="button" class="btn" id="back-start">Back</button></article>`;
    document.getElementById("back-start").onclick = () => { panelMode = "start"; renderWeb(); };
    return;
  }
  if (selectedLine && panelMode === "line") {
    const layerName = { emotion: "Emotion", context: "Context", intention: "Intention" }[selectedLine.layer] || selectedLine.layer;
    panel.innerHTML = `<article class="story"><h2>This connection</h2>
      <p class="link-words"><button type="button" data-word="${esc(selectedLine.a)}">${esc(selectedLine.from)}</button> ↔ <button type="button" data-word="${esc(selectedLine.b)}">${esc(selectedLine.to)}</button></p>
      <div class="bit"><h4>${esc(layerName)}</h4><p>Shared label: ${selectedLine.tags.map(esc).join(", ")}. This is a shared label, not the same meaning.</p></div>
      <button type="button" class="btn" id="close-line">Close connection</button></article>`;
    document.getElementById("close-line").onclick = () => { selectedLine = null; panelMode = "start"; renderWeb(); };
    panel.querySelectorAll("[data-word]").forEach((button) => {
      button.onclick = () => { selected = button.dataset.word; selectedLine = null; panelMode = "word"; renderWeb(); };
    });
    return;
  }
  if (!chosen) {
    panel.innerHTML = `<article class="story"><h2>Choose a word</h2><p>Choose a word to discover what it means to someone.</p><button type="button" class="btn" id="open-about">What this is</button><button type="button" class="btn" id="open-how">How to explore</button></article>`;
    document.getElementById("open-about").onclick = () => { panelMode = "about"; renderWeb(); };
    document.getElementById("open-how").onclick = () => { panelMode = "how"; renderWeb(); };
    return;
  }
  const jumps = chosen.accounts.map((record, index) => {
    return `<button type="button" data-jump="acct-${record.id}">${esc(accountName(record, index + 1))}</button>`;
  }).join("");
  panel.innerHTML = `<article class="story"><div id="account-top"><p class="legend">${esc(chosen.language)}</p><h2>${esc(chosen.expression)}</h2><nav class="account-jump">${jumps}</nav><button type="button" class="btn" id="close-account">Close</button></div>${chosen.accounts.map((record, index) => meaningHtml(record, index + 1)).join("")}</article>`;
  document.getElementById("close-account").onclick = () => { selected = null; panelMode = "start"; renderWeb(); };
  panel.querySelectorAll("[data-jump]").forEach((button) => {
    button.onclick = () => document.getElementById(button.dataset.jump)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  panel.querySelectorAll("[data-top]").forEach((button) => {
    button.onclick = () => document.getElementById("account-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
function accountName(record, number) {
  return record.reveal && record.userId ? `Account ${number} · User ID ${record.userId}` : `Account ${number}`;
}
function youtubeId(url) {
  const match = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/);
  return match ? match[1] : "";
}
function bit(title, text) {
  if (!text) return "";
  return `<div class="bit"><h4>${esc(title)}</h4><p>${esc(text)}</p></div>`;
}
function meaningHtml(record, number) {
  const video = youtubeId(record.youtube);
  const media = `${record.image ? `<img alt="" src="${record.image}">` : ""}${record.audio ? `<audio controls src="${record.audio}"></audio>` : ""}${record.video ? `<video controls src="${record.video}"></video>` : ""}${video ? `<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${video}" title="Playback" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ""}`;
  return `<section class="account" id="acct-${record.id}">
    <button type="button" class="btn back-top" data-top="1">Back to accounts</button>
    <h3>${esc(accountName(record, number || 1))}</h3>${record.source === "example" ? `<span class="badge">Illustrative example</span>` : ""}
    ${bit("Meaning", record.meaning)}
    ${bit("Example", record.example)}
    ${bit("Emotion", record.feeling)}
    ${bit("Context", record.context)}
    ${bit("Intention", record.intention)}
    ${bit("Also used in", record.also || record.alsoUsed)}
    ${bit("Where it comes from", record.origin)}
    ${bit("How you would explain it", record.rephrasing)}
    ${bit("What changes", record.change)}
    ${bit("Who you are around", record.withheld)}
    ${bit("Being yourself", record.identity)}
    ${bit("When an expression is unfamiliar", record.listenerPractice)}
    ${bit("Languages you use", record.languagePractice)}
    ${media}
  </section>`;
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
  const grouped = new Map();
  words.forEach((record) => {
    const key = norm(record.expression);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(record);
  });
  [...grouped.values()].sort((a, b) => a[0].expression.localeCompare(b[0].expression, "en")).forEach((group) => {
    if (group.length === 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = group[0].expression + (group[0].source === "example" ? " · example" : "");
      if (reading === group[0].id) button.className = "on";
      button.onclick = () => { reading = reading === group[0].id ? null : group[0].id; renderShelves(); };
      nav.append(button);
      return;
    }
    const head = document.createElement("p");
    head.className = "word-group";
    head.textContent = `${group[0].expression} · ${group.length} accounts`;
    nav.append(head);
    group.forEach((record, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `Account ${index + 1}`;
      if (reading === record.id) button.className = "on";
      button.onclick = () => { reading = reading === record.id ? null : record.id; renderShelves(); };
      nav.append(button);
    });
  });
  const page = words.find((record) => record.id === reading);
  if (page) spread.querySelector("#book-page").innerHTML = meaningHtml(page);
}
function extraLabels() {
  try { return JSON.parse(localStorage.getItem("meaning-atlas-labels") || "{}") || {}; } catch { return {}; }
}
function labelsFor(layer) {
  const saved = extraLabels()[layer] || [];
  const used = state.records.flatMap((record) => record.tags?.[layer] || []);
  const seen = new Set();
  return [...VOCAB[layer], ...saved, ...used].filter((value) => {
    const key = String(value || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.localeCompare(b, "en"));
}
function rememberLabel(layer, value) {
  const clean = String(value || "").trim();
  if (!clean || VOCAB[layer].some((item) => item.toLowerCase() === clean.toLowerCase())) return;
  const saved = extraLabels();
  saved[layer] = saved[layer] || [];
  if (!saved[layer].some((item) => item.toLowerCase() === clean.toLowerCase())) saved[layer].push(clean);
  localStorage.setItem("meaning-atlas-labels", JSON.stringify(saved));
}
function setupLabels() {
  const host = document.getElementById("labels");
  const checked = new Set([...host.querySelectorAll("input:checked")].map((input) => input.name + "=" + input.value));
  host.replaceChildren();
  Object.keys(VOCAB).forEach((layer) => {
    const field = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = layer;
    field.append(legend);
    const chips = document.createElement("div");
    chips.className = "checks";
    labelsFor(layer).forEach((value) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "tag-" + layer;
      input.value = value;
      input.checked = checked.has(input.name + "=" + value);
      label.append(input, document.createTextNode(" " + value));
      chips.append(label);
    });
    const own = document.createElement("input");
    own.name = "own-" + layer;
    own.placeholder = "Add your own, separated by ;";
    own.addEventListener("change", () => {
      own.value.split(";").map((item) => item.trim()).filter(Boolean).forEach((value) => {
        rememberLabel(layer, value);
        checked.add("tag-" + layer + "=" + value);
      });
      setupLabels();
    });
    field.append(chips, own);
    host.append(field);
  });
}
document.querySelectorAll("[data-view]").forEach((button) => { button.onclick = () => show(button.dataset.view); });
document.getElementById("search").addEventListener("input", renderWeb);
document.getElementById("layer").addEventListener("change", () => {
  selectedLine = null;
  if (panelMode === "line") panelMode = "start";
  renderWeb();
});
document.getElementById("reset-view").onclick = () => { yaw = 24; pitch = 16; document.getElementById("yaw").value = 24; document.getElementById("pitch").value = 16; renderWeb(); };
document.getElementById("yaw").oninput = (event) => { yaw = Number(event.target.value); renderWeb(); };
document.getElementById("pitch").oninput = (event) => { pitch = Number(event.target.value); renderWeb(); };
const stage = document.getElementById("stage");
stage.onpointerdown = (event) => { if (event.target.closest(".node")) return; drag = { x: event.clientX, y: event.clientY, yaw, pitch }; };
stage.onpointermove = (event) => { if (!drag) return; yaw = drag.yaw + (event.clientX - drag.x) * 0.35; pitch = Math.max(-55, Math.min(55, drag.pitch + (event.clientY - drag.y) * 0.15)); renderWeb(); };
stage.onpointerup = () => { drag = null; };
document.getElementById("add").onsubmit = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!state.session || state.session.id === "guest") { document.getElementById("add-note").textContent = "Make an ID before you add a word."; show("add"); return; }
  ["meaning", "example", "emotion", "context", "intention"].forEach((name) => {
    const error = document.querySelector(`[data-for="${name}"]`);
    const missing = !form[name].value.trim();
    if (error) error.textContent = missing ? "This is required." : "";
    form[name].setAttribute("aria-invalid", missing ? "true" : "false");
  });
  if (!form.example.value.trim() || !form.emotion.value.trim() || !form.context.value.trim() || !form.intention.value.trim()) {
    document.getElementById("add-note").textContent = "An example, an emotion, a context, and an intention are required.";
    return;
  }
  const missing = ["emotion", "context", "intention"].filter((layer) => {
    const picked = [...form.querySelectorAll(`[name="tag-${layer}"]:checked`)];
    const own = form.querySelector(`[name="own-${layer}"]`)?.value.trim();
    return !picked.length && !own;
  });
  if (missing.length) {
    document.getElementById("add-note").textContent = "Choose at least one label for " + missing.join(", ") + ". A line uses that label when someone clicks it.";
    return;
  }
  const tooBig = [...form.querySelectorAll("input[type=file]")].find((input) => input.files[0] && input.files[0].size > 1_500_000);
  if (tooBig) {
    document.getElementById("add-note").textContent = "That file is larger than the maximum of 1.5 MB, so it was not added. The rest of the form is still here. Send the file to the owner, or paste an unlisted YouTube link.";
    return;
  }
  const file = async (input) => input.files[0] ? await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(input.files[0]); }) : "";
  const record = {
    id: crypto.randomUUID(), userId: state.session.id, reveal: Boolean(state.session.reveal),
    expression: form.expression.value.trim(), language: form.language.value.split(";")[0].trim(),
    also: form.also.value.trim(),
    languagePractice: form.languagePractice.value.trim(),
    origin: form.origin.value.trim(),
    example: form.example.value.trim(),
    feeling: form.emotion.value.trim(),
    context: form.context.value.trim(),
    intention: form.intention.value.trim(),
    youtube: form.youtube.value.trim(),
    rephrasing: form.rephrasing.value.trim(),
    withheld: form.withheld.value.trim(),
    identity: form.identity.value.trim(),
    listenerPractice: form.listenerPractice.value.trim(),
    meaning: form.meaning.value.trim(),
    change: form.change ? form.change.value.trim() : "",
    community: "",
    tags: { emotion: [], context: [], intention: [] },
    image: await file(form.image), audio: await file(form.audio), video: await file(form.video), source: "visitor",
  };
  Object.keys(VOCAB).forEach((layer) => {
    record.tags[layer] = [...form.querySelectorAll(`[name="tag-${layer}"]:checked`)].map((input) => input.value);
    const own = form.querySelector(`[name="own-${layer}"]`);
    if (own && own.value.trim()) own.value.split(";").map((item) => item.trim()).filter(Boolean).forEach((value) => { rememberLabel(layer, value); record.tags[layer].push(value); });
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
  setupLabels();
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
    button.textContent = `Accept ${hint[1]} as ${hint[0]}`;
    button.title = `Suggested because you wrote something like “${hint[2][0]}”. Nothing is added until you accept it.`;
    button.onclick = () => { const box = document.querySelector(`[name="tag-${hint[0]}"][value="${hint[1]}"]`); if (box) box.checked = true; };
    host.append(button);
  });
});
function enterAs(id, next) {
  const known = knownIds().find((item) => item.id === id) || {};
  state.session = { id, reveal: Boolean(known.reveal), name: known.name || "", contact: Boolean(known.contact), contactHow: known.contactHow || "", similar: Boolean(known.similar), passIsId: known.passIsId === true };
  sessionStorage.setItem("atlas-open", "1");
  save();
  who();
  show(next || "web");
}
function knownIds() {
  const raw = JSON.parse(localStorage.getItem(KEY + "-ids") || "[]");
  return raw.map((item) => (typeof item === "string" ? { id: item, pass: "" } : item));
}
function saveProfile(fields) {
  const list = knownIds();
  const item = list.find((entry) => entry.id === state.session.id);
  if (!item) return;
  Object.assign(item, fields);
  localStorage.setItem(KEY + "-ids", JSON.stringify(list));
  Object.assign(state.session, fields);
  save();
}
function renderProfile() {
  const host = document.getElementById("profile");
  if (!host) return;
  host.replaceChildren();
  if (!state.session || state.session.id === "guest") {
    host.innerHTML = `<p class="account-copy">You are a guest, so there is no ID yet. Make an ID before you add a word. For now the passphrase is that user ID. You can log in with the user ID and that passphrase, unless you change it. The ID is not shown on the main page.</p><button class="btn primary" id="make-inline" type="button">Make an ID</button>`;
    host.querySelector("#make-inline").onclick = () => createId();
    return;
  }
  const known = knownIds().find((item) => item.id === state.session.id) || {};
  const passIsId = known.passIsId === true;
  host.innerHTML = `<h3>Your ID</h3>
    <p class="account-copy">This ID is not shown on the main page. Write it down. You need it to log in.</p>
    <p class="account-id" id="shown-id"></p>
    <button class="btn" id="copy-id" type="button">Copy the ID</button>
    <h3>Passphrase</h3>
    <p class="account-copy">${passIsId ? "Right now your passphrase is your user ID. Log in with this user ID and this passphrase. You can change it below. Changing it is optional." : "Your passphrase is the one you set. Your user ID stays the same. Changing the passphrase again is optional."}</p>
    <form id="pass-form" class="stack">
      <label>New passphrase <span class="opt">Optional</span><input name="pass" type="password" autocomplete="new-password" minlength="8"></label>
      <label>Repeat the passphrase <span class="opt">Optional</span><input name="again" type="password" autocomplete="new-password"></label>
      <button class="btn" type="submit">Update passphrase</button>
    </form>
    <h3>Optional</h3>
    <p class="account-copy">Name, contact, and the choices below are optional. They stay on this account. They are not shown on the main page.</p>
    <form id="profile-form" class="stack">
      <label>Name <span class="opt">Optional</span><input name="name" maxlength="80" placeholder="Only on this account"></label>
      <label class="account-copy"><input name="contact" type="checkbox"> I want to be contacted. <span class="opt">Optional</span></label>
      <label>How to reach you <span class="opt">Optional</span><input name="contactHow" maxlength="160" placeholder="Only if you want to be contacted"></label>
      <label class="account-copy"><input name="reveal" type="checkbox"> Show my ID beside my words. <span class="opt">Optional</span></label>
      <label class="account-copy"><input name="similar" type="checkbox"> Tell me when a word has a similar meaning or intention. <span class="opt">Optional</span></label>
      <button class="btn primary" type="submit">Save account</button>
    </form>
    <p class="note" id="profile-note"></p>`;
  host.querySelector("#shown-id").textContent = state.session.id;
  const profile = host.querySelector("#profile-form");
  profile.name.value = state.session.name || "";
  profile.contact.checked = Boolean(state.session.contact);
  profile.contactHow.value = state.session.contactHow || "";
  profile.reveal.checked = Boolean(state.session.reveal);
  profile.similar.checked = Boolean(state.session.similar);
  host.querySelector("#copy-id").onclick = async () => {
    try { await navigator.clipboard.writeText(state.session.id); document.getElementById("profile-note").textContent = "Copied."; }
    catch { document.getElementById("profile-note").textContent = state.session.id; }
  };
  host.querySelector("#pass-form").onsubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const pass = String(data.get("pass") || "");
    if (pass.length < 8 || pass !== data.get("again")) { document.getElementById("profile-note").textContent = "Use at least 8 characters, and type the passphrase the same way twice."; return; }
    saveProfile({ pass: await sha(pass), passIsId: false });
    event.currentTarget.reset();
    document.getElementById("profile-note").textContent = "Passphrase updated. Your ID is unchanged.";
    renderProfile();
  };
  profile.onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(profile);
    const reveal = Boolean(data.get("reveal"));
    state.records.forEach((record) => { if (record.userId === state.session.id) record.reveal = reveal; });
    saveProfile({ name: String(data.get("name") || "").trim(), contact: Boolean(data.get("contact")), contactHow: String(data.get("contactHow") || "").trim(), reveal, similar: Boolean(data.get("similar")) });
    show("web");
  };
}
function renderAccount() {
  const host = document.getElementById("mine");
  if (!host) return;
  document.getElementById("similar")?.replaceChildren();
  host.replaceChildren();
  const reveal = document.createElement("label");
  reveal.className = "legend";
  reveal.innerHTML = `<input type="checkbox" ${state.session?.reveal ? "checked" : ""}> Show my ID beside my words`;
  reveal.querySelector("input").onchange = (event) => {
    state.session.reveal = event.target.checked;
    state.records.forEach((record) => { if (record.userId === state.session.id) record.reveal = event.target.checked; });
    if (state.session.id !== "guest") saveProfile({ reveal: event.target.checked });
    else save();
  };
  host.append(reveal);
  const mine = state.records.filter((record) => record.userId === state.session?.id).sort((a, b) => a.expression.localeCompare(b.expression, "en"));
  if (!mine.length) { const empty = document.createElement("p"); empty.textContent = "You have not posted a word yet."; host.append(empty); return; }
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
      ["expression", "language", "also", "languagePractice", "origin", "meaning", "example", "rephrasing", "withheld", "identity", "listenerPractice", "youtube"].forEach((name) => {
        if (form[name]) form[name].value = record[name] || (name === "also" ? record.also || "" : "");
      });
      if (form.emotion) form.emotion.value = record.feeling || "";
      if (form.context) form.context.value = record.context || "";
      if (form.intention) form.intention.value = record.intention || "";
      show("add");
    };
    row.append(button);
    host.append(row);
  });
  const similar = document.getElementById("similar");
  if (!similar) return;
  similar.replaceChildren();
  if (!state.session?.similar || state.session.id === "guest") return;
  const heading = document.createElement("h3");
  heading.textContent = "Words similar to yours";
  similar.append(heading);
  let found = false;
  mine.forEach((record) => {
    const labels = new Set([...(record.tags?.emotion || []), ...(record.tags?.intention || [])]);
    state.records.forEach((other) => {
      if (other.userId === record.userId && norm(other.expression) === norm(record.expression)) return;
      const shared = [...new Set([...(other.tags?.emotion || []), ...(other.tags?.intention || [])])].filter((tag) => labels.has(tag));
      if (!shared.length) return;
      found = true;
      const block = document.createElement("article");
      block.className = "bit";
      const use = other.example || other.intention || other.meaning || "";
      block.innerHTML = `<h4>Words similar to ${esc(record.expression)}</h4><p>${esc(other.expression)} · ${esc(other.language)}</p><p>Shared: ${shared.map(esc).join(", ")}</p>${use ? `<p>How it might be used: ${esc(use)}</p>` : ""}`;
      similar.append(block);
    });
  });
  if (!found) {
    const empty = document.createElement("p");
    empty.textContent = "Nothing else shares a meaning or intention label with your words yet.";
    similar.append(empty);
  }
}
function freshId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const taken = new Set(knownIds().map((item) => item.id));
  let id = "";
  do {
    id = "U-" + [...crypto.getRandomValues(new Uint8Array(12))].map((byte) => alphabet[byte % alphabet.length]).join("");
  } while (taken.has(id));
  return id;
}
function openOwner() {
  sessionStorage.setItem("atlas-owner", "1");
  sessionStorage.removeItem("atlas-open");
  const text = siteCopy();
  document.getElementById("copy-welcome").value = text.welcome;
  document.getElementById("copy-title").value = text.title || "";
  document.getElementById("copy-body").value = (text.paragraphs || []).join("\n\n");
  document.getElementById("copy-how").value = (text.how || []).join("\n");
  renderOwnerWords();
  who();
}
function renderOwnerWords() {
  const host = document.getElementById("owner-words");
  host.replaceChildren();
  const languages = [...new Set(state.records.map((record) => record.language))].sort((a, b) => a.localeCompare(b, "en"));
  const bar = document.createElement("div");
  bar.className = "owner-filters";
  const langLabel = document.createElement("label");
  langLabel.textContent = "Language";
  const lang = document.createElement("select");
  lang.append(new Option("All languages", "all"));
  languages.forEach((language) => lang.append(new Option(language, language)));
  lang.value = ownerLanguage;
  langLabel.append(lang);
  const accountLabel = document.createElement("label");
  accountLabel.textContent = "Account";
  const account = document.createElement("select");
  const pool = state.records.filter((record) => ownerLanguage === "all" || record.language === ownerLanguage).slice().sort((a, b) => a.expression.localeCompare(b.expression, "en") || a.language.localeCompare(b.language, "en"));
  account.append(new Option("All accounts, alphabetical", "all"));
  pool.forEach((record, index) => account.append(new Option(`${record.expression} · ${record.language} · Account ${index + 1}`, record.id)));
  if (ownerAccount !== "all" && !pool.some((record) => record.id === ownerAccount)) ownerAccount = "all";
  account.value = ownerAccount;
  accountLabel.append(account);
  lang.onchange = () => { ownerLanguage = lang.value; ownerAccount = "all"; renderOwnerWords(); };
  account.onchange = () => { ownerAccount = account.value; renderOwnerWords(); };
  bar.append(langLabel, accountLabel);
  host.append(bar);
  pool.filter((record) => ownerAccount === "all" || record.id === ownerAccount).forEach((record) => {
    const form = document.createElement("form");
    form.className = "owner-word stack";
    const title = document.createElement("h3");
    title.textContent = `${record.expression} · ${record.language}`;
    form.append(title);
    [["expression", "Word", record.expression], ["meaning", "Meaning", record.meaning], ["example", "Example", record.example], ["emotion", "Emotion", record.feeling], ["context", "Context", record.context], ["intention", "Intention", record.intention], ["youtube", "Unlisted YouTube link", record.youtube || ""]].forEach(([name, label, value]) => {
      const wrap = document.createElement("label");
      wrap.textContent = label;
      const field = document.createElement(name === "expression" || name === "youtube" ? "input" : "textarea");
      field.name = name;
      field.value = value || "";
      wrap.append(field);
      form.append(wrap);
    });
    const button = document.createElement("button");
    button.className = "btn";
    button.type = "submit";
    button.textContent = "Save this account";
    form.append(button);
    form.onsubmit = (event) => {
      event.preventDefault();
      record.expression = form.expression.value.trim() || record.expression;
      record.meaning = form.meaning.value.trim();
      record.example = form.example.value.trim();
      record.feeling = form.emotion.value.trim();
      record.context = form.context.value.trim();
      record.intention = form.intention.value.trim();
      record.youtube = form.youtube.value.trim();
      save();
      document.getElementById("owner-note").textContent = "Saved " + record.expression + " on this browser.";
      renderOwnerWords();
    };
    host.append(form);
  });
}
async function createId() {
  const id = freshId();
  const list = knownIds();
  list.push({ id, pass: await sha(id), passIsId: true, name: "", contact: false, contactHow: "", similar: false, reveal: false });
  localStorage.setItem(KEY + "-ids", JSON.stringify(list));
  const note = document.getElementById("welcome-note");
  if (note) note.textContent = "Your ID was saved on your account. It is not shown on the main page. For now the passphrase is that user ID.";
  enterAs(id, "profile");
}
document.getElementById("guest")?.addEventListener("click", () => enterAs("guest"));
document.getElementById("make")?.addEventListener("click", () => createId());
document.getElementById("make-from-add")?.addEventListener("click", () => createId());
document.getElementById("login-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.getElementById("login-id").value.trim();
  const pass = document.getElementById("login-pass").value;
  if (id.toLowerCase() === "darkstone007" && pass === "atlas-owner") { openOwner(); return; }
  const found = knownIds().find((item) => item.id === id.toUpperCase() || item.id === id);
  const attempts = [await sha(pass), await sha(pass.toUpperCase())];
  if (!found || (found.pass && !attempts.includes(found.pass))) { document.getElementById("welcome-note").textContent = "That ID and passphrase do not match a record made here."; return; }
  enterAs(found.id);
});
document.getElementById("who")?.addEventListener("click", () => {
  if (sessionStorage.getItem("atlas-open") === "1") show("profile");
});
document.getElementById("logout")?.addEventListener("click", () => {
  sessionStorage.removeItem("atlas-open");
  who();
});
document.getElementById("owner-edit")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const next = {
    welcome: document.getElementById("copy-welcome").value.trim(),
    title: document.getElementById("copy-title").value.trim() || "What this is",
    paragraphs: document.getElementById("copy-body").value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean),
    how: document.getElementById("copy-how").value.split("\n").map((item) => item.trim()).filter(Boolean),
  };
  localStorage.setItem("meaning-atlas-site-v3", JSON.stringify(next));
  const lede = document.querySelector("#welcome .lede");
  if (lede && next.welcome) lede.textContent = next.welcome;
  document.getElementById("owner-note").textContent = "The site text is saved on this browser.";
});
document.getElementById("owner-leave")?.addEventListener("click", () => {
  sessionStorage.removeItem("atlas-owner");
  who();
});
document.getElementById("clear-search")?.addEventListener("click", () => {
  document.getElementById("search").value = "";
  renderWeb();
});
document.querySelectorAll("#add input[type=file]").forEach((input) => {
  input.addEventListener("change", () => {
    const host = document.getElementById("previews");
    const name = input.name;
    host.querySelector(`[data-file="${name}"]`)?.remove();
    const file = input.files[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      input.value = "";
      document.getElementById("add-note").textContent = `${file.name} is ${(file.size / 1_000_000).toFixed(1)} MB. The maximum is 1.5 MB, so it was not added. The rest of the form is still here. Send the file to the owner, or paste an unlisted YouTube link.`;
      return;
    }
    const box = document.createElement("p");
    box.dataset.file = name;
    box.textContent = `${name}: ${file.name} · ${(file.size / 1_000_000).toFixed(2)} MB`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn";
    remove.textContent = "Remove";
    remove.onclick = () => { input.value = ""; box.remove(); };
    box.append(remove);
    host.append(box);
  });
});
document.getElementById("shelf-search")?.addEventListener("input", renderShelves);
setupLabels();
const opening = document.querySelector("#welcome .lede");
if (opening) opening.textContent = siteCopy().welcome;
who();
show("web");
window.addEventListener("resize", () => { if (view === "web") renderWeb(); });
