import {
  acquisitionMethods,
  certaintyLevels,
  completenessStates,
  conditionStates,
  openingStates,
  sourceKinds,
  suitSystems,
} from "@lacasadelnaipe/catalog";
import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
    certainty: text("certainty", { enum: certaintyLevels }).notNull().default("unknown"),
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

export const sources = sqliteTable("sources", {
  id: id("id"),
  kind: text("kind", { enum: sourceKinds }).notNull(),
  title: text("title").notNull(),
  citation: text("citation"),
  url: text("url"),
  accessedAt: integer("accessed_at", { mode: "timestamp_ms" }),
  ...timestamps,
});

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
