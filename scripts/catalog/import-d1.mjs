import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const batchRoot = resolve(root, "data/research/batches");
const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const [key, inlineValue] = process.argv[index].split("=", 2);
  if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
  args.set(key.slice(2), inlineValue ?? process.argv[++index] ?? true);
}

const apply = args.has("apply");
const remote = args.has("remote");
const syncDecisions = args.has("sync-decisions");
if (remote && !apply)
  throw new Error("--remote requires --apply; otherwise only SQL files are generated.");
const maxStatements = Number(args.get("chunk-statements") ?? 150);
if (!Number.isInteger(maxStatements) || maxStatements < 1 || maxStatements > 500) {
  throw new Error("--chunk-statements must be an integer from 1 to 500.");
}

function pnpmInvocation(pnpmArgs) {
  const command = process.env.npm_execpath ? process.execPath : (process.env.PNPM_BIN ?? "pnpm");
  const commandArgs = process.env.npm_execpath
    ? [process.env.npm_execpath, ...pnpmArgs]
    : [...(command === "corepack" ? ["pnpm"] : []), ...pnpmArgs];
  return { command, commandArgs };
}

function runPnpm(pnpmArgs, label) {
  const { command, commandArgs } = pnpmInvocation(pnpmArgs);
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}`);
}

async function jsonl(path) {
  const text = await readFile(path, "utf8");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${path}:${index + 1}: ${error.message}`);
      }
    });
}

function quote(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Cannot write non-finite SQL number: ${value}`);
    return String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function timestamp(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid timestamp: ${value}`);
  return parsed;
}

function insert(
  table,
  columns,
  values,
  updates = columns.filter((column) => column !== "id"),
  conflictTarget = "id",
) {
  const updateSql = updates.length
    ? ` ON CONFLICT(${conflictTarget}) DO UPDATE SET ${updates.map((column) => `${column} = excluded.${column}`).join(", ")}`
    : " ON CONFLICT DO NOTHING";
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.map(quote).join(", ")})${updateSql};`;
}

const [sources, references, assertions, decisions] = await Promise.all([
  jsonl(resolve(root, "data/research/sources.jsonl")),
  jsonl(resolve(root, "data/catalog/references.jsonl")),
  jsonl(resolve(root, "data/catalog/assertions.jsonl")),
  jsonl(resolve(root, "data/research/decisions.jsonl")),
]);
const batchDirectories = (await readdir(batchRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(batchRoot, entry.name))
  .sort();
const batchRows = await Promise.all(
  batchDirectories.map(async (directory) => {
    const batch = JSON.parse(await readFile(resolve(directory, "batch.json"), "utf8"));
    const [candidates, coverage] = await Promise.all([
      jsonl(resolve(directory, "candidates.jsonl")),
      jsonl(resolve(directory, "coverage.jsonl")),
    ]);
    return { batch, candidates, coverage };
  }),
);
if (batchRows.length === 0) throw new Error(`No research batches found in ${batchRoot}`);
const batches = batchRows.map((row) => row.batch);
const batchById = new Map(batches.map((batch) => [batch.id, batch]));
if (batchById.size !== batches.length) throw new Error("Duplicate research batch IDs.");
if (new Set(batches.map((batch) => batch.slug)).size !== batches.length) {
  throw new Error("Duplicate research batch slugs.");
}
const candidates = batchRows.flatMap((row) => row.candidates);
const coverage = batchRows.flatMap((row) => row.coverage);
const batchFor = (id) => {
  const batch = batchById.get(id);
  if (!batch) throw new Error(`Unknown research batch ${id}`);
  return batch;
};
const baseTimestamp = Math.min(...batches.map((batch) => timestamp(batch.startedAt) ?? 0));
const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
if (candidateById.size !== candidates.length)
  throw new Error("Duplicate candidate IDs across research batches.");
const candidateSourceKeys = candidates.map(
  (candidate) => `${candidate.sourceId}\u0000${candidate.sourceRecordId}`,
);
if (new Set(candidateSourceKeys).size !== candidates.length) {
  throw new Error("A source record appears in more than one candidate batch.");
}
const sourceById = new Map(sources.map((source) => [source.id, source]));
if (sourceById.size !== sources.length) throw new Error("Duplicate source IDs.");
const sourceIdByUrl = new Map();
for (const source of sources) {
  if (!source.url) continue;
  const prior = sourceIdByUrl.get(source.url);
  if (prior && prior !== source.id)
    throw new Error(`Sources ${prior} and ${source.id} share URL ${source.url}`);
  sourceIdByUrl.set(source.url, source.id);
}
const referenceByPublicId = new Map(references.map((reference) => [reference.publicId, reference]));
if (referenceByPublicId.size !== references.length)
  throw new Error("Duplicate public reference IDs.");
if (new Set(references.map((reference) => reference.slug)).size !== references.length) {
  throw new Error("Duplicate public reference slugs.");
}
const assertionsBySubject = new Map();
for (const assertion of assertions) {
  if (assertion.subjectType !== "reference") continue;
  const key = `${assertion.subjectId}\u0000${assertion.attribute}`;
  assertionsBySubject.set(key, [...(assertionsBySubject.get(key) ?? []), assertion]);
}
const referenceDbId = (publicId) => `reference:${publicId}`;
const statements = [];

function orderReferencesForSql(allReferences) {
  const ordered = [];
  const available = new Set();
  const pending = [...allReferences];
  while (pending.length) {
    const index = pending.findIndex(
      (reference) => reference.status !== "merged" || available.has(reference.mergedIntoPublicId),
    );
    if (index < 0)
      throw new Error(
        "Cannot order merged reference rows; target is missing or merge graph contains a cycle.",
      );
    const [reference] = pending.splice(index, 1);
    ordered.push(reference);
    available.add(reference.publicId);
  }
  return ordered;
}

function orderCandidatesForSql(allCandidates) {
  const ordered = [];
  const available = new Set();
  const pending = [...allCandidates];
  while (pending.length) {
    const index = pending.findIndex(
      (candidate) =>
        candidate.status !== "merged" || available.has(candidate.mergedIntoCandidateId),
    );
    if (index < 0)
      throw new Error(
        "Cannot order merged candidates; target is missing or merge graph contains a cycle.",
      );
    const [candidate] = pending.splice(index, 1);
    ordered.push(candidate);
    available.add(candidate.id);
  }
  return ordered;
}

function add(statement) {
  statements.push(statement);
}

for (const source of sources) {
  add(
    insert(
      "sources",
      [
        "id",
        "kind",
        "quality",
        "title",
        "organization",
        "creator",
        "citation",
        "url",
        "accessed_at",
        "publication_date",
        "locator",
        "archived_url",
        "rights_note",
        "notes",
        "created_at",
        "updated_at",
      ],
      [
        source.id,
        source.kind,
        source.quality,
        source.title,
        source.organization,
        source.creator,
        source.citation,
        source.url,
        timestamp(source.accessedAt),
        source.publicationDate,
        source.locator,
        source.archivedUrl,
        source.rightsNote,
        source.notes,
        timestamp(source.accessedAt) ?? baseTimestamp,
        timestamp(source.accessedAt) ?? baseTimestamp,
      ],
    ),
  );
}

for (const reference of orderReferencesForSql(references)) {
  const attributes = Object.fromEntries(
    Object.entries(reference).filter(
      ([key]) =>
        ![
          "publicId",
          "slug",
          "title",
          "manufacturer",
          "originCountry",
          "suitSystem",
          "pattern",
          "dateLabel",
          "dateStart",
          "dateEnd",
          "status",
          "mergedIntoPublicId",
          "createdAt",
          "updatedAt",
        ].includes(key),
    ),
  );
  add(
    insert(
      "catalog_references",
      [
        "id",
        "public_id",
        "slug",
        "title",
        "manufacturer",
        "origin_country",
        "suit_system",
        "pattern",
        "date_label",
        "date_start",
        "date_end",
        "status",
        "merged_into_reference_id",
        "attributes_json",
        "created_at",
        "updated_at",
      ],
      [
        referenceDbId(reference.publicId),
        reference.publicId,
        reference.slug,
        reference.title,
        reference.manufacturer,
        reference.originCountry,
        reference.suitSystem,
        reference.pattern,
        reference.dateLabel,
        reference.dateStart,
        reference.dateEnd,
        reference.status,
        reference.mergedIntoPublicId ? referenceDbId(reference.mergedIntoPublicId) : null,
        JSON.stringify(attributes),
        timestamp(reference.createdAt) ?? baseTimestamp,
        timestamp(reference.updatedAt) ?? baseTimestamp,
      ],
      [
        "public_id",
        "slug",
        "title",
        "manufacturer",
        "origin_country",
        "suit_system",
        "pattern",
        "date_label",
        "date_start",
        "date_end",
        "status",
        "merged_into_reference_id",
        "attributes_json",
        "updated_at",
      ],
    ),
  );
  for (const sourceId of reference.evidenceSourceIds) {
    if (!sourceById.has(sourceId))
      throw new Error(`Reference ${reference.publicId} names missing source ${sourceId}`);
    add(
      insert(
        "reference_sources",
        ["reference_id", "source_id", "note"],
        [referenceDbId(reference.publicId), sourceId, "Reference evidence source"],
        [],
      ),
    );
  }
}

const entityMap = new Map();
const referenceEntityLinks = [];
const entityRoles = [
  ["manufacturer", "manufacturer", "manufacturer"],
  ["printer", "printer", "printer"],
  ["publisher", "publisher", "publisher"],
  ["brand", "brand", "brand"],
  ["pattern", "pattern", "classification"],
];
function normalizeName(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
for (const reference of references) {
  for (const [attribute, kind, role] of entityRoles) {
    const name = reference[attribute];
    if (!name) continue;
    const normalizedName = normalizeName(name);
    const id = `entity:${kind}:${normalizedName}`;
    const entity = entityMap.get(id) ?? {
      id,
      kind,
      name,
      normalizedName,
      sourceIds: new Set(),
      references: new Set(),
    };
    for (const sourceId of reference.evidenceSourceIds) entity.sourceIds.add(sourceId);
    entity.references.add(reference.publicId);
    entityMap.set(id, entity);
    const assertionsForAttribute =
      assertionsBySubject.get(`${reference.publicId}\u0000${attribute}`) ?? [];
    referenceEntityLinks.push({
      entityId: id,
      referencePublicId: reference.publicId,
      role,
      certainty: assertionsForAttribute[0]?.certainty ?? "unknown",
    });
  }
}
for (const entity of entityMap.values()) {
  add(
    insert(
      "catalog_entities",
      [
        "id",
        "kind",
        "preferred_name",
        "normalized_name",
        "country_code",
        "region",
        "from_year",
        "to_year",
        "description",
        "created_at",
        "updated_at",
      ],
      [
        entity.id,
        entity.kind,
        entity.name,
        entity.normalizedName,
        null,
        null,
        null,
        null,
        null,
        baseTimestamp,
        baseTimestamp,
      ],
      ["preferred_name", "normalized_name", "updated_at"],
    ),
  );
  for (const sourceId of entity.sourceIds) {
    if (!sourceById.has(sourceId))
      throw new Error(`Entity ${entity.id} names missing source ${sourceId}`);
    add(insert("catalog_entity_sources", ["entity_id", "source_id"], [entity.id, sourceId], []));
  }
}
for (const link of referenceEntityLinks) {
  add(
    insert(
      "reference_entities",
      ["reference_id", "entity_id", "role", "certainty"],
      [referenceDbId(link.referencePublicId), link.entityId, link.role, link.certainty],
      [],
    ),
  );
}

for (const batch of batches) {
  add(
    insert(
      "research_batches",
      [
        "id",
        "slug",
        "title",
        "scope",
        "status",
        "started_at",
        "finished_at",
        "method",
        "operator",
        "created_at",
        "updated_at",
      ],
      [
        batch.id,
        batch.slug,
        batch.title,
        batch.scope,
        batch.status,
        timestamp(batch.startedAt),
        timestamp(batch.finishedAt),
        batch.method,
        batch.operator,
        timestamp(batch.startedAt),
        timestamp(batch.finishedAt ?? batch.startedAt),
      ],
      [
        "slug",
        "title",
        "scope",
        "status",
        "started_at",
        "finished_at",
        "method",
        "operator",
        "updated_at",
      ],
    ),
  );
  for (const sourceId of batch.sourceIds) {
    if (!sourceById.has(sourceId))
      throw new Error(`Batch ${batch.id} names missing source ${sourceId}`);
    add(insert("research_batch_sources", ["batch_id", "source_id"], [batch.id, sourceId], []));
  }
}

for (const candidate of orderCandidatesForSql(candidates)) {
  const batch = batchFor(candidate.batchId);
  const acceptedId = candidate.acceptedReferencePublicId;
  if (acceptedId && !referenceByPublicId.has(acceptedId)) {
    throw new Error(`Candidate ${candidate.id} names missing public reference ${acceptedId}`);
  }
  const columns = [
    "id",
    "batch_id",
    "source_id",
    "source_record_id",
    "source_record_url",
    "status",
    "title",
    "date_label",
    "inventory_number",
    "manufacturer_label",
    "fingerprint",
    "raw_record_json",
    "accepted_reference_id",
    "merged_into_candidate_id",
    "disposition_note",
    "created_at",
    "updated_at",
  ];
  const values = [
    candidate.id,
    candidate.batchId,
    candidate.sourceId,
    candidate.sourceRecordId,
    candidate.sourceRecordUrl,
    candidate.status,
    candidate.title,
    candidate.dateLabel,
    candidate.inventoryNumber,
    candidate.manufacturerLabel,
    candidate.fingerprint,
    JSON.stringify(candidate.rawRecord),
    acceptedId ? referenceDbId(acceptedId) : null,
    candidate.mergedIntoCandidateId,
    candidate.dispositionNote,
    timestamp(batch.startedAt),
    timestamp(batch.finishedAt ?? batch.startedAt),
  ];
  const updates = [
    "source_record_url",
    "title",
    "date_label",
    "inventory_number",
    "manufacturer_label",
    "fingerprint",
    "raw_record_json",
    "updated_at",
  ];
  if (syncDecisions || candidate.status === "merged" || candidate.status === "withdrawn")
    updates.push("status", "accepted_reference_id", "merged_into_candidate_id", "disposition_note");
  add(insert("catalog_candidates", columns, values, updates));
  add(
    insert(
      "candidate_source_evidence",
      ["candidate_id", "source_id", "locator", "note"],
      [
        candidate.id,
        candidate.sourceId,
        `MUSEOTIK record ${candidate.sourceRecordId}`,
        "Institutional collection record",
      ],
      [],
    ),
  );
}

for (const assertion of assertions) {
  const subjectBatchId =
    assertion.subjectType === "candidate"
      ? candidateById.get(assertion.subjectId)?.batchId
      : undefined;
  const batch = subjectBatchId ? batchFor(subjectBatchId) : batches[0];
  if (!batch) throw new Error(`No batch timestamp available for assertion ${assertion.id}`);
  const referenceId =
    assertion.subjectType === "reference" ? referenceDbId(assertion.subjectId) : null;
  const candidateId = assertion.subjectType === "candidate" ? assertion.subjectId : null;
  add(
    insert(
      "catalog_assertions",
      [
        "id",
        "reference_id",
        "candidate_id",
        "attribute",
        "value_json",
        "certainty",
        "status",
        "locator",
        "note",
        "created_at",
        "updated_at",
      ],
      [
        assertion.id,
        referenceId,
        candidateId,
        assertion.attribute,
        JSON.stringify(assertion.value),
        assertion.certainty,
        assertion.status,
        assertion.locator,
        assertion.note,
        timestamp(batch.startedAt),
        timestamp(batch.finishedAt ?? batch.startedAt),
      ],
      [
        "reference_id",
        "candidate_id",
        "attribute",
        "value_json",
        "certainty",
        "status",
        "locator",
        "note",
        "updated_at",
      ],
    ),
  );
  for (const sourceId of assertion.sourceIds) {
    if (!sourceById.has(sourceId))
      throw new Error(`Assertion ${assertion.id} names missing source ${sourceId}`);
    add(insert("assertion_sources", ["assertion_id", "source_id"], [assertion.id, sourceId], []));
  }
}

for (const decision of decisions) {
  batchFor(decision.batchId);
  add(
    insert(
      "research_decisions",
      [
        "id",
        "batch_id",
        "subject_type",
        "subject_id",
        "decision",
        "merge_target_type",
        "merge_target_id",
        "decided_at",
        "reviewer",
        "rationale",
        "created_at",
        "updated_at",
      ],
      [
        decision.id,
        decision.batchId,
        decision.subjectType,
        decision.subjectType === "reference"
          ? referenceDbId(decision.subjectId)
          : decision.subjectId,
        decision.decision,
        decision.mergeTargetType,
        decision.mergeTargetType === "reference" && decision.mergeTargetId
          ? referenceDbId(decision.mergeTargetId)
          : decision.mergeTargetId,
        timestamp(decision.decidedAt),
        decision.reviewer,
        decision.rationale,
        timestamp(decision.decidedAt),
        timestamp(decision.decidedAt),
      ],
      [
        "batch_id",
        "subject_type",
        "subject_id",
        "decision",
        "merge_target_type",
        "merge_target_id",
        "decided_at",
        "reviewer",
        "rationale",
        "updated_at",
      ],
    ),
  );
  for (const sourceId of decision.sourceIds) {
    if (!sourceById.has(sourceId))
      throw new Error(`Decision ${decision.id} names missing source ${sourceId}`);
    add(insert("decision_sources", ["decision_id", "source_id"], [decision.id, sourceId], []));
  }
}
for (const decision of decisions.filter(
  (row) => row.decision === "merged" && row.subjectType === "reference",
)) {
  if (decision.mergeTargetType !== "reference" || !decision.mergeTargetId) {
    throw new Error(`Reference merge decision ${decision.id} must target a reference`);
  }
  add(
    insert(
      "reference_merges",
      ["source_reference_id", "target_reference_id", "decision_id", "rationale", "merged_at"],
      [
        referenceDbId(decision.subjectId),
        referenceDbId(decision.mergeTargetId),
        decision.id,
        decision.rationale,
        timestamp(decision.decidedAt),
      ],
      ["target_reference_id", "decision_id", "rationale", "merged_at"],
      "source_reference_id",
    ),
  );
}

for (const row of coverage) {
  const batch = batchFor(row.batchId);
  if (!sourceById.has(row.sourceId))
    throw new Error(`Coverage ${row.id} names missing source ${row.sourceId}`);
  add(
    insert(
      "source_coverage",
      [
        "id",
        "batch_id",
        "source_id",
        "scope",
        "strategy",
        "query_json",
        "expected_count",
        "retrieved_count",
        "pages_reviewed",
        "completed_at",
        "notes",
        "created_at",
        "updated_at",
      ],
      [
        row.id,
        row.batchId,
        row.sourceId,
        row.scope,
        row.strategy,
        JSON.stringify(row.query),
        row.expectedCount,
        row.retrievedCount,
        row.pagesReviewed,
        timestamp(row.completedAt),
        row.notes,
        timestamp(batch.startedAt),
        timestamp(row.completedAt ?? batch.finishedAt ?? batch.startedAt),
      ],
      [
        "scope",
        "strategy",
        "query_json",
        "expected_count",
        "retrieved_count",
        "pages_reviewed",
        "completed_at",
        "notes",
        "updated_at",
      ],
    ),
  );
}

const chunks = [];
let pending = [];
for (const statement of statements) {
  pending.push(statement);
  if (pending.length >= maxStatements) {
    chunks.push(`${pending.join("\n")}\n`);
    pending = [];
  }
}
if (pending.length) chunks.push(`${pending.join("\n")}\n`);

const outDirectory = args.get("out")
  ? resolve(String(args.get("out")))
  : await mkdtemp(resolve(tmpdir(), "lcdn-d1-import-"));
await import("node:fs/promises").then(({ mkdir }) => mkdir(outDirectory, { recursive: true }));
for (let index = 0; index < chunks.length; index += 1) {
  const path = resolve(outDirectory, `chunk-${String(index + 1).padStart(3, "0")}.sql`);
  await writeFile(path, chunks[index]);
}

if (apply) {
  runPnpm(["--filter", "@lacasadelnaipe/catalog", "catalog:validate"], "Catalog corpus validation");
  const pnpmArgs = [
    "--filter",
    "@lacasadelnaipe/db",
    "exec",
    "wrangler",
    "d1",
    "execute",
    "lacasadelnaipe",
  ];
  pnpmArgs.push(remote ? "--remote" : "--local", "--config", "../../apps/web/wrangler.jsonc");
  for (let index = 0; index < chunks.length; index += 1) {
    const path = resolve(outDirectory, `chunk-${String(index + 1).padStart(3, "0")}.sql`);
    runPnpm([...pnpmArgs, "--file", path], `D1 import chunk ${index + 1}/${chunks.length}`);
  }
  if (!args.get("out")) await rm(outDirectory, { recursive: true, force: true });
} else if (!args.get("out")) {
  await rm(outDirectory, { recursive: true, force: true });
  console.log(
    `Generated ${statements.length} idempotent SQL statements in ${chunks.length} chunks (temporary output removed).`,
  );
  console.log("Pass --out=DIR to keep the SQL files, or --apply to run them against local D1.");
} else {
  console.log(
    `Generated ${statements.length} idempotent SQL statements in ${chunks.length} chunks at ${outDirectory}`,
  );
  console.log(
    syncDecisions
      ? "Candidate review states will be synchronized if --apply is also set."
      : "Existing candidate review states are preserved; pass --sync-decisions to synchronize them.",
  );
}
