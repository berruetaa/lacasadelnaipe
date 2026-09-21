import {
  acquisitionMethods,
  certaintyLevels,
  completenessStates,
  conditionStates,
  openingStates,
  sourceKinds,
  suitSystems,
} from "@lacasadelnaipe/catalog";
import { sql } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const certaintyEnum = pgEnum("certainty", certaintyLevels);
export const suitSystemEnum = pgEnum("suit_system", suitSystems);
export const openingStateEnum = pgEnum("opening_state", openingStates);
export const completenessEnum = pgEnum("completeness", completenessStates);
export const conditionEnum = pgEnum("condition", conditionStates);
export const acquisitionMethodEnum = pgEnum("acquisition_method", acquisitionMethods);
export const sourceKindEnum = pgEnum("source_kind", sourceKinds);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const catalogReferences = pgTable(
  "catalog_references",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    publicId: text("public_id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    manufacturer: text("manufacturer"),
    originCountry: text("origin_country"),
    suitSystem: suitSystemEnum("suit_system").notNull().default("unknown"),
    pattern: text("pattern"),
    dateLabel: text("date_label"),
    dateStart: integer("date_start"),
    dateEnd: integer("date_end"),
    certainty: certaintyEnum("certainty").notNull().default("unknown"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("catalog_references_public_id_uq").on(table.publicId),
    uniqueIndex("catalog_references_slug_uq").on(table.slug),
  ],
);

export const acquisitions = pgTable(
  "acquisitions",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    publicId: text("public_id").notNull(),
    method: acquisitionMethodEnum("method").notNull().default("unknown"),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }),
    provenanceNote: text("provenance_note"),
    privateNote: text("private_note"),
    ...timestamps,
  },
  (table) => [uniqueIndex("acquisitions_public_id_uq").on(table.publicId)],
);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    ...timestamps,
  },
  (table) => [uniqueIndex("collections_code_uq").on(table.code)],
);

export const collectionObjects = pgTable(
  "collection_objects",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    publicId: text("public_id").notNull(),
    referenceId: uuid("reference_id").references(() => catalogReferences.id, {
      onDelete: "set null",
    }),
    acquisitionId: uuid("acquisition_id").references(() => acquisitions.id, {
      onDelete: "set null",
    }),
    openingState: openingStateEnum("opening_state").notNull().default("unknown"),
    completeness: completenessEnum("completeness").notNull().default("unknown"),
    condition: conditionEnum("condition").notNull().default("unknown"),
    provenanceSummary: text("provenance_summary"),
    storageLocation: text("storage_location"),
    privateNote: text("private_note"),
    ...timestamps,
  },
  (table) => [uniqueIndex("collection_objects_public_id_uq").on(table.publicId)],
);

export const objectCollections = pgTable(
  "object_collections",
  {
    objectId: uuid("object_id")
      .notNull()
      .references(() => collectionObjects.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.objectId, table.collectionId] })],
);

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  kind: sourceKindEnum("kind").notNull(),
  title: text("title").notNull(),
  citation: text("citation"),
  url: text("url"),
  accessedAt: timestamp("accessed_at", { withTimezone: true }),
  ...timestamps,
});

export const referenceSources = pgTable(
  "reference_sources",
  {
    referenceId: uuid("reference_id")
      .notNull()
      .references(() => catalogReferences.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    note: text("note"),
  },
  (table) => [primaryKey({ columns: [table.referenceId, table.sourceId] })],
);
