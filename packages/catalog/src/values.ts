export const suitSystems = [
  "spanish",
  "italian",
  "french",
  "german",
  "swiss",
  "portuguese_historical",
  "hanafuda",
  "tarot_game",
  "regional",
  "hybrid",
  "other",
  "unknown",
] as const;

export const certaintyLevels = [
  "confirmed",
  "highly_probable",
  "probable",
  "possible",
  "unknown",
] as const;

export const openingStates = [
  "factory_sealed",
  "original_wrapper_intact",
  "original_wrapper_opened",
  "opened_complete",
  "opened_incomplete",
  "loose_cards",
  "repackaged",
  "unknown",
] as const;

export const completenessStates = [
  "complete",
  "apparently_complete",
  "incomplete",
  "fragmentary",
  "unknown",
] as const;

export const conditionStates = [
  "excellent",
  "good",
  "fair",
  "poor",
  "critical",
  "unknown",
] as const;

export const acquisitionMethods = [
  "purchase",
  "donation",
  "bequest",
  "transfer",
  "exchange",
  "documentary_record",
  "unknown",
] as const;

export const sourceKinds = [
  "physical_object",
  "museum_collection",
  "national_library_catalog",
  "specialist_database",
  "catalog_record",
  "manufacturer_catalog",
  "book",
  "periodical",
  "press",
  "commercial_record",
  "trademark_record",
  "advertisement",
  "auction_catalog",
  "external_collection",
  "interview",
  "photograph",
  "correspondence",
  "academic_publication",
  "institutional_website",
  "other",
] as const;

export const sourceQualityLevels = ["A", "B", "C", "D"] as const;

export const referenceStatuses = ["active", "merged", "withdrawn"] as const;

export const researchCandidateStates = [
  "candidate",
  "researching",
  "review",
  "needs_more_evidence",
  "accepted",
  "merged",
  "rejected",
  "withdrawn",
] as const;

export const researchBatchStates = ["open", "review", "accepted", "closed"] as const;

export const claimStatuses = ["proposed", "accepted", "rejected", "superseded"] as const;

export const catalogEntityKinds = [
  "manufacturer",
  "printer",
  "publisher",
  "brand",
  "organization",
  "person",
  "place",
  "pattern",
  "collection",
  "classification",
] as const;

export const catalogEntityRoles = [
  "manufacturer",
  "printer",
  "publisher",
  "brand",
  "designer",
  "distributor",
  "sponsor",
  "subject",
  "place_of_production",
  "classification",
] as const;

export const mergeTargets = ["reference", "candidate"] as const;
