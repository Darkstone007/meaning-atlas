const FIELDS = ["expression", "languages", "community", "meaning", "example", "feeling", "context", "intention", "rephrasing", "change", "withheld"];

function normalize(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

function tags(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(";");
  return [...new Set(list.map(normalize).filter(Boolean))].slice(0, 20);
}

function wordKey(record) {
  const language = record.language || record.languages || "";
  return JSON.stringify([normalize(record.expression), normalize(language), normalize(record.community)]);
}

function layerTags(record, layer) {
  return tags(record.tags?.[layer] || []);
}

function connections(records, layer) {
  if (!["emotion", "context", "intention"].includes(layer)) return [];
  const edges = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const shared = layerTags(records[i], layer).filter((tag) => layerTags(records[j], layer).includes(tag));
      if (shared.length) edges.push({ source: records[i].id, target: records[j].id, shared });
    }
  }
  return edges;
}

function searchRecords(records, query) {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (!terms.length) return records;
  return records.filter((record) => {
    const haystack = normalize([...FIELDS.map((key) => record[key]), ...(record.tags ? Object.values(record.tags).flat() : [])].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

function grouped(records) {
  const groups = new Map();
  records.forEach((record) => {
    const key = wordKey(record);
    if (!groups.has(key)) {
      groups.set(key, { key, expression: record.expression, language: record.language || record.languages || "", community: record.community, accounts: [] });
    }
    groups.get(key).accounts.push(record);
  });
  return [...groups.values()];
}
