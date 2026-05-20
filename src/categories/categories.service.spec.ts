import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CategoriesRepository } from "./categories.repository";
import { CategoriesService } from "./categories.service";
import type { CategoryRecord } from "./categories.types";

const activeCategory = (overrides: Partial<CategoryRecord> = {}): CategoryRecord => ({
  id: "category-1",
  userId: "user-123",
  name: "Salary",
  type: "income",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const createRepositoryMock = (): jest.Mocked<Pick<CategoriesRepository, "list" | "create" | "read" | "update" | "softDelete">> => ({
  list: jest.fn(),
  create: jest.fn(),
  read: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn()
});

describe("CategoriesService", () => {
  it("creates categories with income type", async () => {
    const repository = createRepositoryMock();
    const createdCategory = activeCategory({ type: "income" });
    repository.create.mockResolvedValue(createdCategory);
    const service = new CategoriesService(repository as unknown as CategoriesRepository);

    await expect(service.create({ userId: "user-123" }, { name: "Salary", type: "income" })).resolves.toEqual(createdCategory);

    expect(repository.create).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.objectContaining({
        userId: "user-123",
        name: "Salary",
        type: "income"
      })
    );
  });

  it("creates categories with expense type", async () => {
    const repository = createRepositoryMock();
    const createdCategory = activeCategory({ name: "Groceries", type: "expense" });
    repository.create.mockResolvedValue(createdCategory);
    const service = new CategoriesService(repository as unknown as CategoriesRepository);

    await expect(service.create({ userId: "user-123" }, { name: "Groceries", type: "expense" })).resolves.toEqual(createdCategory);

    expect(repository.create).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.objectContaining({
        name: "Groceries",
        type: "expense"
      })
    );
  });

  it("rejects both as a category type", async () => {
    const repository = createRepositoryMock();
    const service = new CategoriesService(repository as unknown as CategoriesRepository);

    await expect(service.create({ userId: "user-123" }, { name: "Mixed", type: "both" })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects unknown category types", async () => {
    const repository = createRepositoryMock();
    const service = new CategoriesService(repository as unknown as CategoriesRepository);

    await expect(service.create({ userId: "user-123" }, { name: "Unknown", type: "other" })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("lists only caller-owned active categories", async () => {
    const repository = createRepositoryMock();
    const callerCategory = activeCategory({ id: "category-1" });
    const softDeletedCategory = activeCategory({ id: "category-2", deletedAt: "2026-02-01T00:00:00.000Z" });
    const otherUserCategory = activeCategory({ id: "category-3", userId: "other-user" });
    repository.list.mockResolvedValue([callerCategory, softDeletedCategory, otherUserCategory]);
    const service = new CategoriesService(repository as unknown as CategoriesRepository);

    await expect(service.list({ userId: "user-123" })).resolves.toEqual([callerCategory]);
    expect(repository.list).toHaveBeenCalledWith({ userId: "user-123" }, undefined);
  });

  it("validates and applies the optional type filter", async () => {
    const repository = createRepositoryMock();
    const incomeCategory = activeCategory({ id: "category-1", type: "income" });
    const expenseCategory = activeCategory({ id: "category-2", type: "expense" });
    repository.list.mockResolvedValue([incomeCategory, expenseCategory]);
    const service = new CategoriesService(repository as unknown as CategoriesRepository);

    await expect(service.list({ userId: "user-123" }, { type: "expense" })).resolves.toEqual([expenseCategory]);
    expect(repository.list).toHaveBeenCalledWith({ userId: "user-123" }, "expense");
  });

  it("rejects invalid optional type filters", async () => {
    const repository = createRepositoryMock();
    const service = new CategoriesService(repository as unknown as CategoriesRepository);

    await expect(service.list({ userId: "user-123" }, { type: "both" })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.list).not.toHaveBeenCalled();
  });

  it("rejects reads for soft-deleted or non-owned records", async () => {
    const repository = createRepositoryMock();
    repository.read.mockResolvedValue(activeCategory({ userId: "other-user" }));
    const service = new CategoriesService(repository as unknown as CategoriesRepository);

    await expect(service.read({ userId: "user-123" }, "category-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.read).toHaveBeenCalledWith({ userId: "user-123" }, "category-1");
  });

  it("updates only after reading the caller-owned active category", async () => {
    const repository = createRepositoryMock();
    const updatedCategory = activeCategory({ name: "Updated category", type: "expense" });
    repository.read.mockResolvedValue(activeCategory());
    repository.update.mockResolvedValue(updatedCategory);
    const service = new CategoriesService(repository as unknown as CategoriesRepository);

    await expect(service.update({ userId: "user-123" }, "category-1", { name: "Updated category", type: "expense" })).resolves.toEqual(updatedCategory);

    expect(repository.read).toHaveBeenCalledWith({ userId: "user-123" }, "category-1");
    expect(repository.update).toHaveBeenCalledWith(
      { userId: "user-123" },
      "category-1",
      expect.objectContaining({
        name: "Updated category",
        type: "expense",
        updatedAt: expect.any(String) as string
      })
    );
  });

  it("rejects updates with invalid category types", async () => {
    const repository = createRepositoryMock();
    repository.read.mockResolvedValue(activeCategory());
    const service = new CategoriesService(repository as unknown as CategoriesRepository);

    await expect(service.update({ userId: "user-123" }, "category-1", { type: "both" })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("soft deletes categories instead of hard deleting them", async () => {
    const repository = createRepositoryMock();
    const deletedCategory = activeCategory({ deletedAt: "2026-02-01T00:00:00.000Z" });
    repository.read.mockResolvedValue(activeCategory());
    repository.softDelete.mockResolvedValue(deletedCategory);
    const service = new CategoriesService(repository as unknown as CategoriesRepository);

    await expect(service.softDelete({ userId: "user-123" }, "category-1")).resolves.toEqual(deletedCategory);

    expect(repository.read).toHaveBeenCalledWith({ userId: "user-123" }, "category-1");
    expect(repository.softDelete).toHaveBeenCalledWith(
      { userId: "user-123" },
      "category-1",
      expect.objectContaining({
        deletedAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string
      })
    );
  });
});
