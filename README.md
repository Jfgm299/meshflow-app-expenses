# MeshFlow Finance App

App `remote-service` mínima de **MeshFlow Finance** usada para validar flujos de discovery, instalación, actualización, reinstalación y desinstalación de apps en MeshFlow.

La app nació como **MeshFlow Expenses** en v0.1 para smoke tests de lifecycle. Ese historial se preserva, pero la identidad pública actual es **MeshFlow Finance** (`finance`). La app actual `0.1.x` sigue siendo un smoke test de lifecycle; la planificación de Finance V1 vive en [`docs/v1`](docs/v1/):

- [`00_initial_prd.md`](docs/v1/00_initial_prd.md)
- [`01_technical_design.md`](docs/v1/01_technical_design.md)
- [`02_batches.md`](docs/v1/02_batches.md)

## What this version contains

- NestJS backend for Finance V1 accounts, categories, transactions, recurring transactions, scheduled transactions, due processing, and analytics endpoints.
- Public health endpoint at `GET /health`.
- OpenAPI document at `GET /openapi.json` and Swagger UI mounted at `/docs`.
- MeshFlow manifest at `meshflow/manifest.json` with Finance collections and the `process-due` internal job declaration.
- No local database: Finance V1 persists records through MeshFlow Core Storage API.

## Local development

```bash
npm install
npm run start:dev
```

The app listens on port `4010` by default.

### Runtime configuration

| Variable | Default | Description |
|---|---:|---|
| `PORT` | `4010` | HTTP port for the remote Finance service. |
| `CORE_STORAGE_API_BASE_URL` | `http://localhost:4000/storage` | Base URL for MeshFlow Core Storage API. Finance appends `/collections/{collection}/...` and sends caller scope on each storage request. |

## Endpoints

```http
GET /health
GET /openapi.json
GET /docs

GET    /accounts
POST   /accounts
GET    /accounts/{id}
PATCH  /accounts/{id}
DELETE /accounts/{id}

GET    /categories
POST   /categories
GET    /categories/{id}
PATCH  /categories/{id}
DELETE /categories/{id}

GET    /transactions
POST   /transactions
GET    /transactions/{id}
PATCH  /transactions/{id}
DELETE /transactions/{id}

GET    /recurring-transactions
POST   /recurring-transactions
GET    /recurring-transactions/{id}
PATCH  /recurring-transactions/{id}
DELETE /recurring-transactions/{id}

GET    /scheduled-transactions
POST   /scheduled-transactions
GET    /scheduled-transactions/{id}
PATCH  /scheduled-transactions/{id}
DELETE /scheduled-transactions/{id}

POST   /internal/jobs/process-due

GET /analytics/overview
GET /analytics/cashflow
GET /analytics/by-category
GET /analytics/by-account
GET /analytics/timeline
GET /analytics/top-expenses
GET /analytics/top-income
GET /analytics/upcoming
GET /analytics/recurring-impact
GET /analytics/forecast
```

## Security model

Finance V1 is designed to run behind MeshFlow Core Gateway. Protected routes trust the `x-meshflow-user-id` header injected by Core Gateway and reject requests where that header is missing. Direct public access to this service is therefore unsafe: a public client could spoof `x-meshflow-user-id` if the service is exposed without the gateway or equivalent network controls.

Every protected resource route passes the caller user context into Core Storage, and resource reads/lists/updates/deletes exclude soft-deleted records by default. Analytics adds defensive filtering by `userId` and `deletedAt` after loading caller-scoped records.

Public endpoints:

- `GET /health`
- `GET /openapi.json`
- `/docs`

Protected endpoints:

- all `/accounts`, `/categories`, `/transactions`, `/recurring-transactions`, `/scheduled-transactions`, `/internal/jobs/process-due`, and `/analytics/*` routes.

## MeshFlow manifest

The manifest declares this app as a `remote-service` with:

```txt
id: finance
name: MeshFlow Finance
version: 0.1.0
baseUrl: http://localhost:4010
healthPath: /health
openapiPath: /openapi.json
```

This version declares the Finance V1 storage collections used by the resource APIs and analytics flows.

## Registry source for Core testing

For the first install/update/uninstall validation pass, MeshFlow Core can use this repository's registry document directly:

```txt
https://raw.githubusercontent.com/Jfgm299/meshflow-app-expenses/main/meshflow/registry.json
```

The registry points to:

- `meshflow/manifest.json`
- `meshflow/package-v0.1.0.txt`

The package file is only a checksum marker for V0.1 lifecycle validation; the runtime app is the remote service declared by `service.baseUrl`.
