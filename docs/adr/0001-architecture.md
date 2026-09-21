# ADR 0001 — Arquitectura inicial

- Estado: aceptada
- Fecha: 2026-09-21

## Contexto

LCDN necesita empezar con dos mazos y poder crecer a miles de referencias, objetos, fuentes y colecciones sin confundir el catálogo intelectual con el inventario físico.

## Decisión

Se adopta un monorepo TypeScript con tres límites claros:

1. `packages/catalog`: lenguaje y reglas del dominio, sin infraestructura.
2. `packages/db`: persistencia PostgreSQL mediante Drizzle.
3. `apps/web`: presentación pública y, en el futuro, administración.

PostgreSQL será la fuente de verdad transaccional. Las imágenes se tratarán como assets referenciados y no como blobs de la base principal.

Los IDs internos usan UUID y los IDs públicos LCDN son identificadores humanos permanentes e independientes de la clave de base de datos.

## Consecuencias

- La UI puede reemplazarse sin redefinir el catálogo.
- Una referencia puede existir sin ejemplares físicos.
- Un objeto puede cambiar de ubicación o colección sin cambiar de identidad.
- La procedencia puede modelarse históricamente sin sobrescribir hechos anteriores.
- El proyecto puede añadir búsqueda especializada o almacenamiento de imágenes más adelante sin rehacer el núcleo.

## No decidido todavía

- proveedor de hosting;
- almacenamiento de imágenes;
- autenticación y roles;
- motor de búsqueda dedicado;
- licencia del código y de los datos.
