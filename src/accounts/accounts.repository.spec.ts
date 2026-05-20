import { CoreStorageClient, type CoreStorageRequestOptions, type ScopedStorageCollection } from "../core/core-storage.client";
import { AccountsRepository } from "./accounts.repository";
import type { AccountRecord } from "./accounts.types";

const account: AccountRecord = {
  id: "account-1",
  userId: "user-123",
  name: "Main account",
  currency: "EUR",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const createStorageClientMock = (result: unknown): { storageClient: CoreStorageClient; requestMock: jest.Mock<Promise<unknown>, [CoreStorageRequestOptions]>; collectionMock: jest.Mock<ScopedStorageCollection, Parameters<CoreStorageClient["collection"]>> } => {
  const requestMock = jest.fn<Promise<unknown>, [CoreStorageRequestOptions]>().mockResolvedValue(result);
  const scopedStorageCollection: ScopedStorageCollection = {
    request: <TResult>(options: CoreStorageRequestOptions): Promise<TResult> => requestMock(options) as Promise<TResult>
  };
  const collectionMock = jest.fn<ScopedStorageCollection, Parameters<CoreStorageClient["collection"]>>().mockReturnValue(scopedStorageCollection);
  const storageClient = {
    collection: collectionMock
  } as unknown as CoreStorageClient;

  return { storageClient, requestMock, collectionMock };
};

describe("AccountsRepository", () => {
  it("lists accounts through a caller-scoped Core Storage collection and excludes deleted records", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock([account]);
    const repository = new AccountsRepository(storageClient);

    await expect(repository.list({ userId: "user-123" })).resolves.toEqual([account]);

    expect(collectionMock).toHaveBeenCalledWith("accounts", { userId: "user-123" });
    expect(requestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "records",
      searchParams: {
        includeDeleted: "false"
      }
    });
  });

  it("reads accounts through a caller-scoped Core Storage collection", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock(account);
    const repository = new AccountsRepository(storageClient);

    await expect(repository.read({ userId: "user-123" }, "account-1")).resolves.toEqual(account);

    expect(collectionMock).toHaveBeenCalledWith("accounts", { userId: "user-123" });
    expect(requestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "records/account-1",
      searchParams: {
        includeDeleted: "false"
      }
    });
  });

  it("updates accounts through a caller-scoped Core Storage collection", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock(account);
    const repository = new AccountsRepository(storageClient);

    await expect(repository.update({ userId: "user-123" }, "account-1", { name: "Updated account", updatedAt: "2026-02-01T00:00:00.000Z" })).resolves.toEqual(account);

    expect(collectionMock).toHaveBeenCalledWith("accounts", { userId: "user-123" });
    expect(requestMock).toHaveBeenCalledWith({
      method: "PATCH",
      path: "records/account-1",
      searchParams: {
        includeDeleted: "false"
      },
      body: {
        name: "Updated account",
        updatedAt: "2026-02-01T00:00:00.000Z"
      }
    });
  });

  it("soft deletes accounts through a caller-scoped Core Storage collection", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock(account);
    const repository = new AccountsRepository(storageClient);

    await expect(
      repository.softDelete({ userId: "user-123" }, "account-1", {
        deletedAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z"
      })
    ).resolves.toEqual(account);

    expect(collectionMock).toHaveBeenCalledWith("accounts", { userId: "user-123" });
    expect(requestMock).toHaveBeenCalledWith({
      method: "PATCH",
      path: "records/account-1",
      searchParams: {
        includeDeleted: "false"
      },
      body: {
        deletedAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z"
      }
    });
  });
});
