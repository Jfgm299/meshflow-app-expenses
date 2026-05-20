import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ID, APP_NAME, APP_VERSION, OPENAPI_DESCRIPTION, OPENAPI_TITLE } from "./app.identity";

interface PackageMetadata {
  name: string;
  description: string;
  version: string;
}

interface MeshFlowManifest {
  id: string;
  name: string;
  version: string;
  service: {
    healthPath: string;
    openapiPath: string;
  };
  collections: MeshFlowManifestCollection[];
  jobs?: MeshFlowManifestJob[];
}

interface MeshFlowManifestCollection {
  name: string;
  schema: string;
}

interface MeshFlowManifestJob {
  id: string;
  name: string;
  path: string;
  method: "POST";
  schedule: {
    type: "daily";
    time: string;
    timezone: string;
  };
  enabled: boolean;
  timeoutMs?: number;
}

interface MeshFlowRegistry {
  apps: Array<{
    id: string;
    latestVersion: string;
    checksum: string;
  }>;
}

const readJson = <T>(relativePath: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), relativePath), "utf8")) as T;

const expectedFinanceCollections = [
  "accounts",
  "categories",
  "transactions",
  "recurring-transactions",
  "scheduled-transactions"
] as const;

describe("app identity metadata", () => {
  it("uses the Finance identity for runtime smoke-test payloads and OpenAPI metadata", () => {
    expect(APP_ID).toBe("finance");
    expect(APP_NAME).toBe("MeshFlow Finance");
    expect(APP_VERSION).toBe("1.0.0");
    expect(OPENAPI_TITLE).toBe("MeshFlow Finance App");
    expect(OPENAPI_DESCRIPTION).toContain("Finance remote app backend");
  });

  it("keeps package, manifest, and registry metadata aligned", () => {
    const packageMetadata = readJson<PackageMetadata>("package.json");
    const manifest = readJson<MeshFlowManifest>("meshflow/manifest.json");
    const registry = readJson<MeshFlowRegistry>("meshflow/registry.json");
    const registryApp = registry.apps[0];

    expect(packageMetadata.name).toBe("meshflow-app-finance");
    expect(packageMetadata.description).toBe("MeshFlow Finance remote app backend");
    expect(packageMetadata.version).toBe(APP_VERSION);

    expect(manifest.id).toBe(APP_ID);
    expect(manifest.name).toBe(APP_NAME);
    expect(manifest.version).toBe(APP_VERSION);
    expect(manifest.service.healthPath).toBe("/health");
    expect(manifest.service.openapiPath).toBe("/openapi.json");
    expect(manifest.collections.map((collection) => collection.name)).toEqual([...expectedFinanceCollections]);

    expect(registryApp).toBeDefined();
    expect(registryApp.id).toBe(APP_ID);
    expect(registryApp.latestVersion).toBe(APP_VERSION);
  });

  it("declares the checksum of the v1.0.0 package marker used by lifecycle validation", () => {
    const registry = readJson<MeshFlowRegistry>("meshflow/registry.json");
    const packageMarker = readFileSync(join(process.cwd(), "meshflow/package-v1.0.0.txt"));
    const checksum = createHash("sha256").update(packageMarker).digest("hex");

    expect(registry.apps[0].checksum).toBe(`sha256:${checksum}`);
  });

  it("declares Finance Core Storage collections with loadable schema files", () => {
    const manifest = readJson<MeshFlowManifest>("meshflow/manifest.json");

    expect(manifest.collections).toEqual(
      expectedFinanceCollections.map((collectionName) => ({
        name: collectionName,
        schema: `./schemas/${collectionName}.schema.json`
      }))
    );

    for (const collection of manifest.collections) {
      const schema = readJson<Record<string, unknown>>(`meshflow/${collection.schema.replace(/^\.\//, "")}`);

      expect(schema.type).toBe("object");
    }
  });

  it("declares the process-due Core App Jobs Scheduler entry", () => {
    const manifest = readJson<MeshFlowManifest>("meshflow/manifest.json");

    expect(manifest.jobs).toEqual([
      {
        id: "process-due",
        name: "Process due transactions",
        path: "/internal/jobs/process-due",
        method: "POST",
        schedule: {
          type: "daily",
          time: "00:00",
          timezone: "UTC"
        },
        enabled: true
      }
    ]);
  });
});
