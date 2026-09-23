import {
  acquisitionMethods,
  catalogEntityKinds,
  catalogEntityRoles,
  certaintyLevels,
  claimStatuses,
  completenessStates,
  conditionStates,
  openingStates,
  referenceStatuses,
  researchBatchStates,
  researchCandidateStates,
  sourceKinds,
  sourceQualityLevels,
  suitSystems,
} from "@lacasadelnaipe/catalog";
import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};

const id = (name: string) =>
  text(name)
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const catalogReferences = sqliteTable(
  "catalog_references",
  {
    id: id("id"),
    publicId: text("public_id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    manufacturer: text("manufacturer"),
    originCountry: text("origin_country"),
    suitSystem: text("suit_system", { enum: suitSystems }).notNull().default("unknown"),
    pattern: text("pattern"),
    dateLabel: text("date_label"),
    dateStart: integer("date_start"),
    dateEnd: integer("date_end"),
    status: text("status", { enum: referenceStatuses }).notNull().default("active"),
    mergedIntoReferenceId: text("merged_into_reference_id").references(
      (): AnySQLiteColumn => catalogReferences.id,
      {
        onDelete: "restrict",
      },
    ),
    attributesJson: text("attributes_json").notNull().default("{}"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("catalog_references_public_id_uq").on(table.publicId),
    uniqueIndex("catalog_references_slug_uq").on(table.slug),
    uniqueIndex("catalog_references_suit_system_slug_uq").on(table.suitSystem, table.slug),
  ],
);

export const acquisitions = sqliteTable(
  "acquisitions",
  {
    id: id("id"),
    publicId: text("public_id").notNull(),
    method: text("method", { enum: acquisitionMethods }).notNull().default("unknown"),
    acquiredAt: integer("acquired_at", { mode: "timestamp_ms" }),
    provenanceNote: text("provenance_note"),
    privateNote: text("private_note"),
    ...timestamps,
  },
  (table) => [uniqueIndex("acquisitions_public_id_uq").on(table.publicId)],
);

export const collections = sqliteTable(
  "collections",
  {
    id: id("id"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    ...timestamps,
  },
  (table) => [uniqueIndex("collections_code_uq").on(table.code)],
);

export const collectionObjects = sqliteTable(
  "collection_objects",
  {
    id: id("id"),
    publicId: text("public_id").notNull(),
    referenceId: text("reference_id").references(() => catalogReferences.id, {
      onDelete: "set null",
    }),
    acquisitionId: text("acquisition_id").references(() => acquisitions.id, {
      onDelete: "set null",
    }),
    openingState: text("opening_state", { enum: openingStates }).notNull().default("unknown"),
    completeness: text("completeness", { enum: completenessStates }).notNull().default("unknown"),
    condition: text("condition", { enum: conditionStates }).notNull().default("unknown"),
    provenanceSummary: text("provenance_summary"),
    storageLocation: text("storage_location"),
    privateNote: text("private_note"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("collection_objects_public_id_uq").on(table.publicId),
    uniqueIndex("collection_objects_reference_public_uq").on(table.referenceId, table.publicId),
  ],
);

export const objectCollections = sqliteTable(
  "object_collections",
  {
    objectId: text("object_id")
      .notNull()
      .references(() => collectionObjects.id, { onDelete: "cascade" }),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.objectId, table.collectionId] })],
);

export const sources = sqliteTable(
  "sources",
  {
    id: id("id"),
    kind: text("kind", { enum: sourceKinds }).notNull(),
    quality: text("quality", { enum: sourceQualityLevels }).notNull().default("C"),
    title: text("title").notNull(),
    organization: text("organization"),
    creator: text("creator"),
    citation: text("citation"),
    url: text("url"),
    accessedAt: integer("accessed_at", { mode: "timestamp_ms" }),
    publicationDate: text("publication_date"),
    locator: text("locator"),
    archivedUrl: text("archived_url"),
    rightsNote: text("rights_note"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("sources_kind_quality_idx").on(table.kind, table.quality),
    uniqueIndex("sources_url_uq").on(table.url).where(sql`${table.url} IS NOT NULL`),
  ],
);

export const referenceSources = sqliteTable(
  "reference_sources",
  {
    referenceId: text("reference_id")
      .notNull()
      .references(() => catalogReferences.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    note: text("note"),
  },
  (table) => [primaryKey({ columns: [table.referenceId, table.sourceId] })],
);

export const researchBatches = sqliteTable(
  "research_batches",
  {
    id: id("id"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    scope: text("scope").notNull(),
    status: text("status", { enum: researchBatchStates }).notNull().default("open"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    method: text("method").notNull(),
    operator: text("operator").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("research_batches_slug_uq").on(table.slug)],
);

export const researchBatchSources = sqliteTable(
  "research_batch_sources",
  {
    batchId: text("batch_id")
      .notNull()
      .references(() => researchBatches.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.batchId, table.sourceId] })],
);

export const catalogCandidates = sqliteTable(
  "catalog_candidates",
  {
    id: id("id"),
    batchId: text("batch_id")
      .notNull()
      .references(() => researchBatches.id, { onDelete: "restrict" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    sourceRecordId: text("source_record_id").notNull(),
    sourceRecordUrl: text("source_record_url").notNull(),
    status: text("status", { enum: researchCandidateStates }).notNull().default("candidate"),
    title: text("title").notNull(),
    dateLabel: text("date_label"),
    inventoryNumber: text("inventory_number"),
    manufacturerLabel: text("manufacturer_label"),
    fingerprint: text("fingerprint").notNull(),
    rawRecordJson: text("raw_record_json").notNull(),
    acceptedReferenceId: text("accepted_reference_id").references(() => catalogReferences.id, {
      onDelete: "restrict",
    }),
    mergedIntoCandidateId: text("merged_into_candidate_id").references(
      (): AnySQLiteColumn => catalogCandidates.id,
      {
        onDelete: "restrict",
      },
    ),
    dispositionNote: text("disposition_note"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("catalog_candidates_source_record_uq").on(table.sourceId, table.sourceRecordId),
    index("catalog_candidates_fingerprint_idx").on(table.fingerprint),
    index("catalog_candidates_status_idx").on(table.status, table.batchId),
    check(
      "catalog_candidates_accepted_reference_ck",
      sql`(${table.status} = 'accepted' AND ${table.acceptedReferenceId} IS NOT NULL) OR (${table.status} <> 'accepted' AND ${table.acceptedReferenceId} IS NULL)`,
    ),
    check(
      "catalog_candidates_merged_candidate_ck",
      sql`(${table.status} = 'merged' AND ${table.mergedIntoCandidateId} IS NOT NULL) OR (${table.status} <> 'merged' AND ${table.mergedIntoCandidateId} IS NULL)`,
    ),
  ],
);

export const candidateSourceEvidence = sqliteTable(
  "candidate_source_evidence",
  {
    candidateId: text("candidate_id")
      .notNull()
      .references(() => catalogCandidates.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    locator: text("locator"),
    note: text("note"),
  },
  (table) => [primaryKey({ columns: [table.candidateId, table.sourceId] })],
);

export const researchDecisions = sqliteTable(
  "research_decisions",
  {
    id: id("id"),
    batchId: text("batch_id")
      .notNull()
      .references(() => researchBatches.id, { onDelete: "restrict" }),
    subjectType: text("subject_type", { enum: ["reference", "candidate"] }).notNull(),
    subjectId: text("subject_id").notNull(),
    decision: text("decision", {
      enum: ["accepted", "rejected", "merged", "needs_more_evidence", "withdrawn"],
    }).notNull(),
    mergeTargetType: text("merge_target_type", { enum: ["reference", "candidate"] }),
    mergeTargetId: text("merge_target_id"),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }).notNull(),
    reviewer: text("reviewer").notNull(),
    rationale: text("rationale").notNull(),
    ...timestamps,
  },
  (table) => [
    check(
      "research_decisions_merge_target_ck",
      sql`(${table.decision} = 'merged' AND ${table.mergeTargetType} IS NOT NULL AND ${table.mergeTargetId} IS NOT NULL) OR (${table.decision} <> 'merged' AND ${table.mergeTargetType} IS NULL AND ${table.mergeTargetId} IS NULL)`,
    ),
  ],
);

export const decisionSources = sqliteTable(
  "decision_sources",
  {
    decisionId: text("decision_id")
      .notNull()
      .references(() => researchDecisions.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.decisionId, table.sourceId] })],
);

export const catalogAssertions = sqliteTable(
  "catalog_assertions",
  {
    id: id("id"),
    referenceId: text("reference_id").references(() => catalogReferences.id, {
      onDelete: "cascade",
    }),
    candidateId: text("candidate_id").references(() => catalogCandidates.id, {
      onDelete: "cascade",
    }),
    attribute: text("attribute").notNull(),
    valueJson: text("value_json").notNull(),
    certainty: text("certainty", { enum: certaintyLevels }).notNull().default("unknown"),
    status: text("status", { enum: claimStatuses }).notNull().default("proposed"),
    locator: text("locator"),
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    check(
      "catalog_assertions_subject_ck",
      sql`(${table.referenceId} IS NOT NULL AND ${table.candidateId} IS NULL) OR (${table.referenceId} IS NULL AND ${table.candidateId} IS NOT NULL)`,
    ),
  ],
);

export const assertionSources = sqliteTable(
  "assertion_sources",
  {
    assertionId: text("assertion_id")
      .notNull()
      .references(() => catalogAssertions.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.assertionId, table.sourceId] })],
);

export const catalogEntities = sqliteTable(
  "catalog_entities",
  {
    id: id("id"),
    kind: text("kind", { enum: catalogEntityKinds }).notNull(),
    preferredName: text("preferred_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    countryCode: text("country_code"),
    region: text("region"),
    fromYear: integer("from_year"),
    toYear: integer("to_year"),
    description: text("description"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("catalog_entities_kind_normalized_name_uq").on(table.kind, table.normalizedName),
  ],
);

export const catalogEntityAliases = sqliteTable(
  "catalog_entity_aliases",
  {
    entityId: text("entity_id")
      .notNull()
      .references(() => catalogEntities.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.entityId, table.normalizedAlias] }),
    index("catalog_entity_aliases_lookup_idx").on(table.normalizedAlias),
  ],
);

export const catalogEntitySources = sqliteTable(
  "catalog_entity_sources",
  {
    entityId: text("entity_id")
      .notNull()
      .references(() => catalogEntities.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.entityId, table.sourceId] })],
);

export const referenceEntities = sqliteTable(
  "reference_entities",
  {
    referenceId: text("reference_id")
      .notNull()
      .references(() => catalogReferences.id, { onDelete: "cascade" }),
    entityId: text("entity_id")
      .notNull()
      .references(() => catalogEntities.id, { onDelete: "restrict" }),
    role: text("role", { enum: catalogEntityRoles }).notNull(),
    certainty: text("certainty", { enum: certaintyLevels }).notNull().default("unknown"),
  },
  (table) => [primaryKey({ columns: [table.referenceId, table.entityId, table.role] })],
);

export const referenceMerges = sqliteTable("reference_merges", {
  sourceReferenceId: text("source_reference_id")
    .primaryKey()
    .references(() => catalogReferences.id, { onDelete: "restrict" }),
  targetReferenceId: text("target_reference_id")
    .notNull()
    .references(() => catalogReferences.id, { onDelete: "restrict" }),
  decisionId: text("decision_id").references(() => researchDecisions.id, { onDelete: "restrict" }),
  rationale: text("rationale").notNull(),
  mergedAt: integer("merged_at", { mode: "timestamp_ms" }).notNull(),
});

export const sourceCoverage = sqliteTable("source_coverage", {
  id: id("id"),
  batchId: text("batch_id")
    .notNull()
    .references(() => researchBatches.id, { onDelete: "cascade" }),
  sourceId: text("source_id")
    .notNull()
    .references(() => sources.id, { onDelete: "restrict" }),
  scope: text("scope").notNull(),
  strategy: text("strategy").notNull(),
  queryJson: text("query_json").notNull(),
  expectedCount: integer("expected_count"),
  retrievedCount: integer("retrieved_count").notNull(),
  pagesReviewed: text("pages_reviewed"),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  notes: text("notes"),
  ...timestamps,
});

export const catalogMedia = sqliteTable(
  "catalog_media",
  {
    id: id("id"),
    referenceId: text("reference_id").references(() => catalogReferences.id, {
      onDelete: "cascade",
    }),
    candidateId: text("candidate_id").references(() => catalogCandidates.id, {
      onDelete: "cascade",
    }),
    objectId: text("object_id").references(() => collectionObjects.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    view: text("view", { enum: ["front", "back", "box", "sheet", "detail", "other", "unknown"] })
      .notNull()
      .default("unknown"),
    credit: text("credit"),
    rights: text("rights"),
    archivedUrl: text("archived_url"),
    ...timestamps,
  },
  (table) => [
    check(
      "catalog_media_subject_ck",
      sql`(${table.referenceId} IS NOT NULL AND ${table.candidateId} IS NULL AND ${table.objectId} IS NULL) OR (${table.referenceId} IS NULL AND ${table.candidateId} IS NOT NULL AND ${table.objectId} IS NULL) OR (${table.referenceId} IS NULL AND ${table.candidateId} IS NULL AND ${table.objectId} IS NOT NULL)`,
    ),
  ],
);
