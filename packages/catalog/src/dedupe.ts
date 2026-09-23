import type { CatalogReferenceInput } from "./schemas";

const normalize = (value: string | null | undefined): string =>
  (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(?<=\p{L})\.(?=\p{L}|$)/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

/**
 * Stable, explainable fingerprint for duplicate suggestions. A fingerprint is
 * not proof that two records are the same edition; it deliberately excludes
 * descriptive claims that may be missing or uncertain.
 */
export function referenceFingerprint(
  reference: Pick<
    CatalogReferenceInput,
    | "title"
    | "manufacturer"
    | "originCountry"
    | "dateStart"
    | "dateEnd"
    | "editionCode"
    | "pattern"
    | "catalogCodes"
  >,
): string {
  return [
    normalize(reference.title),
    normalize(reference.manufacturer),
    normalize(reference.originCountry),
    reference.dateStart ?? "",
    reference.dateEnd ?? "",
    normalize(reference.editionCode),
    normalize(reference.pattern),
    (reference.catalogCodes ?? [])
      .map(({ authority, code }) => `${normalize(authority)}:${normalize(code)}`)
      .sort()
      .join(";"),
  ].join("|");
}

export type DuplicateSuggestion<T> = {
  candidate: T;
  score: number;
  reasons: string[];
};

/**
 * Return transparent duplicate suggestions. Exact external catalogue codes
 * and normalized fingerprints outrank weaker title/date matches. Callers
 * still need a documented human merge decision.
 */
export function suggestDuplicates<
  T extends {
    title: string;
    aliases?: string[];
    manufacturer?: string | null;
    originCountry?: string | null;
    dateStart?: number | null;
    dateEnd?: number | null;
    editionCode?: string | null;
    pattern?: string | null;
    catalogCodes?: Array<{ authority: string; code: string }>;
  },
>(reference: T, others: readonly T[]): DuplicateSuggestion<T>[] {
  const refCodes = new Set(
    (reference.catalogCodes ?? []).map(
      ({ authority, code }) => `${normalize(authority)}:${normalize(code)}`,
    ),
  );
  const referenceTitles = new Set(
    [reference.title, ...(reference.aliases ?? [])]
      .map((value) => normalize(value))
      .filter(Boolean),
  );
  const manufacturer = normalize(reference.manufacturer);
  const output: DuplicateSuggestion<T>[] = [];

  for (const candidate of others) {
    if (candidate === reference) continue;
    const reasons: string[] = [];
    let score = 0;
    const candidateCodes = (candidate.catalogCodes ?? []).map(
      ({ authority, code }) => `${normalize(authority)}:${normalize(code)}`,
    );

    if (candidateCodes.some((code) => refCodes.has(code))) {
      score += 100;
      reasons.push("same external catalogue code");
    }
    if (referenceFingerprint(reference) === referenceFingerprint(candidate)) {
      score += 80;
      reasons.push("same normalized reference fingerprint");
    }
    const candidateTitles = [candidate.title, ...(candidate.aliases ?? [])]
      .map((value) => normalize(value))
      .filter(Boolean);
    if (candidateTitles.some((value) => referenceTitles.has(value))) {
      score += 25;
      reasons.push("same normalized title or alias");
    }
    if (manufacturer && manufacturer === normalize(candidate.manufacturer)) {
      score += 15;
      reasons.push("same normalized manufacturer");
    }
    if (
      reference.dateStart !== null &&
      reference.dateStart !== undefined &&
      reference.dateStart === candidate.dateStart &&
      reference.dateEnd === candidate.dateEnd
    ) {
      score += 15;
      reasons.push("same date interval");
    }
    if (score > 0) output.push({ candidate, score, reasons });
  }

  return output.sort(
    (a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title),
  );
}
