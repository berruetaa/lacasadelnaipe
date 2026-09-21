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

export const conditionStates = ["excellent", "good", "fair", "poor", "critical", "unknown"] as const;

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
