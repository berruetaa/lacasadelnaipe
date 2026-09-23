import { readFile, writeFile } from "node:fs/promises";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const [key, value] = process.argv[index].split("=", 2);
  if (key.startsWith("--")) args.set(key.slice(2), value ?? process.argv[++index]);
}

const inputPath =
  args.get("input") ?? "data/research/batches/museotik-fournier-2026-09-23/candidates.jsonl";
const outputPath =
  args.get("output") ?? "data/research/batches/museotik-fournier-2026-09-23/item-details.jsonl";
const ids = new Set(
  (args.get("ids") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const allCandidates = args.has("all-candidates");
if (ids.size === 0 && !allCandidates)
  throw new Error("Pass --ids=COID,COID,... or explicitly --all-candidates.");

const candidates = (await readFile(inputPath, "utf8"))
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const selected = allCandidates
  ? candidates
  : candidates.filter((candidate) => ids.has(String(candidate.rawRecord.coid)));
const missing = [...ids].filter(
  (id) => !selected.some((candidate) => String(candidate.rawRecord.coid) === id),
);
if (missing.length)
  throw new Error(`Unknown Museotik collection record IDs: ${missing.join(", ")}`);

function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([\da-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&Aacute;/g, "Á")
    .replace(/&Eacute;/g, "É")
    .replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&Ntilde;/g, "Ñ")
    .replace(/&ordm;/g, "º")
    .replace(/&ordf;/g, "ª")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function stripMarkup(html) {
  return decodeEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function valueBetween(text, label, nextLabels) {
  const start = text.indexOf(label);
  if (start < 0) return null;
  const valueStart = start + label.length;
  const ends = nextLabels
    .map((next) => text.indexOf(next, valueStart))
    .filter((value) => value >= 0);
  const end = ends.length ? Math.min(...ends) : text.length;
  return text.slice(valueStart, end).trim() || null;
}

function summarize(html, candidate) {
  const text = stripMarkup(html);
  const delimiters = [
    "Objeto:",
    "Otras denominaciones:",
    "Autoría:",
    "Técnicas:",
    "Materias:",
    "Dimensiones:",
    "Tema:",
    "Anverso:",
    "Reverso:",
    "Fecha:",
    "Época:",
    "Descripción",
    "Exposiciones",
    "Referencias bibliográficas",
  ];
  return {
    id: `museotik-ca:${candidate.sourceRecordId}`,
    sourceId: candidate.sourceId,
    sourceRecordId: candidate.sourceRecordId,
    sourceRecordUrl: candidate.sourceRecordUrl,
    httpStatus: 200,
    retrievedAt: new Date().toISOString(),
    title: candidate.title,
    inventoryNumber:
      valueBetween(text, "Nº Inventario/Siglas:", ["Objeto:"]) ?? candidate.inventoryNumber,
    objectType: valueBetween(text, "Objeto:", ["Otras denominaciones:"]),
    otherDenominations: valueBetween(text, "Otras denominaciones:", [
      "Autoría:",
      "Técnicas:",
      "Materias:",
      "Dimensiones:",
      "Tema:",
      "Anverso:",
      "Reverso:",
      "Fecha:",
      "Época:",
    ]),
    authorship: valueBetween(text, "Autoría:", [
      "Técnicas:",
      "Materias:",
      "Dimensiones:",
      "Tema:",
      "Anverso:",
      "Reverso:",
    ]),
    techniques: valueBetween(text, "Técnicas:", ["Materias:"]),
    materials:
      valueBetween(text, "Materias:", [
        "Dimensiones:",
        "Tema:",
        "Anverso:",
        "Reverso:",
        "Fecha:",
        "Época:",
      ])?.slice(0, 250) ?? null,
    dimensions:
      valueBetween(text, "Dimensiones:", [
        "Tema:",
        "Anverso:",
        "Reverso:",
        "Fecha:",
        "Época:",
      ])?.slice(0, 300) ?? null,
    theme:
      valueBetween(text, "Tema:", ["Anverso:", "Reverso:", "Fecha:", "Época:"])?.slice(0, 500) ??
      null,
    frontDescription: valueBetween(text, "Anverso:", ["Reverso:"])?.slice(0, 400) ?? null,
    backDescription: valueBetween(text, "Reverso:", ["Fecha:"])?.slice(0, 600) ?? null,
    date:
      valueBetween(text, "Fecha:", [
        "Época:",
        "Compartir",
        "Agregar a mi album",
        "Volver",
        "Descripción",
      ])?.slice(0, 100) ?? candidate.dateLabel,
    period:
      valueBetween(text, "Época:", [
        "Compartir",
        "Agregar a mi album",
        "Volver",
        "Descripción",
      ])?.slice(0, 200) ?? null,
    sourceRecordExcerpt: null,
    _labelsFound: delimiters.filter((label) => text.includes(label)),
  };
}

const output = new Array(selected.length);
const errors = [];
let nextIndex = 0;
async function worker() {
  while (true) {
    const index = nextIndex++;
    if (index >= selected.length) return;
    const candidate = selected[index];
    const url = `https://museotik.euskadi.eus/contenidos/cultural_asset/museotik_ca_${candidate.rawRecord.coid}/es_def/index.shtml`;
    let failure = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "lacasadelnaipe-research/0.1 (public museum metadata; contact through repository)",
          },
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        output[index] = summarize(await response.text(), candidate);
        failure = null;
        break;
      } catch (error) {
        failure = error;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
    if (failure)
      errors.push({
        sourceRecordId: candidate.sourceRecordId,
        sourceRecordUrl: candidate.sourceRecordUrl,
        error: String(failure),
      });
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

const concurrency = Number(args.get("concurrency") ?? 4);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) {
  throw new Error("--concurrency must be an integer from 1 to 4 to keep requests bounded.");
}
await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, worker));
const records = output.filter(Boolean);
await writeFile(outputPath, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`);
if (errors.length)
  await writeFile(
    `${outputPath}.errors.jsonl`,
    `${errors.map((row) => JSON.stringify(row)).join("\n")}\n`,
  );
console.log(`Fetched ${records.length}/${selected.length} item records to ${outputPath}`);
if (errors.length)
  throw new Error(
    `${errors.length} item pages failed after four attempts; see ${outputPath}.errors.jsonl`,
  );
