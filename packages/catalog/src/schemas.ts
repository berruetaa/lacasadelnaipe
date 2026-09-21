import { z } from "zod";
import { catalogIdSchema } from "./id";
import {
  acquisitionMethods,
  certaintyLevels,
  completenessStates,
  conditionStates,
  openingStates,
  sourceKinds,
  suitSystems,
} from "./values";

export const certaintySchema = z.enum(certaintyLevels);
export const suitSystemSchema = z.enum(suitSystems);
export const openingStateSchema = z.enum(openingStates);
export const completenessSchema = z.enum(completenessStates);
export const conditionSchema = z.enum(conditionStates);
export const acquisitionMethodSchema = z.enum(acquisitionMethods);
export const sourceKindSchema = z.enum(sourceKinds);

export const catalogReferenceSchema = z
  .object({
    publicId: catalogIdSchema.refine((id) => id.startsWith("LCDN-REF-")),
    slug: z.string().min(1).max(160),
    title: z.string().min(1).max(300),
    manufacturer: z.string().max(200).nullable().default(null),
    originCountry: z.string().length(2).nullable().default(null),
    suitSystem: suitSystemSchema.default("unknown"),
    pattern: z.string().max(200).nullable().default(null),
    dateLabel: z.string().max(100).nullable().default(null),
    dateStart: z.number().int().min(1000).max(2200).nullable().default(null),
    dateEnd: z.number().int().min(1000).max(2200).nullable().default(null),
    certainty: certaintySchema.default("unknown"),
  })
  .superRefine((value, context) => {
    if (value.dateStart !== null && value.dateEnd !== null && value.dateStart > value.dateEnd) {
      context.addIssue({
        code: "custom",
        path: ["dateEnd"],
        message: "dateEnd must be greater than or equal to dateStart",
      });
    }
  });

export const collectionObjectSchema = z.object({
  publicId: catalogIdSchema.refine((id) => id.startsWith("LCDN-OBJ-")),
  referencePublicId: catalogIdSchema.refine((id) => id.startsWith("LCDN-REF-")),
  openingState: openingStateSchema.default("unknown"),
  completeness: completenessSchema.default("unknown"),
  condition: conditionSchema.default("unknown"),
  provenanceSummary: z.string().max(4_000).nullable().default(null),
});

export type CatalogReferenceInput = z.input<typeof catalogReferenceSchema>;
export type CatalogReference = z.output<typeof catalogReferenceSchema>;
export type CollectionObjectInput = z.input<typeof collectionObjectSchema>;
export type CollectionObject = z.output<typeof collectionObjectSchema>;
