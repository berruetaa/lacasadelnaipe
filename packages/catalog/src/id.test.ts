import { describe, expect, it } from "vitest";
import { catalogIdSchema, formatCatalogId } from "./id";

describe("LCDN public identifiers", () => {
  it("formats stable zero-padded identifiers", () => {
    expect(formatCatalogId("object", 1)).toBe("LCDN-OBJ-000001");
    expect(formatCatalogId("reference", 42)).toBe("LCDN-REF-000042");
  });

  it("rejects invalid identifiers", () => {
    expect(catalogIdSchema.safeParse("OBJ-1").success).toBe(false);
    expect(() => formatCatalogId("object", 0)).toThrow(RangeError);
  });
});
