import { referenceFingerprint } from "./dedupe";
import type {
  CatalogAssertion,
  CatalogCandidate,
  CatalogReference,
  CatalogSource,
  ResearchBatch,
  ResearchDecision,
} from "./schemas";

export type CorpusIssue = { path: string; message: string };

export type CatalogCorpus = {
  sources: readonly CatalogSource[];
  references: readonly CatalogReference[];
  candidates: readonly CatalogCandidate[];
  assertions: readonly CatalogAssertion[];
  batches: readonly ResearchBatch[];
  decisions: readonly ResearchDecision[];
};

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const found = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) found.add(value);
    seen.add(value);
  }
  return [...found].sort();
}

function referenceFingerprintInput(reference: CatalogReference) {
  return {
    title: reference.title,
    manufacturer: reference.manufacturer,
    originCountry: reference.originCountry,
    dateStart: reference.dateStart,
    dateEnd: reference.dateEnd,
    editionCode: reference.editionCode,
    pattern: reference.pattern,
    catalogCodes: reference.catalogCodes,
  };
}

function validateReferenceMergeGraph(references: readonly CatalogReference[]): CorpusIssue[] {
  const byPublicId = new Map(references.map((reference) => [reference.publicId, reference]));
  const issues: CorpusIssue[] = [];

  for (const reference of references) {
    if (reference.status !== "merged") continue;
    const target = reference.mergedIntoPublicId;
    if (!target || !byPublicId.has(target)) {
      issues.push({
        path: `references.${reference.publicId}.mergedIntoPublicId`,
        message: "Merge target does not exist",
      });
      continue;
    }

    const visited = new Set([reference.publicId]);
    let current: CatalogReference | undefined = byPublicId.get(target);
    while (current?.status === "merged" && current.mergedIntoPublicId) {
      if (visited.has(current.publicId)) {
        issues.push({
          path: `references.${reference.publicId}.mergedIntoPublicId`,
          message: "Reference merge graph contains a cycle",
        });
        break;
      }
      visited.add(current.publicId);
      current = byPublicId.get(current.mergedIntoPublicId);
    }
    if (current?.status === "withdrawn") {
      issues.push({
        path: `references.${reference.publicId}.mergedIntoPublicId`,
        message: "Merge chain ends at a withdrawn reference",
      });
    }
  }

  return issues;
}

function validateCandidateMergeGraph(candidates: readonly CatalogCandidate[]): CorpusIssue[] {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const issues: CorpusIssue[] = [];
  for (const candidate of candidates) {
    if (candidate.status !== "merged") continue;
    const targetId = candidate.mergedIntoCandidateId;
    if (!targetId || !byId.has(targetId)) continue;
    const visited = new Set([candidate.id]);
    let current: CatalogCandidate | undefined = byId.get(targetId);
    while (current?.status === "merged" && current.mergedIntoCandidateId) {
      if (visited.has(current.id)) {
        issues.push({
          path: `candidates.${candidate.id}.mergedIntoCandidateId`,
          message: "Candidate merge graph contains a cycle",
        });
        break;
      }
      visited.add(current.id);
      current = byId.get(current.mergedIntoCandidateId);
    }
    if (current?.status === "withdrawn") {
      issues.push({
        path: `candidates.${candidate.id}.mergedIntoCandidateId`,
        message: "Candidate merge chain ends at a withdrawn candidate",
      });
    }
  }
  return issues;
}

/** Check cross-file invariants that individual Zod schemas cannot express. */
export function validateCatalogCorpus(corpus: CatalogCorpus): CorpusIssue[] {
  const issues: CorpusIssue[] = [];
  const sourceIds = new Set(corpus.sources.map((source) => source.id));
  const referenceIds = new Set(corpus.references.map((reference) => reference.publicId));
  const candidateIds = new Set(corpus.candidates.map((candidate) => candidate.id));
  const batchIds = new Set(corpus.batches.map((batch) => batch.id));

  for (const id of duplicates(corpus.sources.map((source) => source.id))) {
    issues.push({ path: "sources", message: `Duplicate source ID: ${id}` });
  }
  for (const id of duplicates(corpus.references.map((reference) => reference.publicId))) {
    issues.push({ path: "references", message: `Duplicate public reference ID: ${id}` });
  }
  for (const slug of duplicates(corpus.references.map((reference) => reference.slug))) {
    issues.push({ path: "references", message: `Duplicate public reference slug: ${slug}` });
  }
  for (const id of duplicates(corpus.candidates.map((candidate) => candidate.id))) {
    issues.push({ path: "candidates", message: `Duplicate internal candidate ID: ${id}` });
  }
  for (const id of duplicates(corpus.batches.map((batch) => batch.id))) {
    issues.push({ path: "batches", message: `Duplicate batch ID: ${id}` });
  }
  for (const id of duplicates(corpus.decisions.map((decision) => decision.id))) {
    issues.push({ path: "decisions", message: `Duplicate decision ID: ${id}` });
  }
  for (const url of duplicates(
    corpus.sources.flatMap((source) => (source.url ? [source.url] : [])),
  )) {
    issues.push({ path: "sources", message: `Duplicate normalized source URL: ${url}` });
  }

  const candidateSourceKeys = corpus.candidates.map(
    (candidate) => `${candidate.sourceId}\u0000${candidate.sourceRecordId}`,
  );
  for (const key of duplicates(candidateSourceKeys)) {
    const [sourceId, recordId] = key.split("\u0000");
    issues.push({
      path: "candidates",
      message: `Source record was ingested more than once: ${sourceId}/${recordId}`,
    });
  }

  const acceptedFingerprints = new Map<string, string>();
  for (const reference of corpus.references) {
    if (reference.status === "active") {
      const fingerprint = referenceFingerprint(referenceFingerprintInput(reference));
      const prior = acceptedFingerprints.get(fingerprint);
      if (prior) {
        issues.push({
          path: `references.${reference.publicId}`,
          message: `Exact duplicate active reference fingerprint also used by ${prior}`,
        });
      } else {
        acceptedFingerprints.set(fingerprint, reference.publicId);
      }
    }
    for (const sourceId of reference.evidenceSourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          path: `references.${reference.publicId}.evidenceSourceIds`,
          message: `Unknown source ID: ${sourceId}`,
        });
      }
    }
  }

  const candidateDecisions = new Map<string, ResearchDecision>();
  for (const decision of corpus.decisions) {
    if (decision.subjectType !== "candidate") continue;
    const prior = candidateDecisions.get(decision.subjectId);
    if (!prior || decision.decidedAt >= prior.decidedAt)
      candidateDecisions.set(decision.subjectId, decision);
  }
  const acceptedReferenceCandidates = new Set<string>();

  for (const candidate of corpus.candidates) {
    if (!batchIds.has(candidate.batchId)) {
      issues.push({
        path: `candidates.${candidate.id}.batchId`,
        message: `Unknown batch ID: ${candidate.batchId}`,
      });
    }
    if (!sourceIds.has(candidate.sourceId)) {
      issues.push({
        path: `candidates.${candidate.id}.sourceId`,
        message: `Unknown source ID: ${candidate.sourceId}`,
      });
    }
    if (
      candidate.status === "accepted" &&
      candidate.acceptedReferencePublicId &&
      !referenceIds.has(candidate.acceptedReferencePublicId)
    ) {
      issues.push({
        path: `candidates.${candidate.id}.acceptedReferencePublicId`,
        message: `Unknown public reference ID: ${candidate.acceptedReferencePublicId}`,
      });
    }
    if (candidate.status === "accepted") {
      acceptedReferenceCandidates.add(candidate.acceptedReferencePublicId ?? "");
      const decision = candidateDecisions.get(candidate.id);
      if (decision?.decision !== "accepted") {
        issues.push({
          path: `candidates.${candidate.id}.status`,
          message: "Accepted candidate needs a current accepted review decision",
        });
      }
      const reference = corpus.references.find(
        (row) => row.publicId === candidate.acceptedReferencePublicId,
      );
      if (reference && reference.status !== "active") {
        issues.push({
          path: `candidates.${candidate.id}.acceptedReferencePublicId`,
          message: "Accepted candidate must link to an active reference",
        });
      }
    } else if (
      ["needs_more_evidence", "merged", "rejected", "withdrawn"].includes(candidate.status)
    ) {
      const decision = candidateDecisions.get(candidate.id);
      if (decision?.decision !== candidate.status) {
        issues.push({
          path: `candidates.${candidate.id}.status`,
          message: "Candidate status needs a matching review decision",
        });
      }
    }
    if (
      candidate.status === "merged" &&
      candidate.mergedIntoCandidateId &&
      !candidateIds.has(candidate.mergedIntoCandidateId)
    ) {
      issues.push({
        path: `candidates.${candidate.id}.mergedIntoCandidateId`,
        message: `Unknown candidate ID: ${candidate.mergedIntoCandidateId}`,
      });
    }
  }

  for (const assertion of corpus.assertions) {
    const subjectExists =
      assertion.subjectType === "reference"
        ? referenceIds.has(assertion.subjectId)
        : candidateIds.has(assertion.subjectId);
    if (!subjectExists) {
      issues.push({
        path: `assertions.${assertion.id}.subjectId`,
        message: "Assertion subject does not exist",
      });
    }
    for (const sourceId of assertion.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          path: `assertions.${assertion.id}.sourceIds`,
          message: `Unknown source ID: ${sourceId}`,
        });
      }
    }
  }

  for (const reference of corpus.references) {
    if (reference.status === "active" && !acceptedReferenceCandidates.has(reference.publicId)) {
      issues.push({
        path: `references.${reference.publicId}`,
        message: "Active public reference has no accepted source candidate",
      });
    }
    if (
      reference.status === "active" &&
      !corpus.assertions.some(
        (assertion) =>
          assertion.subjectType === "reference" &&
          assertion.subjectId === reference.publicId &&
          assertion.attribute === "title" &&
          assertion.status === "accepted" &&
          assertion.sourceIds.length > 0,
      )
    ) {
      issues.push({
        path: `references.${reference.publicId}`,
        message: "Active public reference needs an accepted, sourced title assertion",
      });
    }
    if (reference.status !== "active") {
      const disposition = corpus.decisions
        .filter(
          (decision) =>
            decision.subjectType === "reference" && decision.subjectId === reference.publicId,
        )
        .sort((left, right) => right.decidedAt.localeCompare(left.decidedAt))[0];
      const expectedDecision = reference.status === "merged" ? "merged" : "withdrawn";
      if (
        disposition?.decision !== expectedDecision ||
        (expectedDecision === "merged" &&
          (disposition.mergeTargetType !== "reference" ||
            disposition.mergeTargetId !== reference.mergedIntoPublicId))
      ) {
        issues.push({
          path: `references.${reference.publicId}.status`,
          message: "Non-active reference needs a matching audited disposition decision",
        });
      }
    }
  }

  for (const decision of corpus.decisions) {
    if (!batchIds.has(decision.batchId)) {
      issues.push({
        path: `decisions.${decision.id}.batchId`,
        message: `Unknown batch ID: ${decision.batchId}`,
      });
    }
    const subjectExists =
      decision.subjectType === "reference"
        ? referenceIds.has(decision.subjectId)
        : candidateIds.has(decision.subjectId);
    if (!subjectExists) {
      issues.push({
        path: `decisions.${decision.id}.subjectId`,
        message: "Decision subject does not exist",
      });
    }
    for (const sourceId of decision.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          path: `decisions.${decision.id}.sourceIds`,
          message: `Unknown source ID: ${sourceId}`,
        });
      }
    }
    if (
      decision.mergeTargetType === "reference" &&
      !referenceIds.has(decision.mergeTargetId ?? "")
    ) {
      issues.push({
        path: `decisions.${decision.id}.mergeTargetId`,
        message: "Merge target reference does not exist",
      });
    }
    if (
      decision.mergeTargetType === "candidate" &&
      !candidateIds.has(decision.mergeTargetId ?? "")
    ) {
      issues.push({
        path: `decisions.${decision.id}.mergeTargetId`,
        message: "Merge target candidate does not exist",
      });
    }
  }

  issues.push(...validateReferenceMergeGraph(corpus.references));
  issues.push(...validateCandidateMergeGraph(corpus.candidates));
  return issues;
}
