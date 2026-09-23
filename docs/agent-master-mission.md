# Misión maestra del agente — Catálogo LCDN a escala

## Mandato

Trabajá de forma autónoma sobre este repositorio hasta convertir La Casa del Naipe en un sistema catalográfico auditable capaz de investigar, validar, deduplicar, publicar y mantener **como mínimo 1.000 referencias documentales únicas de naipes**.

No esperes que el mantenedor te diseñe el esquema, el workflow, la estrategia de investigación ni la arquitectura de ingestión. Todo eso forma parte de la tarea.

El objetivo no es producir una lista de 1.000 links. El objetivo es dejar dentro de este repositorio un catálogo duradero, reproducible y verificable, junto con el código, modelo de datos, documentación, validadores, tests, workflows y corpus necesarios para sostenerlo.

## Definición de terminado

La misión no está terminada hasta que se cumplan **todas** estas condiciones:

1. El modelo de dominio soporte investigación catalográfica real a escala.
2. Exista un pipeline reproducible para descubrimiento → candidato → validación → deduplicación → revisión → aceptación → publicación.
3. Toda afirmación relevante pueda vincularse a evidencia y nivel de certeza.
4. La procedencia de los datos y las fuentes pueda auditarse.
5. Los candidatos rechazados o fusionados conserven trazabilidad.
6. La CI valide tanto código como datos catalográficos.
7. El catálogo acepte referencias que LCDN no posee físicamente.
8. Los objetos físicos y las referencias documentales permanezcan separados.
9. Existan **al menos 1.000 referencias únicas aceptadas**, no meros candidatos.
10. La mayoría sustancial de esas referencias tenga evidencia de fuentes fuertes o triangulación suficiente.
11. No existan duplicados conocidos contados artificialmente para alcanzar el objetivo.
12. El repositorio documente cómo continuar la investigación más allá de 1.000 referencias.
13. `pnpm check`, `pnpm typecheck`, `pnpm test` y `pnpm build` pasen al finalizar; los tests nuevos necesarios también deben quedar incluidos.

**1.000 es el piso, no el techo.** Si las fuentes productivas permiten superar ese número de forma confiable, continuá.

---

## Principios no negociables

Conservá y reforzá los principios ya establecidos por el proyecto:

- catálogo ≠ colección física;
- referencia ≠ objeto;
- IDs públicos permanentes y nunca reutilizados;
- `unknown` es preferible a precisión inventada;
- procedencia histórica append-only;
- fuentes y revisiones auditables;
- no abrir objetos históricos cerrados sólo para completar fotografías;
- datos privados de custodia, precios privados y datos personales no salen por APIs públicas;
- Cloudflare Free Tier sigue siendo una restricción arquitectónica hasta que un ADR explícito justifique cambiarla;
- la UI no es la fuente de verdad del dominio.

No sacrifiques estas reglas para alcanzar la cifra objetivo.

---

## Alcance catalográfico

### Prioridad temática

Priorizar:

1. naipes de sistema español;
2. variantes regionales de palos españoles;
3. sistemas latinos históricamente relacionados;
4. barajas italianas y patrones regionales;
5. producción uruguaya, rioplatense e iberoamericana;
6. barajas publicitarias, institucionales, turísticas, históricas y especiales dentro de estos sistemas;
7. fabricantes, marcas y ediciones históricamente relevantes para comprender esas familias.

Las barajas francesas, póker, tarot u otros sistemas pueden documentarse cuando sean necesarias por relación histórica, fabricante, comparación o contexto, pero **no deben utilizarse como relleno** para llegar a 1.000.

### Prioridad geográfica de investigación

Trabajá por corpus y no de forma caótica:

1. Uruguay;
2. Río de la Plata / Argentina;
3. España;
4. Italia;
5. Portugal histórico y otros sistemas latinos relacionados;
6. exportaciones, diásporas y fabricantes internacionales relevantes.

Esta secuencia puede alterarse si una fuente de alta calidad ofrece un corpus excepcionalmente productivo.

---

## Qué cuenta como una referencia única

Una `LCDN-REF-*` representa una edición, variante o baraja documentable, no una copia física individual.

Puede justificarse una referencia separada cuando exista diferencia documentable relevante en uno o más de estos aspectos:

- fabricante o impresor;
- edición o reedición;
- fecha o período;
- patrón;
- diseño de figuras;
- reverso;
- número/composición de cartas;
- índices;
- presentación o caja;
- mercado de destino;
- patrocinador o institución;
- marca;
- material;
- formato/tamaño;
- código de catálogo o referencia del fabricante;
- otra variante históricamente significativa.

No crear referencias distintas por:

- fotografías diferentes de la misma baraja;
- vendedores distintos del mismo producto;
- copias físicas distintas de la misma edición;
- títulos comerciales inconsistentes sin evidencia de una variante real.

Cuando exista duda, crear un **candidato**, no una referencia pública definitiva.

---

## Arquitectura de investigación requerida

Antes de cargar el corpus a escala, auditá el modelo existente y corregí cualquier contradicción entre documentación, dominio y base de datos.

Como mínimo, evaluá e implementá una solución coherente para:

### 1. Referencias catalográficas

El modelo debe poder representar, cuando exista evidencia:

- título preferido;
- nombres alternativos;
- fabricante;
- impresor;
- editor/distribuidor;
- marca;
- país y región;
- fechas exactas, aproximadas o intervalos;
- sistema de palos;
- familia/patrón;
- variante regional;
- composición y cantidad de cartas;
- valores por palo;
- comodines/cartas adicionales;
- índices;
- dimensiones/formato;
- material;
- reverso;
- tema/uso;
- idioma;
- institución/anunciante;
- códigos de catálogo externos;
- referencias IPCS u otras clasificaciones especializadas;
- notas de identificación;
- relaciones con otras referencias.

No conviertas necesariamente todo esto en columnas planas. Diseñá una estructura normalizada y sostenible.

### 2. Entidades normalizadas

Evaluá separar en entidades cuando corresponda:

- fabricantes;
- impresores;
- marcas;
- organizaciones;
- lugares;
- patrones;
- familias de palos;
- colecciones externas;
- personas relevantes;
- clasificaciones externas.

Evitá strings libres duplicados cuando una entidad estable aporte valor real.

### 3. Afirmaciones y evidencia

La certeza no debe depender únicamente de toda la ficha.

El sistema debe poder expresar conceptualmente:

`referencia + afirmación + valor + certeza + fuente(s)`

Ejemplo:

- fabricante = confirmado;
- año = probable;
- mercado de destino = posible.

No es obligatorio usar un modelo EAV genérico si existe una alternativa más segura y tipada, pero la granularidad de evidencia debe resolverse.

### 4. Fuentes

Mantener una biblioteca normalizada de fuentes con, cuando corresponda:

- tipo;
- institución/autor;
- título;
- fecha;
- URL;
- fecha de acceso;
- referencia bibliográfica;
- páginas/ubicación;
- nivel/calidad de fuente;
- copia archivada o identificador persistente cuando sea lícito y viable;
- notas.

### 5. Investigación e ingestión

Crear entidades/archivos para registrar:

- lote de investigación;
- agente/proceso que lo produjo;
- fecha;
- corpus/objetivo;
- consultas o estrategia;
- candidatos encontrados;
- fuentes consultadas;
- resultado de validación;
- decisiones de merge/rechazo/aceptación;
- errores y pendientes.

### 6. Estados de workflow

Implementar estados equivalentes a:

`candidate → researching → review → accepted → published`

más estados terminales o auxiliares como:

`merged`, `rejected`, `needs_more_evidence`, `withdrawn`.

Los nombres exactos pueden variar si el diseño mejora la semántica.

### 7. IDs

Los candidatos no deben consumir un `LCDN-REF-*` permanente antes de ser aceptados.

Usá IDs internos/UUID durante descubrimiento e investigación. Asigná el ID público al incorporarse formalmente al catálogo.

Si una referencia pública resulta duplicada posteriormente:

- no borrar ni reutilizar su ID;
- conservar tombstone/redirect/merge;
- registrar `merged_into` o equivalente;
- conservar historial.

### 8. Objetos físicos

Un `LCDN-OBJ-*` debe poder existir aunque todavía no se conozca su referencia exacta.

Revisá y corregí la contradicción actual entre el schema de dominio y la base de datos respecto de esta posibilidad.

### 9. Adquisiciones

Revisá la inconsistencia actual entre `acquisitions.publicId` y el generador de IDs públicos, que hoy no define una serie para adquisiciones. Elegí y documentá una solución coherente.

---

## Deduplicación

La deduplicación es parte central del trabajo, no una limpieza posterior.

Antes de aceptar una nueva referencia, comparar como mínimo:

- fabricante/marca;
- títulos y aliases;
- período;
- patrón;
- figuras;
- reverso;
- caja/presentación;
- composición;
- país/mercado;
- códigos externos;
- fuentes e imágenes disponibles.

Implementar:

- fingerprint determinista cuando sea útil;
- comparación normalizada;
- detección de posibles duplicados;
- cola de revisión;
- registro explícito de merges;
- tests de invariantes.

No confiar exclusivamente en embeddings o fuzzy matching. Sirven para sugerir; la decisión debe ser explicable y respaldada.

---

## Política de fuentes

### Nivel A — preferidas

- fabricantes;
- catálogos originales;
- archivos históricos;
- museos;
- bibliotecas nacionales;
- colecciones universitarias;
- bases patrimoniales;
- IPCS;
- publicaciones académicas;
- libros especializados digitalizados.

### Nivel B — fuertes

- museos privados reputados;
- asociaciones de coleccionistas;
- colecciones especializadas documentadas;
- casas de subastas con fotografías y descripciones;
- catálogos comerciales históricos;
- bases especializadas de naipes.

### Nivel C — auxiliares

- comercios especializados;
- vendedores profesionales;
- sitios de coleccionismo;
- publicaciones antiguas de venta.

### Nivel D — pistas

- eBay;
- MercadoLibre;
- Etsy;
- Marketplace;
- Pinterest;
- redes sociales;
- foros;
- blogs sin referencias.

Una fuente D puede descubrir una pieza, pero no debe convertirse automáticamente en autoridad histórica.

Triangular datos importantes cuando sea razonablemente posible.

---

## Research: cómo trabajar

No hagas búsquedas aleatorias entrada por entrada.

Trabajá por **fuentes exhaustivas y conjuntos**.

Ejemplo:

- identificar un catálogo histórico de fabricante;
- registrar la fuente;
- recorrerlo sistemáticamente;
- extraer las ediciones distinguibles;
- crear candidatos;
- normalizar fabricante/patrones/fechas;
- buscar corroboración externa;
- deduplicar contra el corpus;
- aceptar sólo lo sustentable;
- registrar qué páginas/secciones fueron agotadas.

Crear un registro de cobertura de fuentes para evitar repetir trabajo y poder saber qué colecciones ya fueron revisadas.

---

## Imágenes y media

No llenar el repositorio Git con binarios masivos.

Mantener metadata y URLs/orígenes en el corpus; utilizar R2 para media propia o copias legalmente almacenables cuando el flujo esté implementado.

Para imágenes externas registrar cuando sea posible:

- URL original;
- fuente/institución;
- crédito;
- licencia/derechos conocidos;
- qué muestra (frente, dorso, caja, figuras, hoja completa, etc.).

No asumir derecho de reutilización porque una imagen sea públicamente visible.

---

## Representación de datos en el repositorio

El corpus de investigación debe quedar versionado en Git de forma legible y validable.

Elegí un formato adecuado (JSON, JSONL, YAML u otro justificable) y documentalo.

Requisitos:

- diffs razonables;
- schemas/versionado;
- determinismo;
- fácil validación automática;
- importación idempotente a D1;
- posibilidad de reconstruir la base desde el corpus/versionado cuando corresponda;
- separación clara entre datos públicos, datos privados y secretos.

No guardar secretos, credenciales ni datos personales sensibles en Git.

---

## CI/CD para datos

Extender CI para validar como mínimo:

- schemas;
- IDs;
- vocabularios controlados;
- referencias rotas internas;
- fuentes requeridas;
- invariantes de estado;
- duplicados exactos;
- fingerprints conflictivos;
- merges inválidos o cíclicos;
- datos privados filtrados al corpus público;
- migraciones y compatibilidad de importación;
- tests del dominio.

Añadir controles de calidad catalográfica que fallen cuando un batch pretende aceptarse sin evidencia mínima.

---

## Estrategia de cambios

Tenés autoridad para modificar dentro del repositorio:

- `AGENTS.md`;
- documentación y ADRs;
- `packages/catalog`;
- `packages/db`;
- `apps/web`;
- scripts;
- tests;
- workflows GitHub Actions;
- herramientas de ingestión;
- estructura de datos;
- roadmap;
- seeds/corpus;
- páginas públicas necesarias para exponer el catálogo.

No mantengas una decisión existente sólo por inercia. Si encontrás una arquitectura mejor que respeta los principios del proyecto, implementala y documentá el porqué en un ADR.

No agregues infraestructura paga o procesos always-on salvo que sea estrictamente necesario y quede aprobado por ADR; el default sigue siendo Cloudflare Free Tier.

---

## Método de ejecución autónoma

1. Auditar repo completo.
2. Identificar contradicciones, deuda y decisiones faltantes.
3. Crear/actualizar ADRs antes o junto con cambios semánticos grandes.
4. Corregir dominio y persistencia.
5. Construir pipeline de ingestión e investigación.
6. Crear validadores y tests.
7. Probar con un batch pequeño real.
8. Corregir fallas del diseño reveladas por ese batch.
9. Escalar investigación por corpus.
10. Ejecutar deduplicación y revisión sistemática.
11. Alcanzar ≥1.000 referencias aceptadas.
12. Construir/publicar listado y fichas si todavía no existen.
13. Ejecutar auditoría final del corpus.
14. Documentar cobertura, pendientes, limitaciones y cómo seguir.
15. Dejar CI verde.

No pidas al mantenedor decisiones que puedas resolver razonablemente con investigación, tests, ADRs y los principios existentes.

Si existen varias soluciones válidas, elegí la que maximice trazabilidad, mantenibilidad, costo cercano a cero y capacidad de crecimiento.

---

## Calidad mínima del corpus de 1.000

La cifra no se considera cumplida si el catálogo está lleno de entradas apenas nominales.

Objetivo recomendado al llegar al primer millar:

- ≥ 750 referencias `confirmed` o equivalente de alta confianza;
- ≤ 200 referencias en estado probable/revisión fuerte;
- ≤ 50 referencias provisionales sólo si están claramente marcadas y no se presentan como hechos establecidos.

Si el modelo final elimina una certeza global de referencia, traducí estos umbrales a una métrica documentada equivalente de calidad/evidencia.

Además:

- cada referencia aceptada debe tener al menos una fuente concreta;
- atributos históricos importantes sin evidencia deben permanecer desconocidos;
- los registros duplicados fusionados no cuentan dos veces;
- candidatos no aceptados no cuentan para el objetivo.

---

## Entregables dentro del repo

Al terminar deben existir, de forma implementada y no sólo propuesta:

- ADR(s) de la evolución del modelo y del pipeline;
- modelo de dominio actualizado;
- migraciones D1/Drizzle;
- corpus versionado;
- schemas/validadores;
- pipeline/importer idempotente;
- deduplicación;
- workflows CI para datos;
- pruebas unitarias/integración pertinentes;
- documentación de investigación;
- registro/cobertura de fuentes;
- listado de fabricantes/patrones/entidades normalizadas según diseño final;
- ≥1.000 referencias aceptadas;
- UI pública mínima para navegar/buscar esas referencias o una justificación documentada si una etapa técnica bloquea temporalmente la publicación;
- reporte final en `docs/research/` con metodología, cobertura, métricas de calidad, duplicados/merges, limitaciones y próximos corpus.

---

## Prohibiciones

No:

- inventar datos para completar campos;
- generar 1.000 nombres plausibles con un LLM;
- contar publicaciones de venta como barajas distintas;
- clonar descripciones sin verificar;
- usar una sola tienda/marketplace como fuente principal del corpus;
- ocultar incertidumbre;
- borrar referencias públicas porque resultaron duplicadas;
- reutilizar IDs;
- meter secretos en el repo;
- mezclar inventario físico con catálogo intelectual;
- abandonar trazabilidad para avanzar más rápido;
- crear una dependencia de pago innecesaria;
- declarar terminada la misión sólo porque exista un CSV de 1.000 filas.

---

## Criterio rector

Cada ficha debería permitir que una persona, años después, pueda responder:

- qué baraja es;
- por qué creemos que es esa;
- quién la fabricó o por qué no lo sabemos;
- cuándo y dónde se produjo, con qué certeza;
- qué sistema/patrón utiliza;
- cómo distinguirla de variantes cercanas;
- qué fuentes sustentan cada afirmación importante;
- qué sigue siendo incierto;
- cómo fue incorporada al catálogo;
- si LCDN posee o no un objeto físico correspondiente;
- qué cambios o fusiones sufrió la ficha desde su creación.

Construí una **infraestructura patrimonial y de investigación**, no una planilla grande.
