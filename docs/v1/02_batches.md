# Finance V1 — Plan de Batches

Ningún batch está completado todavía. Este plan es únicamente el mapa de implementación; no ejecutar estos cambios como parte de la planificación.

---

## F00 — Renombrar identidad de app: Expenses a Finance

| Campo | Detalle |
|---|---|
| Objetivo | Renombrar identidad de producto y metadata de Expenses a Finance, preservando el historial v0.1 de lifecycle smoke test. |
| Requisitos cubiertos | FIN-CI-001, soporta todo el trabajo de Finance V1. |
| Archivos/Módulos esperados | `README.md`, package metadata, naming de app Nest, `meshflow/manifest.json`, `meshflow/registry.json`, package marker metadata. |
| Tests requeridos | Smoke tests para `/health` y `/openapi.json`; validación de manifest/registry. |
| Comandos de verificación | `npm test` o comando smoke-test disponible; no build salvo pedido explícito. |

## F01 — Fundación de integración Core

| Campo | Detalle |
|---|---|
| Objetivo | Agregar extracción de identidad confiable de Core Gateway y abstracción de cliente Core Storage API. |
| Requisitos cubiertos | FIN-AUTH-001, FIN-AUTH-002, FIN-STO-001, FIN-SEC-001. |
| Archivos/Módulos esperados | Middleware o guard de auth/header, provider de contexto de usuario por request, módulo de cliente Storage, módulo de configuración. |
| Tests requeridos | Rechazo por falta de header de usuario, propagación de contexto de usuario, cliente Storage llamado con scope de usuario. |
| Comandos de verificación | `npm test -- auth storage` o tests unitarios enfocados equivalentes del repo. |

## F02 — Manifest collections y declaración de job

| Campo | Detalle |
|---|---|
| Objetivo | Declarar collections de Finance y job `process-due` en el manifest de MeshFlow. |
| Requisitos cubiertos | FIN-STO-002, FIN-DUE-001. |
| Archivos/Módulos esperados | `meshflow/manifest.json`, registry/package metadata si hace falta. |
| Tests requeridos | Validación de schema de manifest, validación de lista de collections, validación de declaración de job. |
| Comandos de verificación | Script de validación de manifest o `npm test -- manifest` si existe. |

## F03 — Accounts API

| Campo | Detalle |
|---|---|
| Objetivo | Implementar CRUD de cuentas aislado por usuario mediante Core Storage. |
| Requisitos cubiertos | FIN-ACC-001, FIN-ACC-002, FIN-AUTH-002, FIN-STO-001. |
| Archivos/Módulos esperados | Controller de accounts, DTOs, service, repository/storage adapter, tests. |
| Tests requeridos | Creación con EUR default, moneda custom, ownership en listar/leer/actualizar/borrar, exclusión de soft delete. |
| Comandos de verificación | `npm test -- accounts`. |

## F04 — Categories API

| Campo | Detalle |
|---|---|
| Objetivo | Implementar CRUD de categorías con tipado estricto `income | expense`. |
| Requisitos cubiertos | FIN-CAT-001, FIN-CAT-002, FIN-AUTH-002, FIN-STO-001. |
| Archivos/Módulos esperados | Controller de categories, DTOs, service, storage adapter, tests de validación. |
| Tests requeridos | Rechazar `both`, rechazar tipos desconocidos, aislamiento por usuario, filtrado de soft delete. |
| Comandos de verificación | `npm test -- categories`. |

## F05 — Transactions API

| Campo | Detalle |
|---|---|
| Objetivo | Implementar CRUD unificado de transacciones ingreso/gasto y filtros de listado. |
| Requisitos cubiertos | FIN-TXN-001, FIN-TXN-002, FIN-TXN-003, FIN-AUTH-002, FIN-STO-001. |
| Archivos/Módulos esperados | Controller de transactions, DTOs, service, storage adapter, utilidades de filtros/query. |
| Tests requeridos | Creación de ingreso y gasto, política de moneda requerida/default si se decide, filtros por fecha/cuenta/categoría/tipo, ownership, soft delete. |
| Comandos de verificación | `npm test -- transactions`. |

## F06 — Recurring Transactions API

| Campo | Detalle |
|---|---|
| Objetivo | Implementar definiciones recurrentes para suscripciones, salarios e ingresos/gastos recurrentes. |
| Requisitos cubiertos | FIN-REC-001, FIN-AUTH-002, FIN-STO-001. |
| Archivos/Módulos esperados | Controller de recurring, DTOs, service, utilidades de cálculo de schedule, storage adapter. |
| Tests requeridos | Crear recurrencia de ingreso/gasto, cálculo de next run, update/cancel/soft delete, ownership. |
| Comandos de verificación | `npm test -- recurring`. |

## F07 — Scheduled Transactions API

| Campo | Detalle |
|---|---|
| Objetivo | Implementar registros programados futuros de ingreso/gasto único. |
| Requisitos cubiertos | FIN-SCH-001, FIN-AUTH-002, FIN-STO-001. |
| Archivos/Módulos esperados | Controller de scheduled, DTOs, service, storage adapter. |
| Tests requeridos | Crear ingreso/gasto futuro, transiciones de estado, cancelación/soft delete, ownership. |
| Comandos de verificación | `npm test -- scheduled`. |

## F08 — Due Processing Job

| Campo | Detalle |
|---|---|
| Objetivo | Implementar `/internal/jobs/process-due` para materializar transacciones recurrentes y programadas vencidas. |
| Requisitos cubiertos | FIN-DUE-001, FIN-DUE-002, FIN-REC-002, FIN-SCH-002. |
| Archivos/Módulos esperados | Controller de internal jobs, due processing service, helper de idempotencia, processors recurrente/programado. |
| Tests requeridos | Recurrente vencida crea transacción, programada vencida crea transacción, ejecución duplicada omite existente por `source/sourceId/sourceOccurrenceDate`, reporte de fallos parciales. |
| Comandos de verificación | `npm test -- process-due`. |

## F09 — Analytics Endpoints

| Campo | Detalle |
|---|---|
| Objetivo | Agregar endpoints enfocados de analytics respaldados por datos de transacciones, cuentas, recurrentes y programadas. |
| Requisitos cubiertos | FIN-ANA-001, FIN-ANA-002. |
| Archivos/Módulos esperados | Controller de analytics, analytics service, helpers de agregación, DTOs. |
| Tests requeridos | Overview, cashflow, agrupación por categoría/cuenta, timeline, top expenses/income, upcoming, recurring impact, forecast; filtros por fecha/usuario. |
| Comandos de verificación | `npm test -- analytics`. |

## F10 — OpenAPI, revisión de seguridad y hardening tests V1

| Campo | Detalle |
|---|---|
| Objetivo | Cerrar contrato API, documentación de seguridad y cobertura de regresión cross-feature. |
| Requisitos cubiertos | FIN-AUTH-001, FIN-AUTH-002, FIN-SEC-001, FIN-CI-001 más regresión transversal de V1. |
| Archivos/Módulos esperados | Decorators/schema OpenAPI, actualizaciones de README/docs, suites de regresión, documentación de configuración. |
| Tests requeridos | OpenAPI incluye todos los endpoints V1, riesgo de header faltante/falsificado documentado, todas las rutas de recursos refuerzan ownership, regresión de política de soft delete. |
| Comandos de verificación | `npm test`; comando opcional lint/typecheck si existe; no build salvo pedido explícito. |

### Notas finales F10

- `GET /health`, `GET /openapi.json` y `/docs` son públicos.
- Todas las rutas de recursos, jobs internos y analytics requieren `x-meshflow-user-id` confiado desde MeshFlow Core Gateway.
- Finance V1 no autentica usuarios finales por sí mismo; confía en Core Gateway. No exponer la app directamente a clientes públicos porque podrían falsificar `x-meshflow-user-id`.
- El contrato OpenAPI documenta el esquema `trustedCoreUser` y marca los endpoints protegidos con el header requerido.
- La política de soft delete V1 es excluir registros eliminados en lecturas/listados activos; analytics aplica además filtrado defensivo por `userId` y `deletedAt` sobre datos cargados desde storage scoping.
