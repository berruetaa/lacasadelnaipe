# Roadmap inicial

## Fase 0 — Fundación

- [x] Repositorio y arquitectura base.
- [x] IDs y vocabularios controlados.
- [x] Esquema inicial de referencias, objetos, adquisiciones, colecciones y fuentes.
- [x] Landing institucional.
- [x] CI, tests y automatización de dependencias.
- [ ] Lockfile reproducible confirmado por CI.

## Fase 1A — Los dos primeros mazos físicos

- [ ] Fotografiar ambos objetos.
- [ ] Asignar `LCDN-OBJ-000001` y `LCDN-OBJ-000002`.
- [ ] Crear las primeras referencias solo con datos realmente observables.
- [ ] Registrar `unknown` donde no haya evidencia suficiente.
- [ ] Definir flujo de imágenes y metadatos.

## Fase 1B — Corpus documental a escala

Ejecutar íntegramente [`agent-master-mission.md`](agent-master-mission.md).

- [x] Auditar y corregir contradicciones del modelo actual.
- [x] Implementar el workflow candidato → investigación → revisión → aceptación/publicación.
- [x] Modelar evidencia, certeza granular, fuentes y merges.
- [x] Implementar deduplicación y trazabilidad de lotes de investigación.
- [x] Versionar el corpus de investigación dentro del repositorio.
- [x] Extender CI para validar datos además de código.
- [x] Construir importer/migraciones idempotentes hacia D1.
- [ ] Completar corpus uruguayo inicial y expandir por fuentes/corpus productivos.
- [ ] Alcanzar **≥1.000 referencias aceptadas y auditables**; candidatos y duplicados no cuentan.
- [x] Publicar reporte de metodología, cobertura, calidad y pendientes.

La primera implementación dejó 11 referencias públicas aceptadas de un lote de 1.650 candidatos MUSEOTIK. El lote no satisface todavía el corpus uruguayo ni el umbral mínimo de 1.000 referencias; ver el [reporte de investigación](research/museotik-fournier-2026-09.md).

## Fase 2 — Primer catálogo público

- [x] Listado de referencias.
- [x] Ficha pública permanente.
- [x] Búsqueda/filtros básicos.
- [ ] Panel de ingreso protegido.
- [ ] Historial de cambios catalográficos.
- [ ] Navegación del corpus documental aceptado.

No se implementa ecommerce antes de que el catálogo tenga un flujo real y probado.
