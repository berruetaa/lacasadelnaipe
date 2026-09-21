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
- **Serverless first:** ningún componente de producción depende de procesos, pools o servidores persistentes administrados por LCDN.

## Stack

- Next.js 16 / React 19
- TypeScript estricto
- Neon Serverless Postgres
- Drizzle ORM sobre Neon HTTP
- Zod
- Tailwind CSS 4
- Biome
- Vitest + Playwright
- pnpm workspaces
- GitHub Actions

## Arquitectura

```text
Browser
  ↓
Next.js (serverless functions / server components)
  ↓ HTTPS
Neon Serverless Postgres

Object storage serverless (imágenes, cuando se incorpore)
```

No hay servidor de aplicación persistente, conexión PostgreSQL TCP mantenida, Docker ni base de datos local obligatoria en runtime.

## Estructura

```text
apps/web/          sitio público y futura administración
packages/catalog/  dominio, IDs y validación
packages/db/       esquema y acceso serverless a datos
docs/              decisiones de arquitectura y política catalográfica
.github/            CI y automatización
```

## Desarrollo

Requisitos: Node.js 24 LTS, pnpm 12 y una `DATABASE_URL` de Neon para las tareas que requieren persistencia.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

El dominio y sus tests no requieren una base de datos activa.

## Calidad

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

## Licencia

Todavía no se definió una licencia para el proyecto. Hasta entonces, no se concede una licencia de reutilización del código o de los contenidos del catálogo.
