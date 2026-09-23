# Pipeline del catálogo

## Archivos de entrada

- `data/research/sources.jsonl`: fuentes con tipo, calidad, cita, URL y derechos.
- `data/research/batches/<lote>/manifest.json`: consulta y recuento de origen.
- `batch.json`: alcance, método, operador y estado del lote.
- `candidates.jsonl`: resultados del descubrimiento con ID externo, título, inventario y registro bruto.
- `item-details.jsonl`: campos estructurados recuperados de fichas individuales.
- `reviewed-items.jsonl`: decisiones catalográficas razonadas y, para aceptaciones, atributos y `LCDN-REF-*` permanente.
- `data/catalog/references.jsonl`, `assertions.jsonl`, `public-index.json` y `redirect-index.json`: catálogo aceptado, evidencia por afirmación, índice público e índice de URLs antiguas para referencias fusionadas.
- `data/research/decisions.jsonl` y `coverage.jsonl`: auditoría de las decisiones y el alcance revisado.
- `data/research/reference-decisions.jsonl` (opcional): retiros o fusiones de referencias ya aceptadas; exige una razón, fuentes, fecha, revisor y, para fusiones, una referencia canónica activa.

Los candidatos conservan IDs internos. La fila del museo o el inventario de otra colección nunca se convierte directamente en un ID LCDN. Una ficha se publica sólo después de la decisión `accepted` y de comprobar sus fuentes, atributos y posibles duplicados. Si falta evidencia, queda como candidata, `needs_more_evidence`, rechazada o fusionada; esos estados no cuentan como referencias aceptadas.

## Reproducir el lote MUSEOTIK

El descubrimiento hace una consulta POST al endpoint público de MUSEOTIK en español, filtrada por museo 2 (Museo Fournier) y tipo de objeto 4427 (Baraja). Recorre todas las páginas del recuento que entrega el servicio, sin filtro de título. Al actualizar una captura existente, `fetch-museotik-candidates.mjs` conserva las decisiones previas por `sourceRecordId`.

```sh
node scripts/research/fetch-museotik-candidates.mjs
```

La recuperación de fichas individuales requiere delimitar los registros o seleccionar explícitamente todos los candidatos. Se limita a cuatro solicitudes concurrentes y reintenta errores temporales.

```sh
node scripts/research/fetch-museotik-items.mjs --ids=64679,64699,62472
node scripts/research/fetch-museotik-items.mjs --all-candidates --concurrency=4
```

El segundo comando descarga fichas, pero no las acepta automáticamente. Las imágenes no se descargan ni se redistribuyen. Cada decisión aceptada se registra en `reviewed-items.jsonl`; `build-reviewed-corpus.mjs` comprueba que los valores transcritos coincidan con la ficha individual y genera los JSONL derivados y el índice público.

```sh
node scripts/catalog/build-reviewed-corpus.mjs
pnpm catalog:validate
```

Antes de ejecutar la validación, los cambios del corpus deben quedar guardados en Git. El test de CI valida Zod, IDs, fuentes, afirmaciones, decisiones, candidatos aceptados, merges y fingerprints activos.

## Importar a D1

La migración base está en `packages/db/drizzle/0000_catalog_foundation.sql`. El importador convierte el corpus validado en sentencias repetibles y las divide en lotes acotados. La generación de SQL no necesita credenciales ni modifica D1.

```sh
pnpm catalog:import --out=/tmp/lcdn-d1-import
```

Para probar contra la base local después de aplicar la migración:

```sh
pnpm --filter @lacasadelnaipe/db db:migrate:local
pnpm catalog:import --apply
```

La importación conserva estados de revisión ya existentes para candidatos en conflictos. `--sync-decisions` permite sincronizarlos explícitamente con el corpus; las decisiones auditadas de fusión o retiro siempre se aplican para mantener las referencias y candidatos coherentes. El destino remoto requiere ambos flags y no debe usarse como paso de validación:

```sh
pnpm catalog:import --apply --remote --sync-decisions
```

## Identificadores y fusiones

Los seriales se asignan manualmente y no se derivan del inventario de origen. El fingerprint normaliza título, fabricante, país, intervalo de fecha, código y patrón para señalar coincidencias probables; nunca resuelve un merge automáticamente. La ficha fusionada conserva su ID y apunta a una referencia canónica. Toda fusión exige destino y razón en una decisión auditada.

Para registrar una fusión o retiro de referencia, agregue una fila JSONL a `data/research/reference-decisions.jsonl` con la forma de `researchDecisionSchema`, `subjectType: "reference"`, el `subjectId` público, y una decisión `merged` o `withdrawn`. Las fusiones usan `mergeTargetType: "reference"` y `mergeTargetId: "LCDN-REF-…"`; los retiros dejan ambos campos nulos. Al regenerar el corpus, el ID original queda como tombstone, el candidato de origen conserva la decisión auditada, y el índice público excluye el ID redirigido o retirado. Las URLs con el slug anterior redirigen a la ficha canónica; los retiros no se exponen en el índice público.

## Alcance actual

El lote `museotik-fournier-2026-09-23` recuperó 1.650 resultados resumidos y las 1.650 fichas individuales. Un resultado no equivale a una edición distinta y descargar una ficha no equivale a revisarla. La revisión inicial examinó 12 fichas: 11 pasaron a referencia pública y una quedó en `needs_more_evidence`; el resto aún no fue revisado catalográficamente. Esta cobertura no cumple el umbral de 1.000 referencias aceptadas.
