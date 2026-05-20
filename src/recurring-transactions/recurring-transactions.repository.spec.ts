import { CoreStorageClient, type CoreStorageRequestOptions, type ScopedStorageCollection } from "../core/core-storage.client";
import { RecurringTransactionsRepository } from "./recurring-transactions.repository";
import type { RecurringTransactionRecord } from "./recurring-transactions.types";

const definition: RecurringTransactionRecord = {
  id: "recurring-1",
  userId: "user-123",
  type: "income",
  amount: 1250.5,
  currency: "EUR",
  accountId: "account-1",
  name: "Salary",
  frequency: "monthly",
  interval: 1,
  startDate: "2026-01-01T00:00:00.000Z",
  nextRunDate: "2026-02-01T00:00:00.000Z",
  status: "active",
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

describe("RecurringTransactionsRepository", () => {
  it("lists definitions through a caller-scoped Core Storage collection with filters", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock([definition]);
    const repository = new RecurringTransactionsRepository(storageClient);

    await expect(repository.list({ userId: "user-123" }, { type: "income", status: "active" })).resolves.toEqual([definition]);

    expect(collectionMock).toHaveBeenCalledWith("recurring-transactions", { userId: "user-123" });
    expect(requestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "records",
      searchParams: {
        includeDeleted: "false",
        type: "income",
        status: "active"
      }
    });
  });

  it("creates, reads, updates, and soft deletes definitions through caller-scoped Core Storage", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock(definition);
    const repository = new RecurringTransactionsRepository(storageClient);

    await expect(repository.create({ userId: "user-123" }, { ...definition })).resolves.toEqual(definition);
    await expect(repository.read({ userId: "user-123" }, "recurring-1")).resolves.toEqual(definition);
    await expect(repository.update({ userId: "user-123" }, "recurring-1", { status: "cancelled", updatedAt: "2026-02-01T00:00:00.000Z" })).resolves.toEqual(definition);
    await expect(repository.softDelete({ userId: "user-123" }, "recurring-1", { deletedAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" })).resolves.toEqual(definition);

    expect(collectionMock).toHaveBeenCalledWith("recurring-transactions", { userId: "user-123" });
    expect(requestMock).toHaveBeenNthCalledWith(1, {
      method: "POST",
      path: "records",
      body: definition
    });
    expect(requestMock).toHaveBeenNthCalledWith(2, {
      method: "GET",
      path: "records/recurring-1",
      searchParams: { includeDeleted: "false" }
    });
    expect(requestMock).toHaveBeenNthCalledWith(3, {
      method: "PATCH",
      path: "records/recurring-1",
      searchParams: { includeDeleted: "false" },
      body: { status: "cancelled", updatedAt: "2026-02-01T00:00:00.000Z" }
    });
    expect(requestMock).toHaveBeenNthCalledWith(4, {
      method: "PATCH",
      path: "records/recurring-1",
      searchParams: { includeDeleted: "false" },
      body: { deletedAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" }
    });
  });
});
