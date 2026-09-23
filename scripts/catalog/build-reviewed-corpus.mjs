import { readdir, readFile, writeFile } from "node:fs/promises";

const batchRoot = "data/research/batches";
const sourceFile = "data/research/sources.jsonl";
const referencesFile = "data/catalog/references.jsonl";
const assertionsFile = "data/catalog/assertions.jsonl";
const decisionsFile = "data/research/decisions.jsonl";
const referenceDecisionsFile = "data/research/reference-decisions.jsonl";
const publicIndexFile = "data/catalog/public-index.json";
const redirectIndexFile = "data/catalog/redirect-index.json";

function parseJsonl(text, label) {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${label}:${index + 1}: ${error.message}`);
      }
    });
}

async function readJsonl(path, optional = false) {
  try {
    return parseJsonl(await readFile(path, "utf8"), path);
  } catch (error) {
    if (optional && error.code === "ENOENT") return [];
    throw error;
  }
}

function writeJsonl(path, rows) {
  return writeFile(path, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function parseDimensions(value) {
  const match = value?.match(/([\d.]+)\s*x\s*([\d.]+)\s*mm/i);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

const sources = await readJsonl(sourceFile);
const referenceDispositions = await readJsonl(referenceDecisionsFile, true);
const sourceById = new Map(sources.map((source) => [source.id, source]));
const batchDirectories = (await readdir(batchRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => `${batchRoot}/${entry.name}`)
  .sort();
if (batchDirectories.length === 0) throw new Error(`No research batches found in ${batchRoot}`);

const loadedBatches = await Promise.all(
  batchDirectories.map(async (directory) => {
    const batch = JSON.parse(await readFile(`${directory}/batch.json`, "utf8"));
    const [candidates, itemDetails, review, coverage] = await Promise.all([
      readJsonl(`${directory}/candidates.jsonl`),
      readJsonl(`${directory}/item-details.jsonl`, true),
      readJsonl(`${directory}/reviewed-items.jsonl`, true),
      readJsonl(`${directory}/coverage.jsonl`),
    ]);
    return { directory, batch, candidates, itemDetails, review, coverage };
  }),
);

const previousReferences = await readJsonl(referencesFile, true);
const previousReferenceById = new Map(
  previousReferences.map((reference) => [reference.publicId, reference]),
);
const references = [];
const assertions = [];
const decisions = [];
const updatedBatches = [];
const candidateIds = new Set();
const reviewedPublicIds = new Set();
const acceptedCandidateByPublicId = new Map();

for (const loaded of loadedBatches) {
  const { directory, batch, candidates, itemDetails, review } = loaded;
  const candidateByRecordId = new Map(
    candidates.map((candidate) => [candidate.sourceRecordId, candidate]),
  );
  const detailsByRecordId = new Map(
    itemDetails.map((details) => [details.sourceRecordId, details]),
  );
  const reviewByRecordId = new Map(review.map((record) => [record.sourceRecordId, record]));
  const acceptedByCandidate = new Map();

  if (candidateByRecordId.size !== candidates.length)
    throw new Error(`Duplicate source record IDs in ${directory}/candidates.jsonl`);
  if (reviewByRecordId.size !== review.length)
    throw new Error(`Duplicate review decisions in ${directory}/reviewed-items.jsonl`);
  for (const candidate of candidates) {
    if (candidateIds.has(candidate.id))
      throw new Error(`Duplicate candidate ID across research batches: ${candidate.id}`);
    candidateIds.add(candidate.id);
    if (!sourceById.has(candidate.sourceId))
      throw new Error(`Missing normalized source ${candidate.sourceId}`);
  }

  function checkReviewedRecord(record) {
    const candidate = candidateByRecordId.get(record.sourceRecordId);
    const details = detailsByRecordId.get(record.sourceRecordId);
    if (!candidate || !details)
      throw new Error(`No source candidate and full item page for ${record.sourceRecordId}`);
    if (details.httpStatus !== 200)
      throw new Error(`Item page was not successfully fetched: ${record.sourceRecordId}`);
    if (details.title !== record.title)
      throw new Error(`Reviewed title differs from source title: ${record.sourceRecordId}`);
    if (details.inventoryNumber !== candidate.inventoryNumber)
      throw new Error(`Inventory number mismatch: ${record.sourceRecordId}`);
    if (details.date !== record.dateLabel)
      throw new Error(`Date label mismatch: ${record.sourceRecordId}`);
    if (details.otherDenominations !== record.catalogCode)
      throw new Error(`Museum designation mismatch: ${record.sourceRecordId}`);
    if ((record.cardWidthMm ?? null) !== null || (record.cardHeightMm ?? null) !== null) {
      const dimensions = parseDimensions(details.dimensions);
      if (
        !dimensions ||
        dimensions.width !== record.cardWidthMm ||
        dimensions.height !== record.cardHeightMm
      ) {
        throw new Error(`Dimensions mismatch: ${record.sourceRecordId}`);
      }
    }
    if (record.material && details.materials !== record.material)
      throw new Error(`Material mismatch: ${record.sourceRecordId}`);
    if (record.backDesign && details.backDescription !== record.backDesign)
      throw new Error(`Back design mismatch: ${record.sourceRecordId}`);
    if (
      record.cardCount &&
      !new RegExp(`${record.cardCount}\\s+CARTAS`, "i").test(details.frontDescription ?? "")
    ) {
      throw new Error(`Card count is not present in the item record: ${record.sourceRecordId}`);
    }
    return { candidate, details };
  }

  for (const record of review.filter((row) => (row.decision ?? "accepted") === "accepted")) {
    if (!record.publicId || !record.slug)
      throw new Error(`Accepted review needs a public ID and slug: ${record.sourceRecordId}`);
    if (reviewedPublicIds.has(record.publicId))
      throw new Error(`Duplicate permanent public reference ID: ${record.publicId}`);
    reviewedPublicIds.add(record.publicId);
    const { candidate } = checkReviewedRecord(record);
    const previous = previousReferenceById.get(record.publicId);
    const previousUrl = previous?.catalogCodes?.[0]?.url;
    if (previous && previousUrl !== candidate.sourceRecordUrl) {
      throw new Error(
        `Permanent ID ${record.publicId} was previously assigned to another source record; preserve it and assign a new ID.`,
      );
    }

    const dateRange = record.dateLabel?.match(/^(\d{4})\s*-\s*(\d{4})$/);
    const exactYear = record.dateLabel?.match(/^(?:\d{2}\/\d{2}\/)?(\d{4})$/);
    const externalCode = record.catalogCode
      ? [
          {
            authority: "Museo Fournier de Naipes de Álava / MUSEOTIK (otras denominaciones)",
            code: record.catalogCode,
            url: candidate.sourceRecordUrl,
          },
        ]
      : [];
    const reference = {
      publicId: record.publicId,
      slug: record.slug,
      title: record.title,
      aliases: record.aliases ?? [],
      status: "active",
      mergedIntoPublicId: null,
      manufacturer: record.manufacturer ?? null,
      printer: record.printer ?? null,
      publisher: record.publisher ?? null,
      brand: record.brand ?? null,
      originCountry: record.originCountry ?? null,
      originRegion: record.originRegion ?? null,
      suitSystem: record.suitSystem,
      pattern: record.pattern ?? null,
      regionalVariant: record.regionalVariant ?? null,
      dateLabel: record.dateLabel ?? null,
      dateStart:
        record.dateStart ??
        (dateRange ? Number(dateRange[1]) : exactYear ? Number(exactYear[1]) : null),
      dateEnd:
        record.dateEnd ??
        (dateRange ? Number(dateRange[2]) : exactYear ? Number(exactYear[1]) : null),
      editionCode: record.editionCode ?? null,
      cardCount: record.cardCount ?? null,
      cardsPerSuit: record.cardsPerSuit ?? null,
      additionalCards: record.additionalCards ?? [],
      indices: record.indices ?? [],
      cardWidthMm: record.cardWidthMm ?? null,
      cardHeightMm: record.cardHeightMm ?? null,
      material: record.material ?? null,
      backDesign: record.backDesign ?? null,
      theme: record.theme ?? null,
      language: record.language ?? [],
      catalogCodes: externalCode,
      evidenceSourceIds: [candidate.sourceId],
      notes: record.rationale,
      createdAt: record.createdAt ?? batch.startedAt,
      updatedAt: batch.finishedAt ?? batch.startedAt,
    };
    references.push(reference);
    acceptedByCandidate.set(candidate.id, record.publicId);
    acceptedCandidateByPublicId.set(record.publicId, { candidate, record });

    const addAssertion = (attribute, value, certainty, locator) =>
      assertions.push({
        id: `assertion:${record.publicId}:${attribute}`,
        subjectType: "reference",
        subjectId: record.publicId,
        attribute,
        value,
        certainty,
        status: "accepted",
        sourceIds: [candidate.sourceId],
        locator: `Inventario ${candidate.inventoryNumber}; ${locator}`,
        note: `Ficha ${candidate.sourceRecordId}`,
      });

    addAssertion("title", record.title, "confirmed", "Título");
    addAssertion(
      "suitSystem",
      record.suitSystem,
      record.suitSystemCertainty,
      record.suitSystem === "unknown"
        ? "Anverso no descrito en la ficha abierta"
        : "Anverso y otras denominaciones",
    );
    if (record.originCountry)
      addAssertion(
        "originCountry",
        record.originCountry,
        "confirmed",
        "Otras denominaciones / ficha del objeto",
      );
    if (record.dateLabel)
      addAssertion("dateLabel", record.dateLabel, record.dateCertainty, "Fecha");
    if (externalCode.length)
      addAssertion(
        "catalogCodes",
        { authority: "Museo Fournier / MUSEOTIK", code: record.catalogCode },
        "confirmed",
        "Otras denominaciones",
      );
    if (record.cardWidthMm !== null || record.cardHeightMm !== null) {
      addAssertion(
        "dimensions",
        { widthMm: record.cardWidthMm ?? null, heightMm: record.cardHeightMm ?? null },
        "confirmed",
        "Dimensiones",
      );
    }
    if (record.material) addAssertion("material", record.material, "confirmed", "Materias");
    if (record.backDesign) addAssertion("backDesign", record.backDesign, "confirmed", "Reverso");
    if (record.manufacturer)
      addAssertion(
        "manufacturer",
        record.manufacturer,
        record.manufacturerCertainty ?? "confirmed",
        "Autoría / inscripciones del anverso",
      );
    if (record.printer)
      addAssertion(
        "printer",
        record.printer,
        record.printerCertainty ?? "confirmed",
        "Autoría / inscripciones del anverso",
      );
    if (record.publisher)
      addAssertion(
        "publisher",
        record.publisher,
        record.publisherCertainty ?? "confirmed",
        "Autoría / inscripciones del anverso",
      );
    if (record.brand)
      addAssertion(
        "brand",
        record.brand,
        record.brandCertainty ?? "confirmed",
        "Inscripciones del anverso",
      );
    if (record.originRegion)
      addAssertion(
        "originRegion",
        record.originRegion,
        "confirmed",
        "Autoría / inscripciones del anverso",
      );
    if (record.regionalVariant)
      addAssertion("regionalVariant", record.regionalVariant, "confirmed", "Título");
    if (record.pattern)
      addAssertion("pattern", record.pattern, "confirmed", "Título / diseño del anverso");
    if (record.editionCode)
      addAssertion("editionCode", record.editionCode, "confirmed", "Inscripciones del anverso");
    if (record.cardCount)
      addAssertion("cardCount", record.cardCount, "confirmed", "Inscripciones de la baraja");

    decisions.push({
      id: `decision:${candidate.sourceRecordId}`,
      batchId: candidate.batchId,
      subjectType: "candidate",
      subjectId: candidate.id,
      decision: "accepted",
      mergeTargetType: null,
      mergeTargetId: null,
      decidedAt: batch.finishedAt ?? batch.startedAt,
      reviewer: record.reviewer ?? "Codex autonomous catalog review",
      rationale: record.rationale,
      sourceIds: [candidate.sourceId],
    });
  }

  const updatedCandidates = candidates.map((candidate) => {
    const publicId = acceptedByCandidate.get(candidate.id);
    if (publicId) {
      const reference = references.find((row) => row.publicId === publicId);
      return {
        ...candidate,
        status: "accepted",
        manufacturerLabel: reference.manufacturer,
        acceptedReferencePublicId: publicId,
        mergedIntoCandidateId: null,
        dispositionNote:
          "Accepted as an edition/variant after checking its individual source record and distinguishing attributes.",
      };
    }
    const disposition = reviewByRecordId.get(candidate.sourceRecordId);
    if (!disposition || disposition.decision === "accepted") return candidate;
    const rationale = disposition.rationale;
    if (!rationale)
      throw new Error(`A non-acceptance decision needs a rationale: ${candidate.sourceRecordId}`);
    if ((disposition.subjectType ?? "candidate") !== "candidate") {
      throw new Error(
        `Candidate review decisions must be about the candidate: ${candidate.sourceRecordId}`,
      );
    }
    if (disposition.decision === "merged" && !disposition.mergeTargetId) {
      throw new Error(`A merge decision needs a target: ${candidate.sourceRecordId}`);
    }
    const mergeTargetType = disposition.decision === "merged" ? "candidate" : null;
    decisions.push({
      id: `decision:${candidate.sourceRecordId}`,
      batchId: candidate.batchId,
      subjectType: "candidate",
      subjectId: candidate.id,
      decision: disposition.decision,
      mergeTargetType,
      mergeTargetId: disposition.mergeTargetId ?? null,
      decidedAt: batch.finishedAt ?? batch.startedAt,
      reviewer: disposition.reviewer ?? "Codex autonomous catalog review",
      rationale,
      sourceIds: [candidate.sourceId],
    });
    return {
      ...candidate,
      status: disposition.decision,
      acceptedReferencePublicId: null,
      mergedIntoCandidateId:
        disposition.decision === "merged" && mergeTargetType === "candidate"
          ? disposition.mergeTargetId
          : null,
      dispositionNote: rationale,
    };
  });

  const coverage = loaded.coverage;
  if (coverage.length === 0) throw new Error(`No source coverage record found in ${directory}`);
  for (const sourceCoverage of coverage) {
    const sourceCandidates = updatedCandidates.filter(
      (candidate) => candidate.sourceId === sourceCoverage.sourceId,
    );
    const sourceRecordIds = new Set(sourceCandidates.map((candidate) => candidate.sourceRecordId));
    const sourceDetails = itemDetails.filter((details) =>
      sourceRecordIds.has(details.sourceRecordId),
    );
    const sourceReviews = review.filter((record) => sourceRecordIds.has(record.sourceRecordId));
    const acceptedCount = sourceCandidates.filter(
      (candidate) => candidate.status === "accepted",
    ).length;
    const needsMoreEvidenceCount = sourceCandidates.filter(
      (candidate) => candidate.status === "needs_more_evidence",
    ).length;
    const untouchedCount = sourceCandidates.filter(
      (candidate) => candidate.status === "candidate",
    ).length;
    sourceCoverage.pagesReviewed = [
      sourceCoverage.pagesReviewed,
      `Fichas de detalle descargadas: ${sourceDetails.length}; fichas revisadas: ${sourceReviews.length}`,
    ]
      .filter(Boolean)
      .join("; ")
      .slice(0, 500);
    sourceCoverage.notes = `La descarga no equivale a revisión catalográfica. De ${sourceCandidates.length} resultados se descargaron ${sourceDetails.length} fichas; ${sourceReviews.length} recibieron una decisión, ${acceptedCount} aceptadas, ${needsMoreEvidenceCount} en needs_more_evidence y ${untouchedCount} siguen como candidatas.`;
  }
  updatedBatches.push({ directory, batch, updatedCandidates, coverage });
}

const referencesByPublicId = new Map(
  references.map((reference) => [reference.publicId, reference]),
);
const dispositionSubjects = new Set();
for (const disposition of referenceDispositions) {
  const {
    id,
    batchId,
    subjectId,
    decision,
    mergeTargetId,
    decidedAt,
    reviewer,
    rationale,
    sourceIds,
  } = disposition;
  if (!id || !batchId || !subjectId || !decidedAt || !reviewer || !rationale) {
    throw new Error("Reference disposition is missing a required field.");
  }
  if (!new Set(["merged", "withdrawn"]).has(decision)) {
    throw new Error(`Unsupported reference disposition for ${subjectId}: ${decision}`);
  }
  if (disposition.subjectType !== "reference")
    throw new Error(`Reference disposition ${id} must have subjectType reference`);
  if (!Number.isFinite(Date.parse(decidedAt)))
    throw new Error(`Reference disposition ${id} has an invalid decision timestamp`);
  if (decision === "merged" && disposition.mergeTargetType !== "reference")
    throw new Error(`Reference merge ${id} must have mergeTargetType reference`);
  if (
    decision === "withdrawn" &&
    disposition.mergeTargetType !== null &&
    disposition.mergeTargetType !== undefined
  ) {
    throw new Error(`Reference withdrawal ${id} cannot have a merge target type`);
  }
  if (dispositionSubjects.has(subjectId))
    throw new Error(`Duplicate reference disposition for ${subjectId}`);
  dispositionSubjects.add(subjectId);
  const reference = referencesByPublicId.get(subjectId);
  const accepted = acceptedCandidateByPublicId.get(subjectId);
  if (!reference || !accepted) throw new Error(`No accepted reference to dispose: ${subjectId}`);
  if (reference.status !== "active")
    throw new Error(`Reference is already non-active: ${subjectId}`);
  const owner = updatedBatches.find(({ updatedCandidates }) =>
    updatedCandidates.some((candidate) => candidate.id === accepted.candidate.id),
  );
  if (!owner) throw new Error(`No candidate batch for reference ${subjectId}`);
  if (!owner.batch.id || owner.batch.id !== batchId)
    throw new Error(`Reference disposition ${id} must use the accepted candidate's batch`);
  if (!Array.isArray(sourceIds) || sourceIds.length === 0)
    throw new Error(`Reference disposition ${id} needs at least one evidence source`);
  for (const sourceId of sourceIds) {
    if (!sourceById.has(sourceId))
      throw new Error(`Reference disposition ${id} names missing source ${sourceId}`);
  }

  let targetCandidate = null;
  if (decision === "merged") {
    if (!mergeTargetId || mergeTargetId === subjectId)
      throw new Error(`Reference merge ${id} needs a different target`);
    const targetReference = referencesByPublicId.get(mergeTargetId);
    targetCandidate = acceptedCandidateByPublicId.get(mergeTargetId);
    if (!targetReference || !targetCandidate || targetReference.status !== "active") {
      throw new Error(`Reference merge ${id} must target an active accepted reference`);
    }
    reference.status = "merged";
    reference.mergedIntoPublicId = mergeTargetId;
  } else {
    if (mergeTargetId !== null && mergeTargetId !== undefined)
      throw new Error(`Reference withdrawal ${id} cannot name a merge target`);
    reference.status = "withdrawn";
    reference.mergedIntoPublicId = null;
  }
  const candidateIndex = owner.updatedCandidates.findIndex(
    (candidate) => candidate.id === accepted.candidate.id,
  );
  owner.updatedCandidates[candidateIndex] = {
    ...owner.updatedCandidates[candidateIndex],
    status: decision,
    acceptedReferencePublicId: null,
    mergedIntoCandidateId: targetCandidate?.candidate.id ?? null,
    dispositionNote: rationale,
  };
  decisions.push({
    id,
    batchId,
    subjectType: "reference",
    subjectId,
    decision,
    mergeTargetType: decision === "merged" ? "reference" : null,
    mergeTargetId: decision === "merged" ? mergeTargetId : null,
    decidedAt,
    reviewer,
    rationale,
    sourceIds,
  });
  decisions.push({
    id: `${id}:candidate`,
    batchId,
    subjectType: "candidate",
    subjectId: accepted.candidate.id,
    decision,
    mergeTargetType: targetCandidate ? "candidate" : null,
    mergeTargetId: targetCandidate?.candidate.id ?? null,
    decidedAt,
    reviewer,
    rationale: `Reference disposition ${subjectId}: ${rationale}`,
    sourceIds,
  });
}

for (const previous of previousReferences) {
  if (!referencesByPublicId.has(previous.publicId)) {
    throw new Error(
      `Refusing to drop permanent public ID ${previous.publicId}; preserve it as a tombstone or redirect.`,
    );
  }
}

const publicReferences = references
  .filter((reference) => reference.status === "active")
  .map((reference) => {
    const accepted = acceptedCandidateByPublicId.get(reference.publicId);
    if (!accepted) throw new Error(`No accepted candidate is linked to ${reference.publicId}`);
    return {
      ...reference,
      claims: assertions
        .filter(
          (assertion) =>
            assertion.subjectType === "reference" && assertion.subjectId === reference.publicId,
        )
        .map((assertion) => ({
          attribute: assertion.attribute,
          value: assertion.value,
          certainty: assertion.certainty,
          sourceIds: assertion.sourceIds,
          locator: assertion.locator,
          note: assertion.note,
        })),
      sources: reference.evidenceSourceIds.map((sourceId) => {
        const source = sourceById.get(sourceId);
        const candidate = accepted.candidate;
        return {
          id: source.id,
          title: source.title,
          organization: source.organization,
          quality: source.quality,
          url: candidate.sourceRecordUrl,
          accessedAt: source.accessedAt,
          locator: `Registro ${candidate.rawRecord.coninv}; MUSEOTIK ${candidate.sourceRecordId}`,
        };
      }),
    };
  });

const referenceRedirects = references
  .filter((reference) => reference.status === "merged")
  .map((reference) => {
    const target = referencesByPublicId.get(reference.mergedIntoPublicId);
    if (target?.status !== "active") {
      throw new Error(
        `Merged reference ${reference.publicId} must point directly to an active reference.`,
      );
    }
    return {
      slug: reference.slug,
      publicId: reference.publicId,
      targetSlug: target.slug,
      targetPublicId: target.publicId,
    };
  });

await Promise.all([
  ...updatedBatches.flatMap(({ directory, updatedCandidates, coverage }) => [
    writeJsonl(`${directory}/candidates.jsonl`, updatedCandidates),
    writeJsonl(`${directory}/coverage.jsonl`, coverage),
  ]),
  writeJsonl(referencesFile, references),
  writeJsonl(assertionsFile, assertions),
  writeJsonl(decisionsFile, decisions),
  writeFile(publicIndexFile, `${JSON.stringify(publicReferences, null, 2)}\n`),
  writeFile(redirectIndexFile, `${JSON.stringify(referenceRedirects, null, 2)}\n`),
]);

const candidateCount = updatedBatches.reduce(
  (sum, batch) => sum + batch.updatedCandidates.length,
  0,
);
const needsMoreEvidenceCount = updatedBatches.reduce(
  (sum, batch) =>
    sum +
    batch.updatedCandidates.filter((candidate) => candidate.status === "needs_more_evidence")
      .length,
  0,
);
const candidatesUnreviewed = updatedBatches.reduce(
  (sum, batch) =>
    sum + batch.updatedCandidates.filter((candidate) => candidate.status === "candidate").length,
  0,
);
console.log(
  JSON.stringify(
    {
      batches: updatedBatches.length,
      candidates: candidateCount,
      acceptedReferences: references.filter((reference) => reference.status === "active").length,
      assertions: assertions.length,
      decisions: decisions.length,
      candidatesNeedsMoreEvidence: needsMoreEvidenceCount,
      candidatesUnreviewed,
    },
    null,
    2,
  ),
);
