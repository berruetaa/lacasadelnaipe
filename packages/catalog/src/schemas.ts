import { z } from "zod";
import { catalogIdSchema } from "./id";
import {
  acquisitionMethods,
  catalogEntityKinds,
  catalogEntityRoles,
  certaintyLevels,
  claimStatuses,
  completenessStates,
  conditionStates,
  mergeTargets,
  openingStates,
  referenceStatuses,
  researchBatchStates,
  researchCandidateStates,
  sourceKinds,
  sourceQualityLevels,
  suitSystems,
} from "./values";

const nullableText = (maximum: number) => z.string().trim().max(maximum).nullable().default(null);
const internalIdSchema = z.string().trim().min(1).max(160);
const publicReferenceIdSchema = catalogIdSchema.refine((id) => id.startsWith("LCDN-REF-"));
const urlSchema = z.string().url().max(2_048);

export const certaintySchema = z.enum(certaintyLevels);
export const suitSystemSchema = z.enum(suitSystems);
export const openingStateSchema = z.enum(openingStates);
export const completenessSchema = z.enum(completenessStates);
export const conditionSchema = z.enum(conditionStates);
export const acquisitionMethodSchema = z.enum(acquisitionMethods);
export const sourceKindSchema = z.enum(sourceKinds);
export const sourceQualitySchema = z.enum(sourceQualityLevels);
export const referenceStatusSchema = z.enum(referenceStatuses);
export const candidateStateSchema = z.enum(researchCandidateStates);
export const batchStateSchema = z.enum(researchBatchStates);
export const entityKindSchema = z.enum(catalogEntityKinds);
export const entityRoleSchema = z.enum(catalogEntityRoles);
export const claimStatusSchema = z.enum(claimStatuses);

export const catalogReferenceSchema = z
  .object({
    publicId: publicReferenceIdSchema,
    slug: z.string().trim().min(1).max(160),
    title: z.string().trim().min(1).max(300),
    aliases: z.array(z.string().trim().min(1).max(300)).default([]),
    status: referenceStatusSchema.default("active"),
    mergedIntoPublicId: publicReferenceIdSchema.nullable().default(null),
    manufacturer: nullableText(200),
    printer: nullableText(200),
    publisher: nullableText(200),
    brand: nullableText(200),
    originCountry: z.string().length(2).nullable().default(null),
    originRegion: nullableText(200),
    suitSystem: suitSystemSchema.default("unknown"),
    pattern: nullableText(200),
    regionalVariant: nullableText(200),
    dateLabel: nullableText(100),
    dateStart: z.number().int().min(1000).max(2200).nullable().default(null),
    dateEnd: z.number().int().min(1000).max(2200).nullable().default(null),
    editionCode: nullableText(120),
    cardCount: z.number().int().min(1).max(200).nullable().default(null),
    cardsPerSuit: z.number().int().min(1).max(50).nullable().default(null),
    additionalCards: z.array(z.string().trim().min(1).max(120)).default([]),
    indices: z.array(z.string().trim().min(1).max(120)).default([]),
    cardWidthMm: z.number().positive().max(500).nullable().default(null),
    cardHeightMm: z.number().positive().max(500).nullable().default(null),
    material: nullableText(200),
    backDesign: nullableText(1_000),
    theme: nullableText(500),
    language: z.array(z.string().trim().min(2).max(35)).default([]),
    catalogCodes: z
      .array(
        z.object({
          authority: z.string().trim().min(1).max(200),
          code: z.string().trim().min(1).max(200),
          url: urlSchema.nullable().default(null),
        }),
      )
      .default([]),
    evidenceSourceIds: z.array(internalIdSchema).min(1),
    notes: nullableText(4_000),
    createdAt: z.string().datetime().nullable().default(null),
    updatedAt: z.string().datetime().nullable().default(null),
  })
  .superRefine((value, context) => {
    if (value.dateStart !== null && value.dateEnd !== null && value.dateStart > value.dateEnd) {
      context.addIssue({
        code: "custom",
        path: ["dateEnd"],
        message: "dateEnd must be greater than or equal to dateStart",
      });
    }
    if (value.status === "merged" && value.mergedIntoPublicId === null) {
      context.addIssue({
        code: "custom",
        path: ["mergedIntoPublicId"],
        message: "Merged references must retain a redirect target",
      });
    }
    if (value.status !== "merged" && value.mergedIntoPublicId !== null) {
      context.addIssue({
        code: "custom",
        path: ["mergedIntoPublicId"],
        message: "Only merged references may have a redirect target",
      });
    }
    if (value.mergedIntoPublicId === value.publicId) {
      context.addIssue({
        code: "custom",
        path: ["mergedIntoPublicId"],
        message: "A reference cannot redirect to itself",
      });
    }
  });

export const collectionObjectSchema = z.object({
  publicId: catalogIdSchema.refine((id) => id.startsWith("LCDN-OBJ-")),
  referencePublicId: publicReferenceIdSchema.nullable().default(null),
  openingState: openingStateSchema.default("unknown"),
  completeness: completenessSchema.default("unknown"),
  condition: conditionSchema.default("unknown"),
  provenanceSummary: z.string().max(4_000).nullable().default(null),
});

export const acquisitionSchema = z.object({
  publicId: catalogIdSchema.refine((id) => id.startsWith("LCDN-ACQ-")),
  method: acquisitionMethodSchema.default("unknown"),
  acquiredAt: z.string().datetime().nullable().default(null),
  provenanceNote: z.string().max(4_000).nullable().default(null),
});

export const catalogSourceSchema = z.object({
  id: internalIdSchema,
  kind: sourceKindSchema,
  quality: sourceQualitySchema,
  title: z.string().trim().min(1).max(500),
  organization: nullableText(300),
  creator: nullableText(300),
  citation: nullableText(2_000),
  url: urlSchema.nullable().default(null),
  accessedAt: z.string().date().nullable().default(null),
  publicationDate: nullableText(100),
  locator: nullableText(500),
  archivedUrl: urlSchema.nullable().default(null),
  rightsNote: nullableText(1_000),
  notes: nullableText(2_000),
});

export const catalogSourceRecordSchema = z.object({
  id: internalIdSchema,
  sourceId: internalIdSchema,
  sourceRecordId: z.string().trim().min(1).max(300),
  sourceRecordUrl: urlSchema,
  httpStatus: z.literal(200),
  retrievedAt: z.string().datetime(),
  title: z.string().trim().min(1).max(300),
  inventoryNumber: nullableText(200),
  objectType: nullableText(200),
  otherDenominations: nullableText(300),
  authorship: nullableText(1_000),
  techniques: nullableText(500),
  materials: nullableText(250),
  dimensions: nullableText(300),
  theme: nullableText(500),
  frontDescription: nullableText(500),
  backDescription: nullableText(700),
  date: nullableText(100),
  period: nullableText(200),
  sourceRecordExcerpt: nullableText(1_000),
  _labelsFound: z.array(z.string().trim().min(1).max(100)),
});

export const catalogEntitySchema = z.object({
  id: internalIdSchema,
  kind: entityKindSchema,
  preferredName: z.string().trim().min(1).max(300),
  aliases: z.array(z.string().trim().min(1).max(300)).default([]),
  countryCode: z.string().length(2).nullable().default(null),
  region: nullableText(200),
  fromYear: z.number().int().min(1000).max(2200).nullable().default(null),
  toYear: z.number().int().min(1000).max(2200).nullable().default(null),
  description: nullableText(2_000),
  sourceIds: z.array(internalIdSchema).default([]),
});

export const referenceEntityLinkSchema = z.object({
  referencePublicId: publicReferenceIdSchema,
  entityId: internalIdSchema,
  role: entityRoleSchema,
  certainty: certaintySchema,
  sourceIds: z.array(internalIdSchema).min(1),
});

export const catalogAssertionSchema = z.object({
  id: internalIdSchema,
  subjectType: z.enum(["reference", "candidate"]),
  subjectId: internalIdSchema,
  attribute: z.string().trim().min(1).max(120),
  value: z.unknown(),
  certainty: certaintySchema,
  status: claimStatusSchema.default("proposed"),
  sourceIds: z.array(internalIdSchema).min(1),
  locator: nullableText(500),
  note: nullableText(2_000),
});

export const catalogMediaSchema = z.object({
  id: internalIdSchema,
  subjectType: z.enum(["reference", "candidate", "object"]),
  subjectId: internalIdSchema,
  url: urlSchema,
  sourceId: internalIdSchema,
  view: z.enum(["front", "back", "box", "sheet", "detail", "other", "unknown"]).default("unknown"),
  credit: nullableText(500),
  rights: nullableText(1_000),
  archivedUrl: urlSchema.nullable().default(null),
});

export const researchBatchSchema = z.object({
  id: internalIdSchema,
  slug: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(300),
  scope: z.string().trim().min(1).max(1_000),
  status: batchStateSchema.default("open"),
  sourceIds: z.array(internalIdSchema).min(1),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable().default(null),
  method: z.string().trim().min(1).max(2_000),
  operator: z.string().trim().min(1).max(160),
});

export const catalogCandidateSchema = z
  .object({
    id: internalIdSchema,
    batchId: internalIdSchema,
    sourceId: internalIdSchema,
    sourceRecordId: z.string().trim().min(1).max(300),
    sourceRecordUrl: urlSchema,
    status: candidateStateSchema.default("candidate"),
    title: z.string().trim().min(1).max(300),
    aliases: z.array(z.string().trim().min(1).max(300)).default([]),
    dateLabel: nullableText(100),
    inventoryNumber: nullableText(200),
    manufacturerLabel: nullableText(300),
    fingerprint: z.string().trim().min(1).max(1_000),
    rawRecord: z.record(z.string(), z.unknown()),
    acceptedReferencePublicId: publicReferenceIdSchema.nullable().default(null),
    mergedIntoCandidateId: internalIdSchema.nullable().default(null),
    dispositionNote: nullableText(2_000),
  })
  .superRefine((value, context) => {
    if (value.status === "accepted" && value.acceptedReferencePublicId === null) {
      context.addIssue({
        code: "custom",
        path: ["acceptedReferencePublicId"],
        message: "Accepted candidates must point to their permanent public reference ID",
      });
    }
    if (value.status === "merged" && value.mergedIntoCandidateId === null) {
      context.addIssue({
        code: "custom",
        path: ["mergedIntoCandidateId"],
        message: "Merged candidates must retain their canonical candidate ID",
      });
    }
  });

export const researchDecisionSchema = z
  .object({
    id: internalIdSchema,
    batchId: internalIdSchema,
    subjectType: z.enum(["reference", "candidate"]),
    subjectId: internalIdSchema,
    decision: z.enum(["accepted", "rejected", "merged", "needs_more_evidence", "withdrawn"]),
    mergeTargetType: z.enum(mergeTargets).nullable().default(null),
    mergeTargetId: internalIdSchema.nullable().default(null),
    decidedAt: z.string().datetime(),
    reviewer: z.string().trim().min(1).max(160),
    rationale: z.string().trim().min(1).max(4_000),
    sourceIds: z.array(internalIdSchema).default([]),
  })
  .superRefine((value, context) => {
    if ((value.decision === "merged") !== (value.mergeTargetId !== null)) {
      context.addIssue({
        code: "custom",
        path: ["mergeTargetId"],
        message: "Merge decisions must name a target; other decisions must not",
      });
    }
    if ((value.mergeTargetId === null) !== (value.mergeTargetType === null)) {
      context.addIssue({
        code: "custom",
        path: ["mergeTargetType"],
        message: "Merge target type and ID must be provided together",
      });
    }
  });

export const referenceDispositionDecisionSchema = z
  .object({
    id: internalIdSchema,
    batchId: internalIdSchema,
    subjectType: z.literal("reference"),
    subjectId: publicReferenceIdSchema,
    decision: z.enum(["merged", "withdrawn"]),
    mergeTargetType: z.literal("reference").nullable().default(null),
    mergeTargetId: publicReferenceIdSchema.nullable().default(null),
    decidedAt: z.string().datetime(),
    reviewer: z.string().trim().min(1).max(160),
    rationale: z.string().trim().min(1).max(4_000),
    sourceIds: z.array(internalIdSchema).min(1),
  })
  .superRefine((value, context) => {
    if ((value.decision === "merged") !== (value.mergeTargetId !== null)) {
      context.addIssue({
        code: "custom",
        path: ["mergeTargetId"],
        message: "A reference merge needs a target; withdrawals must not name one",
      });
    }
    if (value.subjectId === value.mergeTargetId) {
      context.addIssue({
        code: "custom",
        path: ["mergeTargetId"],
        message: "A reference cannot be merged into itself",
      });
    }
  });

export const sourceCoverageSchema = z.object({
  id: internalIdSchema,
  batchId: internalIdSchema,
  sourceId: internalIdSchema,
  scope: z.string().trim().min(1).max(1_000),
  strategy: z.string().trim().min(1).max(2_000),
  query: z.record(z.string(), z.unknown()),
  expectedCount: z.number().int().min(0).nullable().default(null),
  retrievedCount: z.number().int().min(0),
  pagesReviewed: z.string().trim().max(500).nullable().default(null),
  completedAt: z.string().datetime().nullable().default(null),
  notes: nullableText(2_000),
});

export type CatalogReferenceInput = z.input<typeof catalogReferenceSchema>;
export type CatalogReference = z.output<typeof catalogReferenceSchema>;
export type CollectionObjectInput = z.input<typeof collectionObjectSchema>;
export type CollectionObject = z.output<typeof collectionObjectSchema>;
export type AcquisitionInput = z.input<typeof acquisitionSchema>;
export type Acquisition = z.output<typeof acquisitionSchema>;
export type CatalogSourceInput = z.input<typeof catalogSourceSchema>;
export type CatalogSource = z.output<typeof catalogSourceSchema>;
export type CatalogSourceRecord = z.output<typeof catalogSourceRecordSchema>;
export type CatalogAssertionInput = z.input<typeof catalogAssertionSchema>;
export type CatalogAssertion = z.output<typeof catalogAssertionSchema>;
export type CatalogCandidateInput = z.input<typeof catalogCandidateSchema>;
export type CatalogCandidate = z.output<typeof catalogCandidateSchema>;
export type ResearchBatchInput = z.input<typeof researchBatchSchema>;
export type ResearchBatch = z.output<typeof researchBatchSchema>;
export type ResearchDecision = z.output<typeof researchDecisionSchema>;
export type ReferenceDispositionDecision = z.output<typeof referenceDispositionDecisionSchema>;
