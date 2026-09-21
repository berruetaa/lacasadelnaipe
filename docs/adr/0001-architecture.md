# ADR 0001 — Arquitectura inicial

- Estado: aceptada
- Fecha: 2026-09-21

## Contexto

LCDN necesita empezar con dos mazos y poder crecer a miles de referencias, objetos, fuentes y colecciones sin confundir el catálogo intelectual con el inventario físico.

Además, la plataforma debe ser **serverless-first**: sin servidores de aplicación persistentes, sin pools TCP mantenidos y sin infraestructura que LCDN tenga que operar 24/7.

## Decisión

Se adopta un monorepo TypeScript con tres límites claros:

1. `packages/catalog`: lenguaje y reglas del dominio, sin infraestructura.
2. `packages/db`: persistencia relacional mediante Drizzle sobre Neon Serverless Postgres.
3. `apps/web`: presentación pública y, en el futuro, administración mediante Next.js en runtime serverless.

Neon Serverless Postgres será la fuente de verdad transaccional. El acceso de runtime se realiza mediante el driver HTTP de Neon; no se mantiene un pool PostgreSQL TCP persistente.

Las imágenes se tratarán como assets referenciados en almacenamiento de objetos serverless y no como blobs de la base principal.

Los IDs internos usan UUID y los IDs públicos LCDN son identificadores humanos permanentes e independientes de la clave de base de datos.

## Restricciones arquitectónicas

- producción no depende de Docker;
- no hay servidor Node persistente propio;
- no hay PostgreSQL autogestionado;
- las funciones deben asumir ejecución efímera y stateless;
- los objetos binarios no se guardan en PostgreSQL;
- ningún paquete de dominio puede depender de un proveedor cloud.

## Consecuencias

- escala a cero cuando no hay tráfico;
- no hay conexiones persistentes que administrar;
- la UI puede reemplazarse sin redefinir el catálogo;
- una referencia puede existir sin ejemplares físicos;
- un objeto puede cambiar de ubicación o colección sin cambiar de identidad;
- la procedencia puede modelarse históricamente sin sobrescribir hechos anteriores;
- el proveedor de base puede reemplazarse manteniendo PostgreSQL y el límite `packages/db`.

## No decidido todavía

- proveedor final de despliegue de Next.js;
- almacenamiento serverless de imágenes;
- autenticación y roles;
- motor de búsqueda dedicado;
- licencia del código y de los datos.
