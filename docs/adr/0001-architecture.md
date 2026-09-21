# ADR 0001 — Arquitectura inicial

- Estado: aceptada
- Fecha: 2026-09-21

## Contexto

LCDN necesita empezar con dos mazos y poder crecer a miles de referencias, objetos, fuentes y colecciones sin confundir el catálogo intelectual con el inventario físico. El presupuesto inicial de infraestructura debe ser esencialmente cero.

Cloudflare Workers Free limita las invocaciones dinámicas y el tiempo de CPU, mientras que los Static Assets pueden servirse sin consumir esas invocaciones. D1 y R2 ofrecen cuotas gratuitas suficientes para la etapa fundacional.

## Decisión

Se adopta un monorepo TypeScript con tres límites claros:

1. `packages/catalog`: lenguaje y reglas del dominio, sin infraestructura.
2. `packages/db`: persistencia SQLite compatible con Cloudflare D1 mediante Drizzle.
3. `apps/web`: presentación pública y futura administración, desplegada en Cloudflare Workers.

La aplicación usa la superficie de Next.js 16 mediante vinext/Vite, actualmente la ruta recomendada por Cloudflare para aplicaciones Next.js nuevas en Workers.

### Restricción arquitectónica: Cloudflare Free Tier first

Mientras LCDN esté en etapa fundacional:

- no se introduce infraestructura que requiera procesos persistentes;
- no se depende de PostgreSQL/MySQL externos;
- D1 es la fuente de verdad transaccional;
- R2 almacena imágenes originales y derivados, no la base de datos;
- el sitio público es static-first;
- SSR y acceso a D1 se usan sólo cuando aportan valor real;
- las consultas deben usar índices y límites explícitos para evitar escaneos que consuman cuota de filas de D1;
- una dependencia que obligue a abandonar el plan gratuito necesita una decisión explícita y otro ADR.

Los IDs internos son UUID generados por la aplicación y los IDs públicos LCDN son identificadores humanos permanentes e independientes de la clave de base de datos.

## Consecuencias

- Las visitas a contenido estático pueden servirse sin consumir invocaciones de Worker.
- D1 y R2 escalan a cero y no requieren servidores propios.
- La UI puede reemplazarse sin redefinir el catálogo.
- Una referencia puede existir sin ejemplares físicos.
- Un objeto puede cambiar de ubicación o colección sin cambiar de identidad.
- La procedencia puede modelarse históricamente sin sobrescribir hechos anteriores.
- Si las cuotas gratuitas dejan de ser suficientes, se mide primero qué recurso se agotó antes de cambiar de arquitectura.

## No decidido todavía

- autenticación y roles;
- estrategia definitiva de generación/publicación de fichas estáticas;
- búsqueda de texto completo cuando el catálogo crezca;
- licencia del código y de los datos.
