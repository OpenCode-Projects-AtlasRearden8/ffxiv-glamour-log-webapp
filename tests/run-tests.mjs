import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "index.html"), "utf8");

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (scripts.length === 0) {
  console.error("No inline <script> blocks found in index.html");
  process.exit(1);
}

const bundle = scripts.join("\n;\n");
let core;
try {
  core = new Function(bundle + "\n;return globalThis.GLAMOUR_CORE;")();
} catch (err) {
  console.error("Failed to evaluate the app's inline scripts:", err);
  process.exit(1);
}

const required = [
  "normalizePieceName",
  "findCrossSetDups",
  "findWithinSetDups",
  "buildShoppingList",
  "collectTags",
];
for (const name of required) {
  if (typeof core[name] !== "function") {
    console.error(`GLAMOUR_CORE is missing function: ${name}`);
    process.exit(1);
  }
}

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed += 1;
    failures.push({ name, err });
    console.error(`  FAIL ${name}`);
    console.error(`       ${err && err.message ? err.message : err}`);
  }
}

function mkOutfit(id, job, plate, pieceSpecs, tags) {
  return {
    id,
    job,
    plate,
    pieces: pieceSpecs.map(([slot, name, dye, owned]) => ({
      slot,
      name: name || "",
      dye: dye || "",
      owned: owned !== false,
    })),
    tags: tags || [],
    screenshot: "",
    createdAt: "",
    updatedAt: "",
  };
}

const S = core.SLOT_NAMES;
const W = S[0], H = S[1], B = S[2], HA = S[3], L = S[4], F = S[5];

console.log(`Running glamour log dup-detection tests (Node ${process.version})\n`);

console.log("normalizePieceName");
test("trims and lowercases", () => {
  if (core.normalizePieceName("  Wanderer's Circlet ") !== "wanderer's circlet") {
    throw new Error("expected trimmed lowercase key");
  }
});
test("collapses inner whitespace", () => {
  if (core.normalizePieceName("Wanderer's   Circlet") !== "wanderer's circlet") {
    throw new Error("expected collapsed whitespace");
  }
});
test("strips dye annotations in parentheses", () => {
  if (core.normalizePieceName("Wanderer's Circlet (Snow White)") !== "wanderer's circlet") {
    throw new Error("expected parenthetical dye annotation to be ignored");
  }
});
test("returns empty for blank or non-string values", () => {
  if (core.normalizePieceName("   ") !== "" || core.normalizePieceName("") !== "") {
    throw new Error("expected empty key");
  }
  if (core.normalizePieceName(null) !== "" || core.normalizePieceName(42) !== "") {
    throw new Error("expected empty key for non-strings");
  }
});

console.log("\nfindCrossSetDups");
test("flags one piece shared by two plates", () => {
  const outfits = [
    mkOutfit("a", "White Mage", "Raid Night", [[H, "Wanderer's Circlet", "", true]]),
    mkOutfit("b", "Dark Knight", "Spooky Hour", [[H, "Wanderer's Circlet", "", true]]),
  ];
  const dups = core.findCrossSetDups(outfits);
  if (dups.length !== 1) throw new Error(`expected 1 dup group, got ${dups.length}`);
  if (dups[0].sets.length !== 2) throw new Error(`expected 2 sets, got ${dups[0].sets.length}`);
  if (dups[0].sets[0].plate !== "Raid Night" || dups[0].sets[1].plate !== "Spooky Hour") {
    throw new Error("sets should reference both plates");
  }
});
test("clean sets produce no warnings", () => {
  const outfits = [
    mkOutfit("a", "White Mage", "Raid Night", [[H, "Circlet of Healing"], [B, "Robe of Healing"]]),
    mkOutfit("b", "Dark Knight", "Spooky Hour", [[H, "Helmet of Fending"], [B, "Mail of Fending"]]),
  ];
  if (core.findCrossSetDups(outfits).length !== 0) throw new Error("expected no dup groups");
});
test("treats dyed variants as the same underlying piece", () => {
  const outfits = [
    mkOutfit("a", "Scholar", "Cozy", [[H, "Wanderer's Circlet (Celeste Green)"]]),
    mkOutfit("b", "Dark Knight", "Noir", [[H, "wanderer's   circlet"]]),
  ];
  const dups = core.findCrossSetDups(outfits);
  if (dups.length !== 1) throw new Error("dyed variant should still count as a dup");
});
test("counts a piece shared across three plates", () => {
  const outfits = ["a", "b", "c"].map((id, i) =>
    mkOutfit(id, `Job ${i}`, `Plate ${i}`, [[B, "Saintly Robe"]])
  );
  const dups = core.findCrossSetDups(outfits);
  if (dups.length !== 1 || dups[0].sets.length !== 3) {
    throw new Error("expected one group spanning three plates");
  }
});
test("counts each plate once even if the piece appears twice inside it", () => {
  const outfits = [
    mkOutfit("a", "White Mage", "Odd One", [
      [H, "Wanderer's Circlet"],
      [B, "Wanderer's Circlet"],
    ]),
    mkOutfit("b", "Dark Knight", "Other One", [[H, "Wanderer's Circlet"]]),
  ];
  const dups = core.findCrossSetDups(outfits);
  if (dups.length !== 1 || dups[0].sets.length !== 2) {
    throw new Error("within-set repeat should not inflate cross-set count");
  }
});
test("ignores blank and whitespace-only piece names", () => {
  const outfits = [
    mkOutfit("a", "White Mage", "Blank A", [[H, "   "], [B, ""], [L, null]]),
    mkOutfit("b", "Dark Knight", "Blank B", [[H, ""], [B, "    "]]),
  ];
  if (core.findCrossSetDups(outfits).length !== 0) throw new Error("blanks must be ignored");
});
test("matches case-insensitively across plates", () => {
  const outfits = [
    mkOutfit("a", "White Mage", "A", [[W, "Turali Cane"]]),
    mkOutfit("b", "White Mage", "B", [[W, "turali cane"]]),
  ];
  if (core.findCrossSetDups(outfits).length !== 1) throw new Error("expected case-insensitive dup");
});
test("handles missing or malformed input gracefully", () => {
  if (core.findCrossSetDups([]).length !== 0) throw new Error("empty list should yield no dups");
  if (core.findCrossSetDups(null).length !== 0) throw new Error("null should yield no dups");
  if (core.findCrossSetDups([null, 42, {}]).length !== 0) {
    throw new Error("malformed outfits should be skipped");
  }
});

console.log("\nfindWithinSetDups");
test("flags the same piece listed in two slots of one plate", () => {
  const outfit = mkOutfit("a", "Scholar", "Odd", [
    [W, "Expeditioner's Codex"],
    [H, "Expeditioner's Codex"],
    [B, "Some Robe"],
  ]);
  const dups = core.findWithinSetDups(outfit);
  if (dups.length !== 1) throw new Error(`expected 1 within-set dup, got ${dups.length}`);
  if (dups[0].slots.length !== 2) throw new Error("expected two slot references");
});
test("passes on unique pieces within a plate", () => {
  const outfit = mkOutfit("a", "Scholar", "Fine", [
    [W, "Codex"], [H, "Circlet"], [B, "Robe"], [HA, "Gloves"], [L, "Hose"], [F, "Shoes"],
  ]);
  if (core.findWithinSetDups(outfit).length !== 0) throw new Error("expected no within-set dups");
});
test("handles malformed outfits gracefully", () => {
  if (core.findWithinSetDups(null).length !== 0) throw new Error("null should yield no dups");
  if (core.findWithinSetDups({ id: "x", pieces: "not-an-array" }).length !== 0) {
    throw new Error("bad pieces should yield no dups");
  }
});

console.log("\nbuildShoppingList");
test("collects missing pieces with plate references", () => {
  const outfits = [
    mkOutfit("a", "White Mage", "Raid Night", [[L, "Hallowedsky Breeches of Healing", "", false]]),
    mkOutfit("b", "Scholar", "Cozy", [[F, "Hallowedsky Shoes of Healing", "", false]]),
  ];
  const list = core.buildShoppingList(outfits);
  if (list.length !== 2) throw new Error(`expected 2 items, got ${list.length}`);
  if (list[0].refs[0].plate !== "Raid Night") throw new Error("refs should cite the plate");
});
test("excludes owned pieces and blank names", () => {
  const outfits = [
    mkOutfit("a", "White Mage", "Full", [
      [H, "Owned Circlet", "", true],
      [B, "Also Owned", "", true],
      [L, "", "", false],
    ]),
  ];
  if (core.buildShoppingList(outfits).length !== 0) throw new Error("nothing should be missing");
});
test("merges the same missing piece across plates and counts references", () => {
  const outfits = [
    mkOutfit("a", "White Mage", "A", [[F, "Fancy Boots", "", false]]),
    mkOutfit("b", "Dark Knight", "B", [[F, "fancy   boots (Soot Black)", "", false]]),
  ];
  const list = core.buildShoppingList(outfits);
  if (list.length !== 1) throw new Error("same missing piece should merge into one row");
  if (list[0].count !== 2 || list[0].refs.length !== 2) throw new Error("expected 2 references");
});
test("returns empty when everything is owned or input is malformed", () => {
  const owned = mkOutfit("a", "White Mage", "A", [[H, "Circlet", "", true]]);
  if (core.buildShoppingList([owned]).length !== 0) throw new Error("expected empty list");
  if (core.buildShoppingList(null).length !== 0) throw new Error("null should yield empty list");
});

console.log("\ncollectTags");
test("collects unique sorted tags across outfits", () => {
  const outfits = [
    mkOutfit("a", "White Mage", "A", [], ["raid night", "casual"]),
    mkOutfit("b", "Dark Knight", "B", [], ["season", "Raid Night"]),
  ];
  const tags = core.collectTags(outfits);
  const expected = ["casual", "raid night", "season"];
  if (JSON.stringify(tags) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(tags)}`);
  }
});
test("ignores blank tags and malformed outfits", () => {
  if (core.collectTags([{ tags: ["  ", ""] }, null, {}]).length !== 0) {
    throw new Error("expected no tags");
  }
});

console.log("\nrealistic scenario");
test("sample loadout: one cross-set dup and a merged-free shopping list", () => {
  const outfits = [
    mkOutfit("whm", "White Mage", "Raid Night Heals", [
      [W, "Turali Cane", "", true],
      [H, "Ascension Circlet of Healing", "", true],
      [B, "Saintly Robe", "Loam Brown", true],
      [L, "Hallowedsky Breeches of Healing", "Soot Black", false],
      [F, "Ascension Sandals of Healing", "", true],
    ], ["raid night"]),
    mkOutfit("sch", "Scholar", "Cozy Weekend", [
      [W, "Expeditioner's Codex", "", true],
      [H, "Wanderer's Circlet", "Celeste Green", true],
      [B, "Woad Skydancer's Robe", "", true],
      [F, "Hallowedsky Shoes of Healing", "", false],
    ], ["casual"]),
    mkOutfit("drk", "Dark Knight", "Stars and Shadows", [
      [W, "Void Zeta Greatsword", "", true],
      [H, "Wanderer's Circlet (Snow White)", "", true],
      [B, "Warg Coat", "Ink Blue", true],
      [L, "Warg Breeches", "", true],
      [F, "Warg Sabatons", "Soot Black", false],
    ], ["season"]),
  ];
  const dups = core.findCrossSetDups(outfits);
  if (dups.length !== 1) throw new Error(`expected exactly 1 shared piece, got ${dups.length}`);
  if (dups[0].key !== "wanderer's circlet") throw new Error("shared piece should be the circlet");
  if (dups[0].sets.length !== 2) throw new Error("circlet should span exactly 2 plates");
  const list = core.buildShoppingList(outfits);
  if (list.length !== 3) throw new Error(`expected 3 missing pieces, got ${list.length}`);
  if (core.collectTags(outfits).join(",") !== "casual,raid night,season") {
    throw new Error("tag collection mismatch");
  }
});

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("\nFailures:");
  for (const f of failures) console.error(`- ${f.name}`);
  process.exit(1);
}
