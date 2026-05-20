import { CoreStorageClient, type CoreStorageRequestOptions, type ScopedStorageCollection } from "../core/core-storage.client";
import { TransactionsRepository } from "./transactions.repository";
import type { TransactionRecord } from "./transactions.types";

const transaction: TransactionRecord = {
  id: "transaction-1",
  userId: "user-123",
  type: "income",
  amount: 1250.5,
  currency: "EUR",
  accountId: "account-1",
  date: "2026-01-10T00:00:00.000Z",
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

describe("TransactionsRepository", () => {
  it("lists transactions through a caller-scoped Core Storage collection with filters", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock([transaction]);
    const repository = new TransactionsRepository(storageClient);

    await expect(repository.list({ userId: "user-123" }, { from: "2026-01-01", to: "2026-01-31", accountId: "account-1", categoryId: "category-1", type: "income", includeDeleted: false })).resolves.toEqual([transaction]);

    expect(collectionMock).toHaveBeenCalledWith("transactions", { userId: "user-123" });
    expect(requestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "records",
      searchParams: {
        includeDeleted: "false",
        from: "2026-01-01",
        to: "2026-01-31",
        accountId: "account-1",
        categoryId: "category-1",
        type: "income"
      }
    });
  });

  it("reads, updates, and soft deletes transactions through caller-scoped Core Storage", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock(transaction);
    const repository = new TransactionsRepository(storageClient);

    await expect(repository.read({ userId: "user-123" }, "transaction-1")).resolves.toEqual(transaction);
    await expect(repository.update({ userId: "user-123" }, "transaction-1", { description: "Updated", updatedAt: "2026-02-01T00:00:00.000Z" })).resolves.toEqual(transaction);
    await expect(repository.softDelete({ userId: "user-123" }, "transaction-1", { deletedAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" })).resolves.toEqual(transaction);

    expect(collectionMock).toHaveBeenCalledWith("transactions", { userId: "user-123" });
    expect(requestMock).toHaveBeenNthCalledWith(1, {
      method: "GET",
      path: "records/transaction-1",
      searchParams: { includeDeleted: "false" }
    });
    expect(requestMock).toHaveBeenNthCalledWith(2, {
      method: "PATCH",
      path: "records/transaction-1",
      searchParams: { includeDeleted: "false" },
      body: { description: "Updated", updatedAt: "2026-02-01T00:00:00.000Z" }
    });
    expect(requestMock).toHaveBeenNthCalledWith(3, {
      method: "PATCH",
      path: "records/transaction-1",
      searchParams: { includeDeleted: "false" },
      body: { deletedAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" }
    });
  });
});
