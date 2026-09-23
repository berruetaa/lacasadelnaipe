PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS catalog_references (
  id TEXT PRIMARY KEY NOT NULL,
  public_id TEXT NOT NULL CHECK (public_id GLOB 'LCDN-REF-[0-9][0-9][0-9][0-9][0-9][0-9]'),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  manufacturer TEXT,
  origin_country TEXT,
  suit_system TEXT NOT NULL DEFAULT 'unknown',
  pattern TEXT,
  date_label TEXT,
  date_start INTEGER,
  date_end INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'merged', 'withdrawn')),
  merged_into_reference_id TEXT REFERENCES catalog_references(id) ON DELETE RESTRICT,
  attributes_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(attributes_json)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK ((status = 'merged' AND merged_into_reference_id IS NOT NULL) OR (status <> 'merged' AND merged_into_reference_id IS NULL)),
  CHECK (date_start IS NULL OR date_end IS NULL OR date_start <= date_end)
);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_references_public_id_uq ON catalog_references(public_id);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_references_slug_uq ON catalog_references(slug);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_references_suit_system_slug_uq ON catalog_references(suit_system, slug);
CREATE INDEX IF NOT EXISTS catalog_references_status_idx ON catalog_references(status, public_id);

CREATE TABLE IF NOT EXISTS acquisitions (
  id TEXT PRIMARY KEY NOT NULL,
  public_id TEXT NOT NULL CHECK (public_id GLOB 'LCDN-ACQ-[0-9][0-9][0-9][0-9][0-9][0-9]'),
  method TEXT NOT NULL DEFAULT 'unknown',
  acquired_at INTEGER,
  provenance_note TEXT,
  private_note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS acquisitions_public_id_uq ON acquisitions(public_id);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS collections_code_uq ON collections(code);

CREATE TABLE IF NOT EXISTS collection_objects (
  id TEXT PRIMARY KEY NOT NULL,
  public_id TEXT NOT NULL CHECK (public_id GLOB 'LCDN-OBJ-[0-9][0-9][0-9][0-9][0-9][0-9]'),
  reference_id TEXT REFERENCES catalog_references(id) ON DELETE SET NULL,
  acquisition_id TEXT REFERENCES acquisitions(id) ON DELETE SET NULL,
  opening_state TEXT NOT NULL DEFAULT 'unknown',
  completeness TEXT NOT NULL DEFAULT 'unknown',
  condition TEXT NOT NULL DEFAULT 'unknown',
  provenance_summary TEXT,
  storage_location TEXT,
  private_note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS collection_objects_public_id_uq ON collection_objects(public_id);
CREATE UNIQUE INDEX IF NOT EXISTS collection_objects_reference_public_uq ON collection_objects(reference_id, public_id);

CREATE TABLE IF NOT EXISTS object_collections (
  object_id TEXT NOT NULL REFERENCES collection_objects(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (object_id, collection_id)
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  quality TEXT NOT NULL DEFAULT 'C' CHECK (quality IN ('A', 'B', 'C', 'D')),
  title TEXT NOT NULL,
  organization TEXT,
  creator TEXT,
  citation TEXT,
  url TEXT,
  accessed_at INTEGER,
  publication_date TEXT,
  locator TEXT,
  archived_url TEXT,
  rights_note TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sources_kind_quality_idx ON sources(kind, quality);
CREATE UNIQUE INDEX IF NOT EXISTS sources_url_uq ON sources(url) WHERE url IS NOT NULL;

CREATE TABLE IF NOT EXISTS reference_sources (
  reference_id TEXT NOT NULL REFERENCES catalog_references(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  note TEXT,
  PRIMARY KEY (reference_id, source_id)
);

CREATE TABLE IF NOT EXISTS research_batches (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  scope TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'review', 'accepted', 'closed')),
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  method TEXT NOT NULL,
  operator TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS research_batches_slug_uq ON research_batches(slug);

CREATE TABLE IF NOT EXISTS research_batch_sources (
  batch_id TEXT NOT NULL REFERENCES research_batches(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  PRIMARY KEY (batch_id, source_id)
);

CREATE TABLE IF NOT EXISTS catalog_candidates (
  id TEXT PRIMARY KEY NOT NULL,
  batch_id TEXT NOT NULL REFERENCES research_batches(id) ON DELETE RESTRICT,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  source_record_id TEXT NOT NULL,
  source_record_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'researching', 'review', 'needs_more_evidence', 'accepted', 'merged', 'rejected', 'withdrawn')),
  title TEXT NOT NULL,
  date_label TEXT,
  inventory_number TEXT,
  manufacturer_label TEXT,
  fingerprint TEXT NOT NULL,
  raw_record_json TEXT NOT NULL CHECK (json_valid(raw_record_json)),
  accepted_reference_id TEXT REFERENCES catalog_references(id) ON DELETE RESTRICT,
  merged_into_candidate_id TEXT REFERENCES catalog_candidates(id) ON DELETE RESTRICT,
  disposition_note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK ((status = 'accepted' AND accepted_reference_id IS NOT NULL) OR (status <> 'accepted' AND accepted_reference_id IS NULL)),
  CHECK ((status = 'merged' AND merged_into_candidate_id IS NOT NULL) OR (status <> 'merged' AND merged_into_candidate_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_candidates_source_record_uq ON catalog_candidates(source_id, source_record_id);
CREATE INDEX IF NOT EXISTS catalog_candidates_status_idx ON catalog_candidates(status, batch_id);
CREATE INDEX IF NOT EXISTS catalog_candidates_fingerprint_idx ON catalog_candidates(fingerprint);

CREATE TABLE IF NOT EXISTS candidate_source_evidence (
  candidate_id TEXT NOT NULL REFERENCES catalog_candidates(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  locator TEXT,
  note TEXT,
  PRIMARY KEY (candidate_id, source_id)
);

CREATE TABLE IF NOT EXISTS research_decisions (
  id TEXT PRIMARY KEY NOT NULL,
  batch_id TEXT NOT NULL REFERENCES research_batches(id) ON DELETE RESTRICT,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('reference', 'candidate')),
  subject_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('accepted', 'rejected', 'merged', 'needs_more_evidence', 'withdrawn')),
  merge_target_type TEXT CHECK (merge_target_type IN ('reference', 'candidate')),
  merge_target_id TEXT,
  decided_at INTEGER NOT NULL,
  reviewer TEXT NOT NULL,
  rationale TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK ((decision = 'merged' AND merge_target_type IS NOT NULL AND merge_target_id IS NOT NULL) OR (decision <> 'merged' AND merge_target_type IS NULL AND merge_target_id IS NULL))
);
CREATE INDEX IF NOT EXISTS research_decisions_subject_idx ON research_decisions(subject_type, subject_id, decided_at);

CREATE TABLE IF NOT EXISTS decision_sources (
  decision_id TEXT NOT NULL REFERENCES research_decisions(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  PRIMARY KEY (decision_id, source_id)
);

CREATE TABLE IF NOT EXISTS catalog_assertions (
  id TEXT PRIMARY KEY NOT NULL,
  reference_id TEXT REFERENCES catalog_references(id) ON DELETE CASCADE,
  candidate_id TEXT REFERENCES catalog_candidates(id) ON DELETE CASCADE,
  attribute TEXT NOT NULL,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  certainty TEXT NOT NULL DEFAULT 'unknown' CHECK (certainty IN ('confirmed', 'highly_probable', 'probable', 'possible', 'unknown')),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected', 'superseded')),
  locator TEXT,
  note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK ((reference_id IS NOT NULL AND candidate_id IS NULL) OR (reference_id IS NULL AND candidate_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS catalog_assertions_reference_idx ON catalog_assertions(reference_id, attribute, status);
CREATE INDEX IF NOT EXISTS catalog_assertions_candidate_idx ON catalog_assertions(candidate_id, attribute, status);

CREATE TABLE IF NOT EXISTS assertion_sources (
  assertion_id TEXT NOT NULL REFERENCES catalog_assertions(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  PRIMARY KEY (assertion_id, source_id)
);

CREATE TABLE IF NOT EXISTS catalog_entities (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('manufacturer', 'printer', 'publisher', 'brand', 'organization', 'person', 'place', 'pattern', 'collection', 'classification')),
  preferred_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  country_code TEXT,
  region TEXT,
  from_year INTEGER,
  to_year INTEGER,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (from_year IS NULL OR to_year IS NULL OR from_year <= to_year)
);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_entities_kind_normalized_name_uq ON catalog_entities(kind, normalized_name);

CREATE TABLE IF NOT EXISTS catalog_entity_aliases (
  entity_id TEXT NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  PRIMARY KEY (entity_id, normalized_alias)
);
CREATE INDEX IF NOT EXISTS catalog_entity_aliases_lookup_idx ON catalog_entity_aliases(normalized_alias);

CREATE TABLE IF NOT EXISTS catalog_entity_sources (
  entity_id TEXT NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  PRIMARY KEY (entity_id, source_id)
);

CREATE TABLE IF NOT EXISTS reference_entities (
  reference_id TEXT NOT NULL REFERENCES catalog_references(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES catalog_entities(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('manufacturer', 'printer', 'publisher', 'brand', 'designer', 'distributor', 'sponsor', 'subject', 'place_of_production', 'classification')),
  certainty TEXT NOT NULL DEFAULT 'unknown' CHECK (certainty IN ('confirmed', 'highly_probable', 'probable', 'possible', 'unknown')),
  PRIMARY KEY (reference_id, entity_id, role)
);

CREATE TABLE IF NOT EXISTS reference_merges (
  source_reference_id TEXT PRIMARY KEY NOT NULL REFERENCES catalog_references(id) ON DELETE RESTRICT,
  target_reference_id TEXT NOT NULL REFERENCES catalog_references(id) ON DELETE RESTRICT,
  decision_id TEXT REFERENCES research_decisions(id) ON DELETE RESTRICT,
  rationale TEXT NOT NULL,
  merged_at INTEGER NOT NULL,
  CHECK (source_reference_id <> target_reference_id)
);

CREATE TABLE IF NOT EXISTS source_coverage (
  id TEXT PRIMARY KEY NOT NULL,
  batch_id TEXT NOT NULL REFERENCES research_batches(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  scope TEXT NOT NULL,
  strategy TEXT NOT NULL,
  query_json TEXT NOT NULL CHECK (json_valid(query_json)),
  expected_count INTEGER CHECK (expected_count IS NULL OR expected_count >= 0),
  retrieved_count INTEGER NOT NULL CHECK (retrieved_count >= 0),
  pages_reviewed TEXT,
  completed_at INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS source_coverage_batch_idx ON source_coverage(batch_id, source_id);

CREATE TABLE IF NOT EXISTS catalog_media (
  id TEXT PRIMARY KEY NOT NULL,
  reference_id TEXT REFERENCES catalog_references(id) ON DELETE CASCADE,
  candidate_id TEXT REFERENCES catalog_candidates(id) ON DELETE CASCADE,
  object_id TEXT REFERENCES collection_objects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  view TEXT NOT NULL DEFAULT 'unknown' CHECK (view IN ('front', 'back', 'box', 'sheet', 'detail', 'other', 'unknown')),
  credit TEXT,
  rights TEXT,
  archived_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK ((reference_id IS NOT NULL AND candidate_id IS NULL AND object_id IS NULL) OR (reference_id IS NULL AND candidate_id IS NOT NULL AND object_id IS NULL) OR (reference_id IS NULL AND candidate_id IS NULL AND object_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS catalog_media_reference_idx ON catalog_media(reference_id, view);
