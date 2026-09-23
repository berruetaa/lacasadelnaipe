# Reporte de investigación: MUSEOTIK / Museo Fournier

- Lote: `batch:museotik-fournier-2026-09-23`
- Consulta realizada: 2026-09-23
- Fuente: [Catálogo público MUSEOTIK](https://museotik.euskadi.eus/explora/)
- Fichas: [registro MUSEOTIK del Museo Fournier](https://museotik.euskadi.eus/contenidos/cultural_asset/museotik_ca_64682/es_def/index.shtml)

## Método y cobertura

Se consultó el endpoint público de colección del [Gobierno Vasco](https://museotik.euskadi.eus/ad83aMuseotikPublicaWar/explora/buscarColeccion) con idioma español, museo `idMuseo=2` y tipo de objeto `idObjeto=4427` (Baraja). La consulta reportó cuatro páginas y 1.650 resultados; se recuperaron las cuatro páginas sin filtro de título. `scripts/research/fetch-museotik-candidates.mjs` reproduce la consulta y conserva las decisiones previas al actualizar el mismo lote.

También se descargaron las 1.650 fichas individuales a `data/research/batches/museotik-fournier-2026-09-23/item-details.jsonl`. Se guardan campos estructurados y fragmentos acotados de frente y reverso, no el HTML completo ni imágenes. `fetch-museotik-items.mjs` limita el acceso a cuatro solicitudes concurrentes, reintenta errores temporales y no acepta candidatos.

Las fichas identifican 1.650 códigos externos distintos en «Otras denominaciones». Esa unicidad sirve como indicio para comparar registros; no se toma como prueba suficiente de 1.650 ediciones distintas. El tipo de objeto incluye sistemas y países ajenos a la prioridad del proyecto y puede registrar ejemplares físicos, por lo que cada código requiere decisión catalográfica.

## Revisión y resultado

La revisión inicial examinó doce fichas individuales: once se aceptaron como referencias distintas con evidencia primaria por afirmación; una quedó en `needs_more_evidence`; 1.638 candidatos permanecen sin revisión. Los once registros aceptados tienen fuente institucional MUSEOTIK de nivel A, código de catálogo, título, datación, medidas y material publicados por la ficha. En total se generaron 98 afirmaciones con localizador, nivel de certeza y vínculo a su fuente.

| Estado | Cantidad | Tratamiento |
| --- | ---: | --- |
| Referencias aceptadas | 11 | `LCDN-REF-000001` a `LCDN-REF-000011` |
| Necesita más evidencia | 1 | `museotik-ca-50483`; posible variante del registro `museotik-ca-342729` |
| Candidato sin revisión catalográfica | 1.638 | No se publica ni cuenta para la meta |
| Duplicados fusionados | 0 | No se hicieron fusiones automáticas |

El caso 50483 coincide con el registro 342729 en fabricante, producto, año y cantidad, pero publica un reverso distinto y el código no lleva el sufijo `A`. Sin cotejo suficiente, no se contó como otra referencia. Por otra parte, MUSEOTIK diferencia los códigos `España 00015` y `España 00016`, con dataciones 1638–1640 y 1647; sus fichas describen diseños y procedencias diferentes, por lo que se conservaron ambos.

La clasificación del sistema de palos queda `unknown` cuando la ficha consultada no describe el anverso, como en la ficha de «Baraja catalana». Cuando la fuente sólo permite una atribución probable, la afirmación mantiene ese nivel en vez de convertirlo en certeza.

## Señales del corpus recuperado

Las 1.650 fichas de detalle contienen código externo y material. 1.474 incluyen fecha, 1.646 incluyen dimensiones, 1.387 describen el anverso y 1.631 el reverso en los campos consultados. Las descripciones del anverso/reverso se limitan a 400/600 caracteres en el extracto almacenado. El código territorial está encabezado por España en 853 registros, Italia en 71 y Portugal en 7; esos recuentos describen candidatos, no referencias aceptadas.

`node scripts/research/summarize-museotik-details.mjs` identifica 1.096 fichas con título, código, anverso, reverso, fecha y autoría. Al normalizar esos cinco campos descriptivos y excluir el código institucional, aparecen 1.081 perfiles textuales distintos y 15 colisiones exactas. Es una cola de revisión de alta información, no un conteo de ediciones: una ficha puede describir un ejemplar de una edición ya registrada y diferencias de transcripción tampoco prueban una variante. Ninguna de estas cifras incrementa las referencias aceptadas.

## Calidad, duplicación y derechos

- La evidencia aceptada procede directamente de fichas de una colección pública institucional. La fuente se clasifica como A; no se afirma triangulación independiente.
- La búsqueda de duplicados es una sugerencia determinista basada en título normalizado, fabricante, país, fecha, código y patrón. No fusiona automáticamente.
- No se descargaron ni republicaron imágenes. Cada registro conserva el enlace de la ficha original; se debe revisar crédito/licencia antes de reutilizar media.
- Los números de inventario externos se conservan como localizadores de fuente. No se convierten en IDs de objeto o referencia LCDN.
- El índice público sólo incluye los once aceptados; candidatos y notas privadas de custodia no se exponen.

## Limitaciones y continuación

Este lote está centrado en una colección española y no satisface el corpus uruguayo/rioplatense prioritario. La recuperación completa de fichas no sustituye la lectura crítica de 1.638 candidatos. Sólo hay una fuente institucional y once referencias aceptadas; no se alcanzó el piso de 1.000, así que la misión del issue #9 permanece abierta.

Continuación recomendada: revisar el corpus MUSEOTIK por familias de palos, productores y códigos externos con una decisión por registro; separar explícitamente las cartas españolas y latinas pertinentes de sistemas sin relación temática; y luego investigar primero fuentes uruguayas y rioplatenses, triangulando fabricantes, catálogos y bibliografía especializada. No asignar más IDs públicos hasta disponer de evidencia suficiente y una deduplicación explicable.
