import { GUARDS_METADATA } from "@nestjs/common/constants";
import { AccountsController } from "./accounts/accounts.controller";
import { AccountsRepository } from "./accounts/accounts.repository";
import { AnalyticsController } from "./analytics/analytics.controller";
import { CategoriesController } from "./categories/categories.controller";
import { CategoriesRepository } from "./categories/categories.repository";
import { CoreStorageClient, type CoreStorageRequestOptions, type ScopedStorageCollection } from "./core/core-storage.client";
import { TrustedUserGuard } from "./core/trusted-user.guard";
import { InternalJobsController } from "./internal-jobs/internal-jobs.controller";
import { RecurringTransactionsController } from "./recurring-transactions/recurring-transactions.controller";
import { RecurringTransactionsRepository } from "./recurring-transactions/recurring-transactions.repository";
import { ScheduledTransactionsController } from "./scheduled-transactions/scheduled-transactions.controller";
import { ScheduledTransactionsRepository } from "./scheduled-transactions/scheduled-transactions.repository";
import { TransactionsController } from "./transactions/transactions.controller";
import { TransactionsRepository } from "./transactions/transactions.repository";

const PROTECTED_CONTROLLERS = {
  ACCOUNTS: AccountsController,
  CATEGORIES: CategoriesController,
  TRANSACTIONS: TransactionsController,
  RECURRING_TRANSACTIONS: RecurringTransactionsController,
  SCHEDULED_TRANSACTIONS: ScheduledTransactionsController,
  INTERNAL_JOBS: InternalJobsController,
  ANALYTICS: AnalyticsController
} as const;

const USER_CONTEXT = { userId: "user-123" } as const;

interface StorageClientMock {
  storageClient: CoreStorageClient;
  requestMock: jest.Mock<Promise<unknown>, [CoreStorageRequestOptions]>;
  collectionMock: jest.Mock<ScopedStorageCollection, Parameters<CoreStorageClient["collection"]>>;
}

const createStorageClientMock = (): StorageClientMock => {
  const requestMock = jest.fn<Promise<unknown>, [CoreStorageRequestOptions]>().mockResolvedValue({});
  const scopedStorageCollection: ScopedStorageCollection = {
    request: <TResult>(options: CoreStorageRequestOptions): Promise<TResult> => requestMock(options) as Promise<TResult>
  };
  const collectionMock = jest.fn<ScopedStorageCollection, Parameters<CoreStorageClient["collection"]>>().mockReturnValue(scopedStorageCollection);
  const storageClient = {
    collection: collectionMock
  } as unknown as CoreStorageClient;

  return { storageClient, requestMock, collectionMock };
};

const expectEveryRequestToExcludeDeleted = (requestMock: StorageClientMock["requestMock"]): void => {
  for (const [options] of requestMock.mock.calls) {
    expect(options.searchParams).toEqual(expect.objectContaining({ includeDeleted: "false" }));
  }
};

describe("Finance V1 security hardening", () => {
  it("keeps every protected controller behind the trusted Core user guard", () => {
    for (const controller of Object.values(PROTECTED_CONTROLLERS)) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[] | undefined;
      expect(guards).toEqual(expect.arrayContaining([TrustedUserGuard]));
    }
  });

  it("uses caller-scoped Core Storage collections and excludes soft-deleted accounts", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock();
    const repository = new AccountsRepository(storageClient);

    await repository.list(USER_CONTEXT);
    await repository.read(USER_CONTEXT, "account-1");
    await repository.update(USER_CONTEXT, "account-1", { updatedAt: "2026-02-01T00:00:00.000Z" });
    await repository.softDelete(USER_CONTEXT, "account-1", { deletedAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" });

    expect(collectionMock).toHaveBeenCalledTimes(4);
    expect(collectionMock).toHaveBeenCalledWith("accounts", USER_CONTEXT);
    expectEveryRequestToExcludeDeleted(requestMock);
  });

  it("uses caller-scoped Core Storage collections and excludes soft-deleted categories", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock();
    const repository = new CategoriesRepository(storageClient);

    await repository.list(USER_CONTEXT);
    await repository.read(USER_CONTEXT, "category-1");
    await repository.update(USER_CONTEXT, "category-1", { updatedAt: "2026-02-01T00:00:00.000Z" });
    await repository.softDelete(USER_CONTEXT, "category-1", { deletedAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" });

    expect(collectionMock).toHaveBeenCalledTimes(4);
    expect(collectionMock).toHaveBeenCalledWith("categories", USER_CONTEXT);
    expectEveryRequestToExcludeDeleted(requestMock);
  });

  it("uses caller-scoped Core Storage collections and excludes soft-deleted transactions by default", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock();
    const repository = new TransactionsRepository(storageClient);

    await repository.list(USER_CONTEXT, { includeDeleted: false });
    await repository.read(USER_CONTEXT, "transaction-1");
    await repository.update(USER_CONTEXT, "transaction-1", { updatedAt: "2026-02-01T00:00:00.000Z" });
    await repository.softDelete(USER_CONTEXT, "transaction-1", { deletedAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" });

    expect(collectionMock).toHaveBeenCalledTimes(4);
    expect(collectionMock).toHaveBeenCalledWith("transactions", USER_CONTEXT);
    expectEveryRequestToExcludeDeleted(requestMock);
  });

  it("uses caller-scoped Core Storage collections and excludes soft-deleted recurring transactions", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock();
    const repository = new RecurringTransactionsRepository(storageClient);

    await repository.list(USER_CONTEXT, {});
    await repository.read(USER_CONTEXT, "recurring-1");
    await repository.update(USER_CONTEXT, "recurring-1", { updatedAt: "2026-02-01T00:00:00.000Z" });
    await repository.softDelete(USER_CONTEXT, "recurring-1", { deletedAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" });

    expect(collectionMock).toHaveBeenCalledTimes(4);
    expect(collectionMock).toHaveBeenCalledWith("recurring-transactions", USER_CONTEXT);
    expectEveryRequestToExcludeDeleted(requestMock);
  });

  it("uses caller-scoped Core Storage collections and excludes soft-deleted scheduled transactions", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock();
    const repository = new ScheduledTransactionsRepository(storageClient);

    await repository.list(USER_CONTEXT, {});
    await repository.read(USER_CONTEXT, "scheduled-1");
    await repository.update(USER_CONTEXT, "scheduled-1", { updatedAt: "2026-02-01T00:00:00.000Z" });
    await repository.softDelete(USER_CONTEXT, "scheduled-1", { deletedAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" });

    expect(collectionMock).toHaveBeenCalledTimes(4);
    expect(collectionMock).toHaveBeenCalledWith("scheduled-transactions", USER_CONTEXT);
    expectEveryRequestToExcludeDeleted(requestMock);
  });
});
