# Cloudflare Free Tier budget

Fecha de referencia: 2026-09-21. Verificar contra la documentación oficial antes de tomar decisiones de capacidad.

## Presupuesto operativo

| Recurso | Cuota gratuita relevante | Regla LCDN |
| --- | ---: | --- |
| Workers | 100.000 requests/día; 10 ms CPU/invocación | No usar para contenido público que pueda ser estático. |
| Static Assets | requests gratis e ilimitados | Ruta preferida para páginas públicas, JS, CSS e interfaz. |
| D1 | 5 M filas leídas/día; 100.000 escritas/día | Índices, paginación y consultas acotadas obligatorias. |
| D1 storage | 500 MB por DB; 5 GB por cuenta Free | Sólo datos estructurados y metadata. Nunca fotografías. |
| R2 Standard | 10 GB-mes; 1 M Class A; 10 M Class B/mes; egress gratis | Originales y derivados de media. URLs/cache para evitar lecturas innecesarias. |
| Workers Builds | 3.000 min/mes | CI debe evitar builds redundantes. |

## Objetivo

Una navegación normal del catálogo debe costar **cero invocaciones dinámicas** cuando el contenido esté publicado como asset estático.

Los Workers se reservan para:

- búsqueda dinámica;
- administración autenticada;
- escritura en D1;
- subida/gestión de R2;
- endpoints que realmente necesitan estado actual.

## Señales para revisar arquitectura

No migrar por intuición. Revisar sólo cuando métricas reales indiquen alguno de estos casos:

- >70% sostenido de la cuota diaria de Workers;
- >70% sostenido de filas leídas/escritas en D1;
- catálogo acercándose al límite de almacenamiento de una DB Free;
- media acercándose al límite gratuito de R2;
- una consulta caliente requiere scans que no pueden resolverse con índices;
- el número de assets estáticos se acerca al límite por versión.

Antes de añadir un servicio pago, documentar medición, alternativa Cloudflare-native y costo esperado en un ADR.
