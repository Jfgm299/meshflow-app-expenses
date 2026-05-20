# MeshFlow Finance App

App `remote-service` mínima de **MeshFlow Finance** usada para validar flujos de discovery, instalación, actualización, reinstalación y desinstalación de apps en MeshFlow.

La app nació como **MeshFlow Expenses** en v0.1 para smoke tests de lifecycle. Ese historial se preserva, pero la identidad pública actual es **MeshFlow Finance** (`finance`). La app actual `0.1.x` sigue siendo un smoke test de lifecycle; la planificación de Finance V1 vive en [`docs/v1`](docs/v1/):

- [`00_initial_prd.md`](docs/v1/00_initial_prd.md)
- [`01_technical_design.md`](docs/v1/01_technical_design.md)
- [`02_batches.md`](docs/v1/02_batches.md)

## What this version contains

- NestJS backend with a single `GET /health` endpoint.
- OpenAPI document at `GET /openapi.json`.
- MeshFlow manifest at `meshflow/manifest.json`.
- No database, no app storage collections, and no domain tables.

## Local development

```bash
npm install
npm run start:dev
```

The app listens on port `4010` by default.

## Endpoints

```http
GET /health
GET /openapi.json
```

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

This version intentionally declares no storage permissions and no collections.

## Registry source for Core testing

For the first install/update/uninstall validation pass, MeshFlow Core can use this repository's registry document directly:

```txt
https://raw.githubusercontent.com/Jfgm299/meshflow-app-expenses/main/meshflow/registry.json
```

The registry points to:

- `meshflow/manifest.json`
- `meshflow/package-v0.1.0.txt`

The package file is only a checksum marker for V0.1 lifecycle validation; the runtime app is the remote service declared by `service.baseUrl`.
