const KEY = "meaning-atlas-pages-v1";
const VOCAB = {
  emotion: ["care", "affection", "joy", "longing", "pride", "frustration", "mixed"],
  context: ["friends", "family", "home", "work", "celebration", "greeting"],
  intention: ["comfort", "approval", "belonging", "humour", "address", "disagreement"]
};
const STORY = [
  ["Meaning", "meaning"],
  ["Feeling", "feeling"],
  ["Context", "context"],
  ["Intention", "intention"],
  ["Rephrasing", "rephrasing"],
  ["What changes", "change"],
  ["When it is held back", "withheld"]
];

let state = load();
let selected = state.records[0]?.id || null;

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && Array.isArray(saved.records)) {
      const ids = new Set(saved.records.map((record) => record.id));
      SEED.forEach((record) => { if (!ids.has(record.id)) saved.records.unshift({ ...record }); });
      saved.people = saved.people || [];
      return saved;
    }
  } catch { /* a fresh archive */ }
  return { session: null, people: [], records: SEED.map((record) => ({ ...record })) };
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

async function sha(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function mintId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "U-";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  bytes.forEach((value) => { id += alphabet[value % alphabet.length]; });
  if (state.people.some((person) => person.id === id) || state.records.some((record) => record.userId === id)) return mintId();
  return id;
}

function gateNote(text, bad = false) {
  const note = document.getElementById("gate-note");
  note.textContent = text;
  note.classList.toggle("bad", bad);
}

function enter(session) {
  state.session = session;
  save();
  document.getElementById("gate").hidden = true;
  document.getElementById("app").hidden = false;
  document.getElementById("who").textContent = session.id + (session.guest ? " · guest" : "");
  show("web");
}

function show(name) {
  ["web", "shelves", "mine", "add"].forEach((view) => {
    document.getElementById("view-" + view).hidden = view !== name;
  });
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  if (name === "web") renderWeb();
  if (name === "shelves") renderShelves();
  if (name === "mine") renderMine();
}

function visibleRecords() {
  return searchRecords(state.records, document.getElementById("search").value);
}

function project(point, yaw, pitch, width, height) {
  const yawRad = yaw * Math.PI / 180, pitchRad = pitch * Math.PI / 180;
  const x1 = point[0] * Math.cos(yawRad) + point[2] * Math.sin(yawRad);
  const z1 = -point[0] * Math.sin(yawRad) + point[2] * Math.cos(yawRad);
  const y1 = point[1] * Math.cos(pitchRad) - z1 * Math.sin(pitchRad);
  const z2 = point[1] * Math.sin(pitchRad) + z1 * Math.cos(pitchRad);
  const depth = 680 / (680 - z2);
  return [width / 2 + x1 * depth, height / 2 + y1 * depth];
}
let yaw = 18, pitch = 12, dragging = null;
function shownId(record) {
  const person = state.people.find((item) => item.id === record.userId);
  return record.reveal || person?.reveal ? record.userId : "";
}
function renderWeb() {
  const visible = visibleRecords();
  const layer = document.getElementById("layer").value;
  const edges = connections(visible, layer);
  const groups = grouped(visible);
  const stage = document.getElementById("stage");
  stage.replaceChildren();
  document.getElementById("count").textContent = visible.length + " of " + state.records.length + " responses · " + edges.length + " shared labels in this layer";
  if (!visible.length) {
    stage.append(Object.assign(document.createElement("p"), { className: "legend", textContent: "Nothing matches that search.", style: "padding:24px" }));
    renderStory(null, edges);
    return;
  }
  const width = stage.clientWidth || 800;
  const height = stage.clientHeight || 460;
  const nodes = [];
  const lines = [];
  groups.forEach((group, index) => {
    const x = width / 2 + (index - (groups.length - 1) / 2) * Math.min(240, (width - 80) / Math.max(groups.length, 1));
    const wordPoint = project([x - width / 2, -120, 0], yaw, pitch, width, height);
    const word = { id: "w" + index, label: group.expression, kind: "word", x: wordPoint[0], y: wordPoint[1], open: group.accounts[0].id };
    nodes.push(word);
    group.accounts.forEach((record, child) => {
      const spread = group.accounts.length === 1 ? 0 : (child - (group.accounts.length - 1) / 2) * 86;
      const point = project([x - width / 2 + spread, 70, 36], yaw, pitch, width, height);
      nodes.push({ id: record.id, label: shownId(record) || "account", kind: "response", x: point[0], y: point[1], open: record.id });
      lines.push([word, nodes[nodes.length - 1], false]);
    });
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  edges.forEach((edge) => {
    const a = byId.get(edge.source);
    const b = byId.get(edge.target);
    if (a && b) lines.push([a, b, true]);
  });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  lines.forEach(([a, b, dashed]) => {
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("stroke", dashed ? "#d7c6e6" : "#7a5a9a");
    line.setAttribute("stroke-width", dashed ? "1.5" : "1.25");
    if (dashed) line.setAttribute("stroke-dasharray", "5 6");
    svg.append(line);
  });
  stage.append(svg);
  nodes.forEach((node) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "node " + node.kind + (node.open === selected ? " on" : "");
    button.textContent = node.label;
    button.style.left = node.x + "px";
    button.style.top = node.y + "px";
    button.onclick = () => { selected = node.open; renderWeb(); };
    stage.append(button);
  });
  renderStory(state.records.find((record) => record.id === selected) || null, edges);
}

function renderStory(record, edges) {
  const box = document.getElementById("story");
  box.replaceChildren();
  if (!record) {
    box.append(Object.assign(document.createElement("p"), { className: "lede", textContent: "Choose a word, then the ID beneath it." }));
    return;
  }
  const title = document.createElement("h2");
  title.textContent = record.expression;
  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = (shownId(record) || "ID hidden") + " · " + record.language + (record.community ? " · " + record.community : "");
  box.append(title, meta);
  STORY.forEach(([label, key]) => {
    const row = document.createElement("div");
    row.className = "pair";
    const name = document.createElement("span");
    name.textContent = label;
    const text = document.createElement("p");
    text.textContent = record[key] || "Not written.";
    row.append(name, text);
    box.append(row);
  });
  if (record.audio) {
    const audio = document.createElement("div");
    audio.className = "pair";
    const audioName = document.createElement("span");
    audioName.textContent = "Audio";
    const audioText = document.createElement("p");
    const player = document.createElement("audio");
    player.controls = true;
    player.src = record.audio;
    audioText.append(player);
    audio.append(audioName, audioText);
    box.append(audio);
  }
  if (record.image) {
    const image = document.createElement("img");
    image.src = record.image;
    image.alt = "";
    box.append(image);
  }
  const related = (edges || []).filter((edge) => edge.source === record.id || edge.target === record.id);
  if (related.length) {
    const row = document.createElement("div");
    row.className = "pair";
    const name = document.createElement("span");
    name.textContent = "Shared label";
    const text = document.createElement("p");
    text.textContent = related.map((edge) => edge.shared.join(", ")).join(" · ");
    row.append(name, text);
    box.append(row);
  }
}

function renderShelves() {
  const host = document.getElementById("shelves");
  host.replaceChildren();
  const groups = grouped(visibleRecords());
  const languages = [...new Set(groups.map((group) => group.language))].filter(Boolean);
  if (!languages.length) {
    host.append(Object.assign(document.createElement("p"), { className: "lede", textContent: "No languages in this search." }));
    return;
  }
  languages.sort((a, b) => a.localeCompare(b, "en")).forEach((language) => {
    const section = document.createElement("section");
    section.className = "shelf";
    const heading = document.createElement("h2");
    heading.textContent = language;
    const books = document.createElement("div");
    books.className = "books";
    groups.filter((group) => normalize(group.language) === normalize(language)).forEach((group) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "book";
      const strong = document.createElement("strong");
      strong.textContent = group.expression;
      const span = document.createElement("span");
      span.textContent = group.accounts.length + (group.accounts.length === 1 ? " response" : " responses");
      button.append(strong, span);
      button.onclick = () => { selected = group.accounts[0].id; show("web"); };
      books.append(button);
    });
    section.append(heading, books);
    host.append(section);
  });
}

function renderMine() {
  const host = document.getElementById("mine");
  host.replaceChildren();
  const mine = state.records.filter((record) => record.userId === state.session.id);
  const heading = document.createElement("h2");
  heading.textContent = mine.length ? "Words kept with " + state.session.id : "Nothing here yet";
  const copy = document.createElement("p");
  copy.className = "lede";
  copy.textContent = mine.length ? "These stay with this ID in this browser." : "Add a word and it will be listed under your ID.";
  host.append(heading, copy);
  const books = document.createElement("div");
  books.className = "books";
  mine.forEach((record) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "book";
    const strong = document.createElement("strong");
    strong.textContent = record.expression;
    const span = document.createElement("span");
    span.textContent = record.language;
    button.append(strong, span);
    button.onclick = () => { selected = record.id; show("web"); };
    books.append(button);
  });
  host.append(books);
}

function setupTags() {
  Object.entries(VOCAB).forEach(([layer, values]) => {
    const host = document.getElementById("tag-" + layer);
    values.forEach((value) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = value;
      input.name = "tag-" + layer;
      label.append(input, document.createTextNode(" " + value));
      host.append(label);
    });
  });
}

document.getElementById("guest").onclick = () => {
  const existing = state.people.find((person) => person.guest && person.id === state.lastGuest);
  if (existing) return enter({ id: existing.id, guest: true });
  const id = mintId();
  state.people.push({ id, guest: true, passHash: "" });
  state.lastGuest = id;
  enter({ id, guest: true });
};

document.getElementById("show-return").onclick = () => {
  document.getElementById("return-form").hidden = false;
  document.getElementById("create-form").hidden = true;
  document.getElementById("made").hidden = true;
};

document.getElementById("show-create").onclick = () => {
  document.getElementById("create-form").hidden = false;
  document.getElementById("return-form").hidden = true;
  document.getElementById("made").hidden = true;
};

document.getElementById("return-form").onsubmit = async (event) => {
  event.preventDefault();
  const id = document.getElementById("return-id").value.trim().toUpperCase();
  const person = state.people.find((item) => item.id === id);
  if (!person || person.guest) return gateNote("That ID is not a saved record on this browser.", true);
  const hash = await sha(document.getElementById("return-pass").value);
  if (hash !== person.passHash) return gateNote("That passphrase does not match.", true);
  enter({ id, guest: false });
};

document.getElementById("create-form").onsubmit = async (event) => {
  event.preventDefault();
  const pass = document.getElementById("create-pass").value;
  if (pass.length < 4) return gateNote("Use at least 4 characters.", true);
  const id = mintId();
  state.people.push({ id, guest: false, passHash: await sha(pass) });
  save();
  document.getElementById("create-form").hidden = true;
  document.getElementById("made").hidden = false;
  document.getElementById("made-id").textContent = id;
  document.getElementById("made-go").onclick = () => enter({ id, guest: false });
  gateNote("");
};

document.getElementById("leave").onclick = () => {
  state.session = null;
  save();
  document.getElementById("app").hidden = true;
  document.getElementById("gate").hidden = false;
};

document.querySelectorAll("[data-view]").forEach((button) => {
  button.onclick = () => show(button.dataset.view);
});
document.getElementById("search").addEventListener("input", renderWeb);
document.getElementById("layer").addEventListener("change", renderWeb);
document.getElementById("add").onsubmit = (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const record = {
    id: crypto.randomUUID(),
    userId: state.session.id,
    expression: "",
    language: "",
    community: "",
    meaning: "",
    example: "",
    feeling: "",
    context: "",
    intention: "",
    rephrasing: "",
    change: "",
    withheld: "",
    tags: { emotion: [], context: [], intention: [] },
    audio: ""
  };
  FIELDS.forEach((key) => { if (form.elements[key]) record[key] = form.elements[key].value.trim(); });
  record.language = String(form.elements.language.value || "").split(";")[0].trim();
  Object.keys(VOCAB).forEach((layer) => {
    record.tags[layer] = [...form.querySelectorAll('[name="tag-' + layer + '"]:checked')].map((input) => input.value);
  });
  state.records.push(record);
  selected = record.id;
  save();
  form.reset();
  show("web");
};

setupTags();
window.addEventListener("resize", () => { if (!document.getElementById("view-web").hidden) renderWeb(); });
if (state.session) enter(state.session);
