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

## Stack

- Next.js 16 / React 19
- TypeScript estricto
- PostgreSQL 18
- Drizzle ORM
- Zod
- Tailwind CSS 4
- Biome
- Vitest + Playwright
- pnpm workspaces
- GitHub Actions

## Estructura

```text
apps/web/          sitio público y futura administración
packages/catalog/  dominio, IDs y validación
packages/db/       esquema PostgreSQL y acceso a datos
docs/              decisiones de arquitectura y política catalográfica
.github/            CI y automatización
```

## Desarrollo

Requisitos: Node.js 24 LTS, pnpm 12 y Docker/Podman compatible con Compose.

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm dev
```

## Calidad

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

## Licencia

Todavía no se definió una licencia para el proyecto. Hasta entonces, no se concede una licencia de reutilización del código o de los contenidos del catálogo.
