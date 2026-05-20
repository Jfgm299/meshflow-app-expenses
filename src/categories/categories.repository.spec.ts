import { CoreStorageClient, type CoreStorageRequestOptions, type ScopedStorageCollection } from "../core/core-storage.client";
import { CategoriesRepository } from "./categories.repository";
import type { CategoryRecord } from "./categories.types";

const category: CategoryRecord = {
  id: "category-1",
  userId: "user-123",
  name: "Salary",
  type: "income",
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

describe("CategoriesRepository", () => {
  it("lists categories through a caller-scoped Core Storage collection and excludes deleted records", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock([category]);
    const repository = new CategoriesRepository(storageClient);

    await expect(repository.list({ userId: "user-123" })).resolves.toEqual([category]);

    expect(collectionMock).toHaveBeenCalledWith("categories", { userId: "user-123" });
    expect(requestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "records",
      searchParams: {
        includeDeleted: "false",
        type: undefined
      }
    });
  });

  it("passes the optional category type filter to Core Storage", async () => {
    const { storageClient, requestMock } = createStorageClientMock([category]);
    const repository = new CategoriesRepository(storageClient);

    await expect(repository.list({ userId: "user-123" }, "income")).resolves.toEqual([category]);

    expect(requestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "records",
      searchParams: {
        includeDeleted: "false",
        type: "income"
      }
    });
  });

  it("reads categories through a caller-scoped Core Storage collection", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock(category);
    const repository = new CategoriesRepository(storageClient);

    await expect(repository.read({ userId: "user-123" }, "category-1")).resolves.toEqual(category);

    expect(collectionMock).toHaveBeenCalledWith("categories", { userId: "user-123" });
    expect(requestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "records/category-1",
      searchParams: {
        includeDeleted: "false"
      }
    });
  });

  it("updates categories through a caller-scoped Core Storage collection", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock(category);
    const repository = new CategoriesRepository(storageClient);

    await expect(repository.update({ userId: "user-123" }, "category-1", { name: "Updated category", updatedAt: "2026-02-01T00:00:00.000Z" })).resolves.toEqual(category);

    expect(collectionMock).toHaveBeenCalledWith("categories", { userId: "user-123" });
    expect(requestMock).toHaveBeenCalledWith({
      method: "PATCH",
      path: "records/category-1",
      searchParams: {
        includeDeleted: "false"
      },
      body: {
        name: "Updated category",
        updatedAt: "2026-02-01T00:00:00.000Z"
      }
    });
  });

  it("soft deletes categories through a caller-scoped Core Storage collection", async () => {
    const { storageClient, requestMock, collectionMock } = createStorageClientMock(category);
    const repository = new CategoriesRepository(storageClient);

    await expect(
      repository.softDelete({ userId: "user-123" }, "category-1", {
        deletedAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z"
      })
    ).resolves.toEqual(category);

    expect(collectionMock).toHaveBeenCalledWith("categories", { userId: "user-123" });
    expect(requestMock).toHaveBeenCalledWith({
      method: "PATCH",
      path: "records/category-1",
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
