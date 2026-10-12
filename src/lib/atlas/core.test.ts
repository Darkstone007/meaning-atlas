import assert from "node:assert/strict";
import test from "node:test";
import { connections, consentFromCell, isDisplayed, parseCSV, search, wordKey } from "./core.ts";
import { SEED } from "./seed.ts";

test("same spelling stays two accounts when community labels differ", () => {
  const [ndeye, khadidjatou, lana] = SEED;
  assert.equal(ndeye.expression, khadidjatou.expression);
  assert.notEqual(wordKey(ndeye), wordKey(khadidjatou));
  assert.notEqual(wordKey(ndeye), wordKey(lana));
});

test("emotion links the two Massa accounts on care and not the proverb", () => {
  const edges = connections(SEED, "emotion");
  assert.equal(edges.length, 1);
  assert.deepEqual(edges[0].shared, ["care"]);
  assert.equal(edges[0].basis, "exact shared labels");
});

test("intention links comfort and does not treat approval as the same purpose", () => {
  const edges = connections(SEED, "intention");
  assert.equal(edges.length, 1);
  assert.deepEqual(edges[0].shared, ["comfort"]);
});

test("context can link on friends without claiming equivalent meaning", () => {
  const edges = connections(SEED, "context");
  assert.equal(edges.length, 3);
  assert.ok(edges.every((edge) => edge.shared.includes("friends")));
});

test("search finds a contributor's own wording", () => {
  const found = search(SEED, "miskīn");
  assert.equal(found.length, 0);
  assert.equal(search(SEED, "مِسْكِين").length, 1);
  assert.equal(search(SEED, "debt love").length, 1);
  assert.equal(search(SEED, "wolof massa").length, 2);
});

test("seed stores no contact details and only display-cleared writing", () => {
  const blob = JSON.stringify(SEED);
  assert.equal(/@|whatsapp|\+\d{6,}/i.test(blob), false);
  assert.equal(SEED.every(isDisplayed), true);
  assert.equal(SEED.some((record) => record.consent.informOnly), false);
});

test("consent cell withholds a response that refuses display", () => {
  const consent = consentFromCell(
    "Please use my responses only to inform the project, without displaying or playing them.",
  );
  assert.equal(consent.informOnly, true);
  assert.equal(consent.publicWritten, false);
});

test("consent cell keeps written public permission and recording separately", () => {
  const consent = consentFromCell(
    "My written responses can be included in class presentations., My written responses can be included in the public visualization or artwork., My recording can be played in class presentations., My recording can be included in the public visualization or artwork.",
  );
  assert.equal(consent.publicWritten, true);
  assert.equal(consent.classWritten, true);
  assert.equal(consent.publicRecording, true);
  assert.equal(consent.informOnly, false);
});

test("quoted CSV keeps commas and skips nothing structural", () => {
  const rows = parseCSV('Expression,Meaning\n"Čist račun, duga","clear debt"\n');
  assert.equal(rows[1][0], "Čist račun, duga");
  assert.equal(rows[1][1], "clear debt");
});
