# Finance V1 — Diseño Técnico

## 1. Resumen de arquitectura

```txt
Frontend
  -> Core Gateway
    -> Finance Remote Service
      -> Core Storage API collections
      -> Core App Jobs Scheduler callback: /internal/jobs/process-due
```

| Componente | Responsabilidad |
|---|---|
| Frontend | UI de Finance e interacciones de usuario. Llama a Finance mediante Core Gateway. |
| Core Gateway | Autentica al usuario y reenvía headers de identidad confiable, especialmente `x-meshflow-user-id`. |
| Finance | API de dominio stateless, validación, aislamiento por usuario, composición de analytics y orquestación de procesamiento de vencidos. |
| Core Storage | Persistencia durable para collections de Finance. Finance V1 no tiene DB propia. |
| Core App Jobs | Invoca jobs declarados cuando el scheduler está habilitado; soporta ejecuciones manuales admin y procesamiento diario UTC de vencidos. |

---

## 2. Collections del manifest

Finance V1 debe declarar estas collections de Core Storage en `meshflow/manifest.json`:

| Collection | Propósito |
|---|---|
| `accounts` | Cuentas, billeteras o contenedores tipo banco del usuario. |
| `categories` | Clasificaciones definidas por el usuario para ingresos o gastos. |
| `transactions` | Entradas de ledger para ingresos y gastos. |
| `recurring-transactions` | Definiciones recurrentes, como suscripciones y salarios. |
| `scheduled-transactions` | Definiciones futuras de ingresos o gastos únicos. |

El manifest también debe declarar un job top-level de Core App Jobs Scheduler llamado `process-due`, apuntando a `/internal/jobs/process-due` con cadencia diaria UTC. El scheduler queda deshabilitado por default a nivel Core y se habilita mediante configuración de entorno.

---

## 3. Schemas conceptuales

Campos conceptuales comunes para todos los records pertenecientes a usuario: `id`, `userId`, `createdAt`, `updatedAt`, `deletedAt?`.

| Collection | Campos conceptuales |
|---|---|
| `accounts` | `name`, `currency = EUR`, `type?`, `initialBalance?`, `isArchived?`, campos comunes. |
| `categories` | `name`, `type: income | expense`, `color?`, `icon?`, campos comunes. |
| `transactions` | `type: income | expense`, `amount`, `currency`, `accountId`, `categoryId?`, `date`, `description?`, `notes?`, `source?: manual | recurring | scheduled`, `sourceId?`, `sourceOccurrenceDate?`, campos comunes. |
| `recurring-transactions` | `type`, `amount`, `currency`, `accountId`, `categoryId?`, `description?`, `frequency`, `interval?`, `startDate`, `endDate?`, `nextRunDate`, `lastRunDate?`, `status`, campos comunes. |
| `scheduled-transactions` | `type`, `amount`, `currency`, `accountId`, `categoryId?`, `description?`, `scheduledDate`, `status: pending | processed | cancelled`, `processedTransactionId?`, campos comunes. |

La representación de dinero queda intencionalmente conceptual en este documento; la implementación debe elegir una representación exacta antes de codificar.

---

## 4. Tablas de endpoints

### 4.1. Health / OpenAPI

| Method | Path | Propósito |
|---|---|---|
| GET | `/health` | Health del servicio para discovery de Core. |
| GET | `/openapi.json` | Contrato API machine-readable. |

### 4.2. Accounts CRUD

| Method | Path | Propósito |
|---|---|---|
| GET | `/accounts` | Listar cuentas del caller, excluyendo soft-deleted por default. |
| POST | `/accounts` | Crear cuenta; usar `EUR` como moneda default cuando se omite. |
| GET | `/accounts/:id` | Leer cuenta del caller. |
| PATCH | `/accounts/:id` | Actualizar cuenta del caller. |
| DELETE | `/accounts/:id` | Soft-delete de cuenta del caller. |

### 4.3. Categories CRUD

| Method | Path | Propósito |
|---|---|---|
| GET | `/categories` | Listar categorías del caller, opcionalmente por `type`. |
| POST | `/categories` | Crear categoría con `type: income | expense`. |
| GET | `/categories/:id` | Leer categoría del caller. |
| PATCH | `/categories/:id` | Actualizar categoría del caller. |
| DELETE | `/categories/:id` | Soft-delete de categoría del caller. |

### 4.4. Transactions CRUD / filtros de listado

| Method | Path | Propósito |
|---|---|---|
| GET | `/transactions` | Listar transacciones del caller con filtros: `from`, `to`, `accountId`, `categoryId`, `type`, `includeDeleted?`, paginación/sort. |
| POST | `/transactions` | Crear transacción manual de ingreso o gasto. |
| GET | `/transactions/:id` | Leer transacción del caller. |
| PATCH | `/transactions/:id` | Actualizar transacción del caller. |
| DELETE | `/transactions/:id` | Soft-delete de transacción del caller. |

### 4.5. Recurring Transactions

| Method | Path | Propósito |
|---|---|---|
| GET | `/recurring-transactions` | Listar definiciones recurrentes. |
| POST | `/recurring-transactions` | Crear definición de suscripción, salario o ingreso/gasto recurrente. |
| GET | `/recurring-transactions/:id` | Leer definición recurrente. |
| PATCH | `/recurring-transactions/:id` | Actualizar definición recurrente. |
| DELETE | `/recurring-transactions/:id` | Soft-delete de definición recurrente. |
| POST | `/recurring-transactions/:id/process` | Endpoint process-one opcional interno/admin. |

### 4.6. Scheduled Transactions

| Method | Path | Propósito |
|---|---|---|
| GET | `/scheduled-transactions` | Listar definiciones programadas únicas. |
| POST | `/scheduled-transactions` | Crear ingreso o gasto futuro. |
| GET | `/scheduled-transactions/:id` | Leer definición programada. |
| PATCH | `/scheduled-transactions/:id` | Actualizar definición programada. |
| DELETE | `/scheduled-transactions/:id` | Soft-delete o cancelación de definición programada. |
| POST | `/scheduled-transactions/:id/process` | Endpoint process-one opcional interno/admin. |

### 4.7. Endpoint de procesamiento de vencidos

| Method | Path | Caller | Propósito |
|---|---|---|---|
| POST | `/internal/jobs/process-due` | Core Scheduler / ejecución manual admin | Procesar transacciones recurrentes y programadas vencidas. |

El handler debe aceptar el contexto de ejecución provisto por Core cuando exista y devolver contadores como `recurringProcessed`, `scheduledProcessed`, `transactionsCreated`, `skippedDuplicates` y `errors`.

### 4.8. Analytics endpoints

| Method | Path | Propósito |
|---|---|---|
| GET | `/analytics/overview` | Totales resumidos y destacados del período actual. |
| GET | `/analytics/cashflow` | Ingresos, gastos y cashflow neto en un rango de fechas. |
| GET | `/analytics/by-category` | Totales agrupados por categoría y tipo. |
| GET | `/analytics/by-account` | Totales/balances agrupados por cuenta. |
| GET | `/analytics/timeline` | Serie temporal de valores de ingreso/gasto/neto. |
| GET | `/analytics/top-expenses` | Transacciones/categorías de gasto más grandes de un período. |
| GET | `/analytics/top-income` | Transacciones/categorías de ingreso más grandes de un período. |
| GET | `/analytics/upcoming` | Próximas ocurrencias programadas y recurrentes. |
| GET | `/analytics/recurring-impact` | Impacto esperado de ingresos/gastos recurrentes. |
| GET | `/analytics/forecast` | Proyección simple usando estado actual de cuentas más ítems próximos/recurrentes. |

---

## 5. Scheduler e idempotencia

`process-due` debe procesar records recurrentes y programados vencidos de forma idempotente. Las transacciones generadas deben llevar:

- `source`: `recurring` o `scheduled`
- `sourceId`: ID de la definición recurrente/programada
- `sourceOccurrenceDate`: fecha de vencimiento de la ocurrencia que se materializa

Antes de crear una transacción generada, Finance debe verificar si ya existe una transacción no borrada con el mismo `userId`, `source`, `sourceId` y `sourceOccurrenceDate`. Si existe, la ejecución omite la creación y avanza/marca el record de origen solo cuando sea seguro. Esto protege contra ejecuciones admin/manuales duplicadas, retries del scheduler y procesamientos vencidos superpuestos.

---

## 6. Seguridad y aislamiento de usuario

- Finance confía en headers de identidad enviados por Core Gateway, especialmente `x-meshflow-user-id`.
- Toda escritura/lectura/query contra Storage API debe incluir y reforzar ownership por `userId` del caller.
- Los IDs provistos por usuario nunca deben saltear validaciones de ownership.
- El acceso público directo a Finance permitiría falsificar headers de identidad en V1. El despliegue debe mantener Finance detrás de Core Gateway/controles de red. Firmas de request, mTLS o tokens internos emitidos por Gateway quedan como hardening futuro.

---

## 7. Política de soft delete

- Los deletes de dominio setean `deletedAt` en lugar de remover físicamente records.
- Los endpoints de listado excluyen records soft-deleted por default.
- Lecturas directas de records borrados deberían responder not found salvo que se introduzca un modo explícito interno/admin include-deleted.
- Las transacciones generadas no deberían duplicarse contra claves de idempotencia no borradas; el comportamiento para transacciones generadas borradas debe decidirse antes de implementar.

---

## 8. Estrategia de testing

| Nivel de test | Cobertura |
|---|---|
| Unit | Validación de DTOs, restricciones de tipo de categoría, moneda default EUR, generación de claves de idempotencia, elegibilidad por due date. |
| Service | Aislamiento de usuario en CRUD, acceso a collections de Storage API, filtrado de soft delete, agregación de analytics. |
| Scheduler/job | Procesamiento `process-due` recurrente y programado, seguridad ante ejecuciones duplicadas, comportamiento ante fallos parciales. |
| Contract/API | Forma OpenAPI, status codes, parámetros de filtros, requisitos de headers de Gateway. |
| Integration | Servicio Finance contra Core Storage API mock/fake y payloads de callback del scheduler. |

Los comandos de verificación deben evitar builds salvo pedido explícito. Los batches de implementación planificados deben definir comandos de test enfocados como `npm test`, `npm run test:unit` o scripts equivalentes disponibles en el repositorio al momento de implementación.
