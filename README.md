# La Casa del Naipe

Archivo, catálogo y colección dedicada a documentar el naipe como objeto histórico, cultural y material, con un primer foco en Uruguay y el Río de la Plata.

Este repositorio contiene la plataforma pública, el modelo de dominio y la infraestructura de datos de **La Casa del Naipe (LCDN)**.

## Estado

Proyecto en etapa fundacional. La prioridad actual es construir un catálogo auditable y duradero antes que una tienda.

## Principios

- **Catálogo ≠ colección:** una referencia puede existir aunque LCDN no posea un ejemplar.
- **Trazabilidad:** procedencia, fuentes, revisiones y cambios deben quedar registrados.
- **Conservación:** un objeto histórico cerrado no se abre solo para fotografiarlo.
- **Certeza explícita:** hecho, inferencia e hipótesis no se mezclan.
- **Identificadores permanentes:** los IDs públicos no se reutilizan.
- **Uruguay primero:** el primer corpus de investigación es el naipe vinculado a Uruguay.
- **Free-tier first:** la arquitectura debe poder operar en el plan gratuito de Cloudflare mientras el proyecto sea pequeño.

## Stack

- Next.js 16 API surface sobre **vinext/Vite** para Cloudflare Workers
- React 19 + TypeScript estricto
- Cloudflare Workers + Static Assets
- Cloudflare D1 + Drizzle ORM
- Cloudflare R2 para imágenes y archivos binarios
- Tailwind CSS 4
- Biome
- Vitest + Playwright
- pnpm workspaces
- GitHub Actions

## Arquitectura de costo

El sitio público es **static-first**. HTML, JS, CSS e imágenes de interfaz deben servirse como Static Assets siempre que sea posible; una visita pública no debería ejecutar un Worker si no necesita datos dinámicos.

D1 se reserva para catálogo estructurado, procedencia, fuentes y administración. R2 almacena originales y derivados de fotografías. No hay PostgreSQL externo, contenedores ni procesos persistentes.

## Estructura

```text
apps/web/          sitio público y futura administración en Workers
packages/catalog/  dominio, IDs y validación
packages/db/       esquema SQLite/D1 y acceso Drizzle
docs/              decisiones de arquitectura y política catalográfica
.github/            CI y automatización
```

## Desarrollo

Requisitos: Node.js 24 LTS y pnpm 12.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Para crear los recursos remotos por primera vez:

```bash
pnpm --filter @lacasadelnaipe/web exec wrangler login
pnpm --filter @lacasadelnaipe/web exec wrangler d1 create lacasadelnaipe
pnpm --filter @lacasadelnaipe/web exec wrangler r2 bucket create lacasadelnaipe-media
```

Luego reemplazá el `database_id` placeholder de `apps/web/wrangler.jsonc`.

## Calidad

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

## Licencia

Todavía no se definió una licencia para el proyecto. Hasta entonces, no se concede una licencia de reutilización del código o de los contenidos del catálogo.
