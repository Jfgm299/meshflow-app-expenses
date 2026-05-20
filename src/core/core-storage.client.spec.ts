import { CoreStorageClient, type CoreStorageFetch, type CoreStorageFetchResponse } from "./core-storage.client";
import type { CoreStorageConfig } from "./core-storage.config";

interface TestStorageRecord {
  id: string;
  userId: string;
}

const successfulJsonResponse = (payload: unknown): CoreStorageFetchResponse => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => payload,
  text: async () => JSON.stringify(payload)
});

describe("CoreStorageClient", () => {
  it("scopes collection operations with the trusted user id", async () => {
    const config: CoreStorageConfig = { baseUrl: "http://core.local/storage" };
    const payload: TestStorageRecord[] = [{ id: "record-1", userId: "user-123" }];
    const fetchFn = jest.fn<ReturnType<CoreStorageFetch>, Parameters<CoreStorageFetch>>().mockResolvedValue(successfulJsonResponse(payload));
    const client = new CoreStorageClient(config, fetchFn);

    const result = await client.collection("accounts", { userId: "user-123" }).request<TestStorageRecord[]>({
      method: "GET",
      path: "records",
      searchParams: {
        includeDeleted: "false"
      }
    });

    expect(result).toEqual(payload);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url.toString()).toBe("http://core.local/storage/collections/accounts/records?userId=user-123&includeDeleted=false");
    expect(init.method).toBe("GET");
    expect(init.headers).toMatchObject({
      "x-meshflow-user-id": "user-123"
    });
  });

  it("serializes write bodies without hiding the explicit user scope", async () => {
    const config: CoreStorageConfig = { baseUrl: "http://core.local/storage" };
    const fetchFn = jest.fn<ReturnType<CoreStorageFetch>, Parameters<CoreStorageFetch>>().mockResolvedValue(successfulJsonResponse({ id: "record-1" }));
    const client = new CoreStorageClient(config, fetchFn);

    await client.collection("accounts", { userId: "user-123" }).request<{ id: string }>({
      method: "POST",
      path: "records",
      body: {
        name: "Main"
      }
    });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url.searchParams.get("userId")).toBe("user-123");
    expect(init.body).toBe(JSON.stringify({ name: "Main" }));
  });
});
