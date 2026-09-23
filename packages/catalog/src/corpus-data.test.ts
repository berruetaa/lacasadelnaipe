import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  catalogAssertionSchema,
  catalogCandidateSchema,
  catalogReferenceSchema,
  catalogSourceRecordSchema,
  catalogSourceSchema,
  certaintySchema,
  referenceDispositionDecisionSchema,
  researchBatchSchema,
  researchDecisionSchema,
  sourceCoverageSchema,
} from "./schemas";
import { validateCatalogCorpus } from "./validate";

const repoRoot = resolve(import.meta.dirname, "../../../");
const batchRoot = resolve(repoRoot, "data/research/batches");
const batchDirectories = readdirSync(batchRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(batchRoot, entry.name));
const museotikDirectory = resolve(batchRoot, "museotik-fournier-2026-09-23");

const publicReferenceSchema = catalogReferenceSchema.safeExtend({
  claims: z.array(
    z.object({
      attribute: z.string(),
      value: z.unknown(),
      certainty: certaintySchema,
      sourceIds: z.array(z.string()).min(1),
      locator: z.string().nullable(),
      note: z.string().nullable(),
    }),
  ),
  sources: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        organization: z.string().nullable(),
        quality: z.enum(["A", "B", "C", "D"]),
        url: z.string().url(),
        accessedAt: z.string().date().nullable(),
        locator: z.string().nullable(),
      }),
    )
    .min(1),
});

function readJsonl<T>(path: string): T[] {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as T;
      } catch (error) {
        throw new Error(`${path}:${index + 1}: ${String(error)}`);
      }
    });
}

function readBatch(directory: string) {
  return {
    batch: researchBatchSchema.parse(JSON.parse(readFileSync(`${directory}/batch.json`, "utf8"))),
    candidates: readJsonl(`${directory}/candidates.jsonl`).map((row) =>
      catalogCandidateSchema.parse(row),
    ),
    coverage: readJsonl(`${directory}/coverage.jsonl`).map((row) =>
      sourceCoverageSchema.parse(row),
    ),
  };
}

describe("checked-in catalog research corpus", () => {
  it("matches schemas and has no broken evidence, IDs, decisions, or active duplicates", () => {
    const sources = readJsonl(`${repoRoot}/data/research/sources.jsonl`).map((row) =>
      catalogSourceSchema.parse(row),
    );
    const references = readJsonl(`${repoRoot}/data/catalog/references.jsonl`).map((row) =>
      catalogReferenceSchema.parse(row),
    );
    const snapshots = batchDirectories.map(readBatch);
    const candidates = snapshots.flatMap((snapshot) => snapshot.candidates);
    const assertions = readJsonl(`${repoRoot}/data/catalog/assertions.jsonl`).map((row) =>
      catalogAssertionSchema.parse(row),
    );
    const decisions = readJsonl(`${repoRoot}/data/research/decisions.jsonl`).map((row) =>
      researchDecisionSchema.parse(row),
    );
    const issues = validateCatalogCorpus({
      sources,
      references,
      candidates,
      assertions,
      batches: snapshots.map((snapshot) => snapshot.batch),
      decisions,
    });
    const museotik = snapshots.find(
      (snapshot) => snapshot.batch.slug === "museotik-fournier-2026-09-23",
    );
    if (!museotik) throw new Error("The checked MUSEOTIK research batch is missing.");
    const coverage = snapshots.flatMap((snapshot) => snapshot.coverage);
    const batchDecisions = decisions.filter((decision) => decision.batchId === museotik.batch.id);

    expect(issues).toEqual([]);
    expect(coverage.length).toBeGreaterThan(0);
    expect(coverage.find((row) => row.batchId === museotik.batch.id)?.retrievedCount).toBe(
      museotik.candidates.length,
    );
    expect(
      museotik.candidates.filter((candidate) => candidate.status === "accepted").length,
    ).toBeGreaterThanOrEqual(11);
    expect(
      museotik.candidates.filter((candidate) => candidate.status === "needs_more_evidence").length,
    ).toBeGreaterThanOrEqual(1);
    expect(batchDecisions.length).toBeGreaterThanOrEqual(12);
    expect(assertions.every((assertion) => assertion.sourceIds.length > 0)).toBe(true);
    expect(new Set(references.map((reference) => reference.publicId)).size).toBe(references.length);

    const sourceReference = references[0];
    const targetReference = references[1];
    if (!sourceReference || !targetReference)
      throw new Error("Merge fixture references are missing.");
    const sourceCandidate = candidates.find(
      (candidate) => candidate.acceptedReferencePublicId === sourceReference.publicId,
    );
    const targetCandidate = candidates.find(
      (candidate) => candidate.acceptedReferencePublicId === targetReference.publicId,
    );
    if (!sourceCandidate || !targetCandidate)
      throw new Error("Merge fixture references are missing.");
    const mergedReferences = references.map((reference) =>
      reference.publicId === sourceReference.publicId
        ? {
            ...reference,
            status: "merged" as const,
            mergedIntoPublicId: targetReference.publicId,
          }
        : reference,
    );
    const mergedCandidates = candidates.map((candidate) =>
      candidate.id === sourceCandidate.id
        ? {
            ...candidate,
            status: "merged" as const,
            acceptedReferencePublicId: null,
            mergedIntoCandidateId: targetCandidate.id,
          }
        : candidate,
    );
    const dispositionAt = "2026-09-24T00:00:00.000Z";
    const mergeDecisions = [
      researchDecisionSchema.parse({
        id: "decision:test-reference-merge",
        batchId: sourceCandidate.batchId,
        subjectType: "reference",
        subjectId: sourceReference.publicId,
        decision: "merged",
        mergeTargetType: "reference",
        mergeTargetId: targetReference.publicId,
        decidedAt: dispositionAt,
        reviewer: "Test reviewer",
        rationale: "Temporary merge invariant fixture.",
        sourceIds: [sourceCandidate.sourceId],
      }),
      researchDecisionSchema.parse({
        id: "decision:test-candidate-merge",
        batchId: sourceCandidate.batchId,
        subjectType: "candidate",
        subjectId: sourceCandidate.id,
        decision: "merged",
        mergeTargetType: "candidate",
        mergeTargetId: targetCandidate.id,
        decidedAt: dispositionAt,
        reviewer: "Test reviewer",
        rationale: "Temporary merge invariant fixture.",
        sourceIds: [sourceCandidate.sourceId],
      }),
    ];
    expect(
      validateCatalogCorpus({
        sources,
        references: mergedReferences,
        candidates: mergedCandidates,
        assertions,
        batches: snapshots.map((snapshot) => snapshot.batch),
        decisions: [...decisions, ...mergeDecisions],
      }),
    ).toEqual([]);
  });

  it("validates the full source-detail snapshot and keeps pending records out of the public index", () => {
    const candidates = batchDirectories.flatMap((directory) =>
      readJsonl(`${directory}/candidates.jsonl`).map((row) => catalogCandidateSchema.parse(row)),
    );
    const references = readJsonl(`${repoRoot}/data/catalog/references.jsonl`).map((row) =>
      catalogReferenceSchema.parse(row),
    );
    const museotikCandidates = candidates.filter(
      (candidate) => candidate.batchId === "batch:museotik-fournier-2026-09-23",
    );
    const itemDetails = readJsonl(`${museotikDirectory}/item-details.jsonl`).map((row) =>
      catalogSourceRecordSchema.parse(row),
    );
    const publicIndex = (
      JSON.parse(readFileSync(`${repoRoot}/data/catalog/public-index.json`, "utf8")) as unknown[]
    ).map((reference) => publicReferenceSchema.parse(reference));
    const redirectIndex = JSON.parse(
      readFileSync(`${repoRoot}/data/catalog/redirect-index.json`, "utf8"),
    ) as Array<{ slug: string; publicId: string; targetSlug: string; targetPublicId: string }>;

    expect(itemDetails).toHaveLength(museotikCandidates.length);
    expect(itemDetails.map((details) => details.sourceRecordId).sort()).toEqual(
      museotikCandidates.map((candidate) => candidate.sourceRecordId).sort(),
    );
    expect(itemDetails.every((details) => details.httpStatus === 200)).toBe(true);
    expect(new Set(itemDetails.map((details) => details.sourceRecordId)).size).toBe(
      itemDetails.length,
    );
    expect(itemDetails.every((details) => details.otherDenominations !== null)).toBe(true);
    expect(
      new Set(
        itemDetails.map((details) => details.otherDenominations?.normalize("NFKD").toLowerCase()),
      ).size,
    ).toBe(itemDetails.length);
    expect(publicIndex.map((reference) => reference.publicId).sort()).toEqual(
      references
        .filter((reference) => reference.status === "active")
        .map((reference) => reference.publicId)
        .sort(),
    );
    expect(redirectIndex.map((reference) => reference.publicId).sort()).toEqual(
      references
        .filter((reference) => reference.status === "merged")
        .map((reference) => reference.publicId)
        .sort(),
    );
    expect(
      redirectIndex.every((redirect) =>
        references.some(
          (reference) =>
            reference.status === "active" &&
            reference.publicId === redirect.targetPublicId &&
            reference.slug === redirect.targetSlug,
        ),
      ),
    ).toBe(true);
    expect(
      publicIndex.every((reference) =>
        reference.claims.every((claim) =>
          claim.sourceIds.every((sourceId) => reference.evidenceSourceIds.includes(sourceId)),
        ),
      ),
    ).toBe(true);
    expect(JSON.stringify(publicIndex)).not.toMatch(
      /storageLocation|privateNote|acquisitionPrice|donorEmail/i,
    );
  });

  it("rejects accepted candidates without a permanent reference ID", () => {
    const candidate = {
      id: "candidate:test-1",
      batchId: "batch:test",
      sourceId: "source:test",
      sourceRecordId: "record:1",
      sourceRecordUrl: "https://example.org/record/1",
      status: "accepted",
      title: "Test",
      fingerprint: "test|1900",
      rawRecord: {},
      acceptedReferencePublicId: null,
    };

    expect(catalogCandidateSchema.safeParse(candidate).success).toBe(false);
  });

  it("requires reference disposition decisions to preserve merge targets and evidence", () => {
    const base = {
      id: "decision:reference-merge-1",
      batchId: "batch:test",
      subjectType: "reference",
      subjectId: "LCDN-REF-000001",
      decision: "merged",
      mergeTargetType: "reference",
      mergeTargetId: "LCDN-REF-000002",
      decidedAt: "2026-01-01T00:00:00.000Z",
      reviewer: "Reviewer",
      rationale: "The records describe the same edition.",
      sourceIds: ["source:test"],
    };
    expect(referenceDispositionDecisionSchema.safeParse(base).success).toBe(true);
    expect(
      referenceDispositionDecisionSchema.safeParse({ ...base, mergeTargetId: null }).success,
    ).toBe(false);
    expect(referenceDispositionDecisionSchema.safeParse({ ...base, sourceIds: [] }).success).toBe(
      false,
    );
  });
});
