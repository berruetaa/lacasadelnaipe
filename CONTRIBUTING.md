# Contribuir

## Preparación

```bash
pnpm install
cp .env.example .env
docker compose up -d
```

## Antes de abrir un PR

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

Usá cambios pequeños y explícitos. Las reglas del catálogo viven en `packages/catalog`; la base de datos las persiste y la web las presenta.

Los cambios que alteren identidad pública, procedencia, criterios de certeza, privacidad, conservación o estructura principal de datos deben incluir una decisión documentada en `docs/adr/`.

No agregues dependencias solo por conveniencia. Primero justificá qué capacidad concreta falta en la plataforma existente.
