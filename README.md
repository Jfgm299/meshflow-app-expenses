# MeshFlow Expenses App

Minimal v0.1 remote-service app used to validate MeshFlow app discovery, installation, update, reinstall, and uninstall flows.

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
id: expenses
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
