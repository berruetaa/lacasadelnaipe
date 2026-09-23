import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const [key, inlineValue] = process.argv[index].split("=", 2);
  if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
  args.set(key.slice(2), inlineValue ?? process.argv[++index] ?? true);
}

const batchDirectory = resolve(
  String(args.get("batch-dir") ?? "data/research/batches/museotik-fournier-2026-09-23"),
);
const candidatesPath = resolve(batchDirectory, "candidates.jsonl");
const batchPath = resolve(batchDirectory, "batch.json");
const sourceId = String(args.get("source-id") ?? "src:museotik-fournier-catalog");
const endpoint = "https://museotik.euskadi.eus/ad83aMuseotikPublicaWar/explora/buscarColeccion";
const museumId = String(args.get("museum-id") ?? "2");
const objectTypeId = String(args.get("object-type-id") ?? "4427");
const pageSize = Number(args.get("page-size") ?? 500);
if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) {
  throw new Error("--page-size must be an integer from 1 to 500.");
}

async function jsonl(path, optional = false) {
  try {
    return (await readFile(path, "utf8"))
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          throw new Error(`${path}:${index + 1}: ${error.message}`);
        }
      });
  } catch (error) {
    if (optional && error.code === "ENOENT") return [];
    throw error;
  }
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function makeForm(page) {
  const form = new FormData();
  const fields = {
    idioma: "es",
    textoLibre: "",
    idMuseo: museumId,
    idEpoca: "",
    idArtista: "",
    idMateria: "",
    idFondo: "",
    idTema: "",
    idObjeto: objectTypeId,
    idEstilo: "",
    idLocalizacion: "",
    idTecnica: "",
    idEtiqueta: "",
    idClasif: "",
    enExposicion: "",
    titulo: "",
    museo: "",
    artista: "",
    generoArtista: "",
    fondo: "",
    numeroInventario: "",
    tema: "",
    objeto: "",
    materia: "",
    epoca: "",
    tipoSugerencia: "",
    idSugerencia: "",
    numPagina: String(page),
    elementosPagina: String(pageSize),
  };
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}

async function fetchPage(page) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: makeForm(page),
        headers: {
          "User-Agent":
            "lacasadelnaipe-research/0.1 (public museum metadata; contact through repository)",
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`MUSEOTIK page ${page} returned HTTP ${response.status}`);
      const value = JSON.parse(await response.text());
      if (
        !Array.isArray(value.listaColeccion) ||
        !Number.isInteger(value.numPaginas) ||
        !Number.isInteger(value.numElementos)
      ) {
        throw new Error(`Unexpected MUSEOTIK search response for page ${page}`);
      }
      return value;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw lastError;
}

const [batchText, oldCandidates, oldCoverage, itemDetails] = await Promise.all([
  readFile(batchPath, "utf8"),
  jsonl(candidatesPath, true),
  jsonl(resolve(batchDirectory, "coverage.jsonl"), true),
  jsonl(resolve(batchDirectory, "item-details.jsonl"), true),
]);
const batch = JSON.parse(batchText);
const oldByRecordId = new Map(
  oldCandidates.map((candidate) => [candidate.sourceRecordId, candidate]),
);
const firstPage = await fetchPage(1);
const allRows = [...firstPage.listaColeccion];
for (let page = 2; page <= firstPage.numPaginas; page += 1) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const result = await fetchPage(page);
  if (
    result.numElementos !== firstPage.numElementos ||
    result.numPaginas !== firstPage.numPaginas
  ) {
    throw new Error(
      "MUSEOTIK search result count changed during pagination; rerun to avoid an inconsistent snapshot.",
    );
  }
  allRows.push(...result.listaColeccion);
}
if (allRows.length !== firstPage.numElementos) {
  throw new Error(
    `Expected ${firstPage.numElementos} list results but retrieved ${allRows.length}.`,
  );
}

const coids = allRows.map((row) => String(row.coid));
if (new Set(coids).size !== allRows.length)
  throw new Error("MUSEOTIK returned duplicate collection object IDs.");
const retrievedAt = new Date().toISOString();
const candidates = allRows.map((rawRecord) => {
  const sourceRecordId = `museotik-ca-${rawRecord.coid}`;
  const prior = oldByRecordId.get(sourceRecordId);
  const title = String(
    rawRecord.cotituloC ?? rawRecord.cotituloE ?? `MUSEOTIK record ${rawRecord.coid}`,
  ).trim();
  const dateLabel = rawRecord.cofechaC ? String(rawRecord.cofechaC).trim() : null;
  const url = `https://museotik.euskadi.eus/contenidos/cultural_asset/museotik_ca_${rawRecord.coid}/es_def/index.shtml`;
  return {
    id: prior?.id ?? `candidate:${sourceRecordId}`,
    batchId: batch.id,
    sourceId,
    sourceRecordId,
    sourceRecordUrl: url,
    status: prior?.status ?? "candidate",
    title,
    aliases: prior?.aliases ?? [],
    dateLabel,
    inventoryNumber: rawRecord.coninv ? String(rawRecord.coninv) : null,
    manufacturerLabel: prior?.manufacturerLabel ?? null,
    fingerprint: `${normalize(title)}|${normalize(dateLabel)}`,
    rawRecord,
    acceptedReferencePublicId: prior?.acceptedReferencePublicId ?? null,
    mergedIntoCandidateId: prior?.mergedIntoCandidateId ?? null,
    dispositionNote: prior?.dispositionNote ?? null,
  };
});

const nextBatch = {
  ...batch,
  scope: `Registros MUSEOTIK del Museo Fournier de Naipes de Álava cuyo tipo de objeto es Baraja; ${allRows.length} resultados recuperados en ${firstPage.numPaginas} páginas. Cada fila es un registro de museo y todavía no equivale automáticamente a una referencia LCDN distinta.`,
  status: batch.status ?? "review",
  finishedAt: retrievedAt,
  method: `POST al endpoint público ${endpoint} con idioma=es, idMuseo=${museumId}, idObjeto=${objectTypeId}, elementosPagina=${pageSize} y numPagina=1..${firstPage.numPaginas}. Cada coid se conserva como candidato con su número de inventario y título originales.`,
};
const nextCoverage = [
  {
    id: oldCoverage[0]?.id ?? `coverage:${batch.slug}`,
    batchId: batch.id,
    sourceId,
    scope: `Museo Fournier de Naipes de Álava · tipo de objeto Baraja (idObjeto=${objectTypeId})`,
    strategy:
      "Recorrer todas las páginas devueltas por la búsqueda institucional filtrada por museo y tipo de objeto, sin filtros de título.",
    query: {
      endpoint,
      language: "es",
      museumId: Number(museumId),
      objectTypeId: Number(objectTypeId),
      pageSize,
    },
    expectedCount: firstPage.numElementos,
    retrievedCount: candidates.length,
    pagesReviewed: `Resultados de búsqueda recuperados: 1–${firstPage.numPaginas}; fichas individuales recuperadas: ${itemDetails.length}`,
    completedAt: retrievedAt,
    notes: `La cobertura demuestra que se recuperó la lista de ${candidates.length} resultados del endpoint. Cada fila sigue siendo candidata; sólo ${itemDetails.length} fichas individuales han pasado revisión catalográfica documentada.`,
  },
];
const manifest = {
  source: "Museotik / Museo Fournier de Naipes de Álava",
  endpoint,
  query: {
    language: "es",
    museumId: Number(museumId),
    objectTypeId: Number(objectTypeId),
    pageSize,
  },
  retrievedAt,
  reportedRecordCount: firstPage.numElementos,
  records: candidates.length,
  pages: firstPage.numPaginas,
};

async function writeAtomic(path, contents) {
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, contents);
  await rename(temporaryPath, path);
}

await mkdir(batchDirectory, { recursive: true });
await Promise.all([
  writeAtomic(candidatesPath, `${candidates.map((row) => JSON.stringify(row)).join("\n")}\n`),
  writeAtomic(batchPath, `${JSON.stringify(nextBatch, null, 2)}\n`),
  writeAtomic(
    resolve(batchDirectory, "coverage.jsonl"),
    `${nextCoverage.map((row) => JSON.stringify(row)).join("\n")}\n`,
  ),
  writeAtomic(resolve(batchDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`),
]);
console.log(`Retrieved ${candidates.length} MUSEOTIK candidates in ${firstPage.numPaginas} pages.`);
console.log(
  `${candidates.filter((candidate) => candidate.status === "accepted").length} remain accepted; previous candidate decisions were preserved.`,
);
