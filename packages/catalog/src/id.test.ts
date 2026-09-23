import { describe, expect, it } from "vitest";
import {
  catalogIdSchema,
  collectionObjectSchema,
  formatCatalogId,
  referenceFingerprint,
  suggestDuplicates,
} from "./index";

describe("LCDN public identifiers", () => {
  it("formats stable zero-padded identifiers", () => {
    expect(formatCatalogId("object", 1)).toBe("LCDN-OBJ-000001");
    expect(formatCatalogId("reference", 42)).toBe("LCDN-REF-000042");
    expect(formatCatalogId("acquisition", 9)).toBe("LCDN-ACQ-000009");
  });

  it("rejects invalid identifiers", () => {
    expect(catalogIdSchema.safeParse("OBJ-1").success).toBe(false);
    expect(() => formatCatalogId("object", 0)).toThrow(RangeError);
  });

  it("allows an unidentified physical object without inventing a reference", () => {
    const object = collectionObjectSchema.parse({ publicId: "LCDN-OBJ-000001" });
    expect(object.referencePublicId).toBeNull();
    expect(object.condition).toBe("unknown");
  });
});

describe("catalog deduplication helpers", () => {
  it("normalizes accents and punctuation deterministically", () => {
    const first = referenceFingerprint({
      title: "Baraja Española — Nacional",
      manufacturer: "Heraclio Fournier, S.A.",
      originCountry: "ES",
      dateStart: 1970,
      dateEnd: 1970,
      editionCode: "25 / 50",
      pattern: "Castilian",
    });
    const second = referenceFingerprint({
      title: "baraja espanola nacional",
      manufacturer: "Heraclio Fournier SA",
      originCountry: "ES",
      dateStart: 1970,
      dateEnd: 1970,
      editionCode: "25-50",
      pattern: "Castilian",
    });
    expect(first).toBe(second);
  });

  it("returns explainable possible matches without merging them", () => {
    const reference = {
      title: "Baraja Española",
      manufacturer: "Heraclio Fournier",
      originCountry: "ES",
      dateStart: 1970,
      dateEnd: 1970,
      editionCode: "25",
      pattern: "Castilian",
      catalogCodes: [{ authority: "Fournier", code: "25" }],
    };
    const other = { ...reference, catalogCodes: [{ authority: "Fournier", code: "25" }] };
    const distinct = {
      ...reference,
      editionCode: "26",
      dateStart: 1971,
      dateEnd: 1971,
      catalogCodes: [],
    };
    const aliasMatch = { ...distinct, title: "Naipe clásico", aliases: ["Baraja Española"] };
    const matches = suggestDuplicates(reference, [other, distinct]);
    expect(matches).toHaveLength(2);
    expect(matches[0]?.score).toBeGreaterThan(matches[1]?.score ?? 0);
    expect(matches[0]?.reasons).toContain("same external catalogue code");
    expect(suggestDuplicates(reference, [aliasMatch])[0]?.reasons).toContain(
      "same normalized title or alias",
    );
  });
});
