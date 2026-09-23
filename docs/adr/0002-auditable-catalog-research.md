# ADR 0002: investigación catalográfica auditable

- Estado: aceptado
- Fecha: 2026-09-23

## Contexto

El esquema inicial juntaba una referencia, una fuente mínima y un grado de certeza global. También exigía que todo objeto físico conociera una referencia. Eso no alcanza para investigar ediciones externas con evidencia desigual ni para preservar candidatos y decisiones.

## Decisiones

1. `LCDN-REF-*` identifica una edición o variante documental; `LCDN-OBJ-*` identifica una copia física LCDN. Un objeto puede quedar sin referencia mientras se investiga.
2. El corpus JSONL bajo `data/` es la entrada versionada y revisable. Las referencias públicas se materializan en un índice JSON estático; D1 recibe la misma información mediante inserciones idempotentes.
3. Los candidatos usan IDs internos derivados del registro de origen. Sólo una decisión de aceptación asigna un ID público permanente.
4. Las fichas conservan campos comunes como columnas y el resto de sus atributos en JSON. La certeza, estado de revisión, localizador y fuentes viven por afirmación, no como certeza global de ficha.
5. Fuentes, cobertura de consulta, lotes, candidatos, decisiones, vínculos con entidades, afirmaciones y medios con derechos explícitos tienen tablas propias en D1.
6. Los fabricantes, impresores, editores, marcas y patrones repetidos se normalizan como entidades durante la importación; la comparación automática sólo sugiere duplicados. Una fusión requiere una decisión explicada y conserva el ID anterior como redirección.
7. La UI pública lee el índice estático. No necesita una consulta D1 por página y no incorpora medios sin licencia conocida.
8. Las migraciones y el catálogo siguen dentro de Cloudflare D1 y el runtime estático existente. No se agrega infraestructura ni dependencia de ejecución.

## Consecuencias

- El revisor puede reconstruir por qué se aceptó, rechazó o retuvo cada candidato.
- Un error de identificación no obliga a borrar o reciclar IDs.
- Los datos de inventario físico de un museo permanecen separados de la referencia LCDN.
- El corpus puede validarse antes de importar o publicar y los cambios se revisan como diffs de texto.
- La importación preserva decisiones existentes por defecto. `--sync-decisions` sólo se usa cuando se quiere igualar deliberadamente D1 a las decisiones versionadas.
- Cada fuente se clasifica por calidad, pero el nivel de fuente no sustituye la verificación por atributo.

## Alternativas descartadas

- Una certeza única por ficha: pierde las diferencias entre fecha aproximada y fabricante confirmado.
- Asignar `LCDN-REF-*` durante descubrimiento: consume IDs para candidatos, duplicados y registros incompletos.
- Usar el ID de inventario de un museo como ID LCDN: confunde la colección externa con el catálogo de LCDN.
- Publicar una búsqueda dinámica sobre D1 para páginas que cambian poco: añade llamadas de Worker sin una necesidad funcional.

## Revisión

La arquitectura se reevalúa cuando el corpus supere el tamaño práctico del índice estático, aparezca una fuente que requiera ingestión diferente o se habilite un flujo editorial multiusuario.
