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

- [ ] Auditar y corregir contradicciones del modelo actual.
- [ ] Diseñar e implementar workflow candidato → investigación → revisión → aceptación/publicación.
- [ ] Modelar evidencia, certeza granular, fuentes y merges.
- [ ] Implementar deduplicación y trazabilidad de lotes de investigación.
- [ ] Versionar el corpus de investigación dentro del repositorio.
- [ ] Extender CI para validar datos además de código.
- [ ] Construir importer/migraciones idempotentes hacia D1.
- [ ] Completar corpus uruguayo inicial y expandir por fuentes/corpus productivos.
- [ ] Alcanzar **≥1.000 referencias aceptadas y auditables**; candidatos y duplicados no cuentan.
- [ ] Publicar reporte de metodología, cobertura, calidad y pendientes.

## Fase 2 — Primer catálogo público

- [ ] Listado de referencias.
- [ ] Ficha pública permanente.
- [ ] Búsqueda/filtros básicos.
- [ ] Panel de ingreso protegido.
- [ ] Historial de cambios catalográficos.
- [ ] Navegación del corpus documental aceptado.

No se implementa ecommerce antes de que el catálogo tenga un flujo real y probado.
