import { z } from "zod";

const serialPrefixes = {
  reference: "REF",
  object: "OBJ",
  acquisition: "ACQ",
  document: "DOC",
  library: "LIB",
  accessory: "ACC",
} as const;

export type SerialEntity = keyof typeof serialPrefixes;

export const catalogIdSchema = z
  .string()
  .regex(/^LCDN-(REF|OBJ|ACQ|DOC|LIB|ACC)-\d{6}$/, "Invalid LCDN identifier");

export type CatalogId = z.infer<typeof catalogIdSchema>;

export function formatCatalogId(entity: SerialEntity, sequence: number): CatalogId {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > 999_999) {
    throw new RangeError("LCDN sequence must be an integer between 1 and 999999");
  }

  return catalogIdSchema.parse(
    `LCDN-${serialPrefixes[entity]}-${sequence.toString().padStart(6, "0")}`,
  );
}
