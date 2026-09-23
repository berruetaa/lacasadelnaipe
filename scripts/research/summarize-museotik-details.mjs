import { readFile } from "node:fs/promises";

const path =
  process.argv.find((argument) => argument.startsWith("--input="))?.slice("--input=".length) ??
  "data/research/batches/museotik-fournier-2026-09-23/item-details.jsonl";
const text = await readFile(path, "utf8");
const rows = text
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${path}:${index + 1}: ${error.message}`);
    }
  });

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(?<=\p{L})\.(?=\p{L}|$)/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const countPresent = (field) => rows.filter((row) => Boolean(row[field])).length;
const highInformationFields = [
  "title",
  "otherDenominations",
  "frontDescription",
  "backDescription",
  "date",
  "authorship",
];
const highInformation = rows.filter((row) => highInformationFields.every((field) => row[field]));
const profileFields = ["title", "date", "authorship", "frontDescription", "backDescription"];
const profiles = new Set(
  highInformation.map((row) => JSON.stringify(profileFields.map((field) => normalize(row[field])))),
);
const regions = new Map();
for (const row of rows) {
  const region = row.otherDenominations?.match(/^(.*?)\s+\d{5}(?:\s|$)/)?.[1]?.trim();
  const name = region || "unknown";
  const key = normalize(name);
  const previous = regions.get(key) ?? { name, count: 0 };
  previous.count += 1;
  regions.set(key, previous);
}

console.log(
  JSON.stringify(
    {
      records: rows.length,
      populated: Object.fromEntries(
        [
          "title",
          "inventoryNumber",
          "otherDenominations",
          "authorship",
          "techniques",
          "materials",
          "dimensions",
          "theme",
          "frontDescription",
          "backDescription",
          "date",
          "period",
        ].map((field) => [field, countPresent(field)]),
      ),
      highInformationRecords: highInformation.length,
      distinctNormalizedProfiles: profiles.size,
      exactProfileCollisions: highInformation.length - profiles.size,
      regionCounts: Object.fromEntries(
        [...regions.values()]
          .sort((left, right) => left.name.localeCompare(right.name))
          .map(({ name, count }) => [name, count]),
      ),
    },
    null,
    2,
  ),
);
