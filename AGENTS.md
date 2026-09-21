# AGENTS.md

## Mission

Build La Casa del Naipe as a durable cultural catalog first and a commercial product second.

## Non-negotiable domain rules

1. Catalog references and physical objects are different entities.
2. Public LCDN identifiers are permanent and never reused.
3. Provenance is append-only historical information; do not collapse it into a single owner field.
4. Certainty must be explicit. Unknown is preferable to invented precision.
5. Sealed historical objects are never opened merely for photography or catalog completeness.
6. Private storage location, acquisition price and personal donor data never ship to public APIs.
7. Uruguay is the first research corpus, not a hard boundary of the collection.

## Engineering rules

- Keep domain logic in `packages/catalog` and persistence in `packages/db`.
- Keep `apps/web` thin; UI code must not become the source of catalog rules.
- Cloudflare Free Tier is an architectural constraint until an ADR explicitly changes it.
- Prefer static assets for public reads. Do not SSR a page just because the framework can.
- Dynamic Worker invocations are for search, administration, uploads and genuinely dynamic data.
- D1 queries must be bounded and indexed; avoid full-table scans on request paths.
- Binary media belongs in R2; D1 stores metadata and object keys only.
- No external database, always-on server, container runtime or paid SaaS may become a production dependency without an ADR.
- No new runtime dependency without a concrete need.
- Schema changes require a migration and, when semantically significant, an ADR.
- Tests should cover domain invariants, not implementation trivia.
- Never silently rewrite public identifiers or provenance history.
