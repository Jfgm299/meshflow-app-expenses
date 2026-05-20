import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TransactionsRepository } from "./transactions.repository";
import { TransactionsService } from "./transactions.service";
import type { TransactionRecord } from "./transactions.types";

const activeTransaction = (overrides: Partial<TransactionRecord> = {}): TransactionRecord => ({
  id: "transaction-1",
  userId: "user-123",
  type: "income",
  amount: 1250.5,
  currency: "EUR",
  accountId: "account-1",
  categoryId: "category-1",
  date: "2026-01-10T00:00:00.000Z",
  description: "Salary",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const createRepositoryMock = (): jest.Mocked<Pick<TransactionsRepository, "list" | "create" | "read" | "update" | "softDelete">> => ({
  list: jest.fn(),
  create: jest.fn(),
  read: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn()
});

describe("TransactionsService", () => {
  it("creates income transactions with required currency", async () => {
    const repository = createRepositoryMock();
    const createdTransaction = activeTransaction({ type: "income", currency: "EUR" });
    repository.create.mockResolvedValue(createdTransaction);
    const service = new TransactionsService(repository as unknown as TransactionsRepository);

    await expect(
      service.create({ userId: "user-123" }, { type: "income", amount: 1250.5, currency: "EUR", accountId: "account-1", date: "2026-01-10T00:00:00.000Z" })
    ).resolves.toEqual(createdTransaction);

    expect(repository.create).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.objectContaining({
        userId: "user-123",
        type: "income",
        amount: 1250.5,
        currency: "EUR",
        accountId: "account-1",
        date: "2026-01-10T00:00:00.000Z"
      })
    );
  });

  it("creates expense transactions", async () => {
    const repository = createRepositoryMock();
    const createdTransaction = activeTransaction({ type: "expense", amount: 42, description: "Groceries" });
    repository.create.mockResolvedValue(createdTransaction);
    const service = new TransactionsService(repository as unknown as TransactionsRepository);

    await expect(
      service.create({ userId: "user-123" }, { type: "expense", amount: 42, currency: "EUR", accountId: "account-1", categoryId: "category-1", date: "2026-01-11" })
    ).resolves.toEqual(createdTransaction);

    expect(repository.create).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.objectContaining({
        type: "expense",
        amount: 42,
        currency: "EUR",
        categoryId: "category-1"
      })
    );
  });

  it("rejects invalid transaction types", async () => {
    const repository = createRepositoryMock();
    const service = new TransactionsService(repository as unknown as TransactionsRepository);

    await expect(service.create({ userId: "user-123" }, { type: "both", amount: 1, currency: "EUR", accountId: "account-1", date: "2026-01-10" })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects missing or invalid currency", async () => {
    const repository = createRepositoryMock();
    const service = new TransactionsService(repository as unknown as TransactionsRepository);

    await expect(service.create({ userId: "user-123" }, { type: "income", amount: 1, accountId: "account-1", date: "2026-01-10" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ userId: "user-123" }, { type: "income", amount: 1, currency: "eur", accountId: "account-1", date: "2026-01-10" })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("lists caller-owned transactions and excludes soft-deleted records by default", async () => {
    const repository = createRepositoryMock();
    const callerTransaction = activeTransaction({ id: "transaction-1" });
    const softDeletedTransaction = activeTransaction({ id: "transaction-2", deletedAt: "2026-02-01T00:00:00.000Z" });
    const otherUserTransaction = activeTransaction({ id: "transaction-3", userId: "other-user" });
    repository.list.mockResolvedValue([callerTransaction, softDeletedTransaction, otherUserTransaction]);
    const service = new TransactionsService(repository as unknown as TransactionsRepository);

    await expect(service.list({ userId: "user-123" })).resolves.toEqual([callerTransaction]);
    expect(repository.list).toHaveBeenCalledWith({ userId: "user-123" }, expect.objectContaining({ includeDeleted: false }));
  });

  it("filters transactions by date, account, category, and type", async () => {
    const repository = createRepositoryMock();
    const matchingTransaction = activeTransaction({ id: "transaction-1", type: "expense", accountId: "account-2", categoryId: "category-2", date: "2026-02-15T00:00:00.000Z" });
    const beforeRange = activeTransaction({ id: "transaction-2", type: "expense", accountId: "account-2", categoryId: "category-2", date: "2026-01-31T00:00:00.000Z" });
    const wrongAccount = activeTransaction({ id: "transaction-3", type: "expense", accountId: "account-3", categoryId: "category-2", date: "2026-02-15T00:00:00.000Z" });
    repository.list.mockResolvedValue([matchingTransaction, beforeRange, wrongAccount]);
    const service = new TransactionsService(repository as unknown as TransactionsRepository);

    await expect(
      service.list({ userId: "user-123" }, { from: "2026-02-01", to: "2026-02-28", accountId: "account-2", categoryId: "category-2", type: "expense" })
    ).resolves.toEqual([matchingTransaction]);

    expect(repository.list).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.objectContaining({
        from: "2026-02-01",
        to: "2026-02-28",
        accountId: "account-2",
        categoryId: "category-2",
        type: "expense",
        includeDeleted: false
      })
    );
  });

  it("enforces user scoping when reading, updating, and deleting", async () => {
    const repository = createRepositoryMock();
    repository.read.mockResolvedValue(activeTransaction({ userId: "other-user" }));
    const service = new TransactionsService(repository as unknown as TransactionsRepository);

    await expect(service.read({ userId: "user-123" }, "transaction-1")).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update({ userId: "user-123" }, "transaction-1", { description: "Updated" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.softDelete({ userId: "user-123" }, "transaction-1")).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.read).toHaveBeenCalledWith({ userId: "user-123" }, "transaction-1");
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it("soft deletes transactions instead of hard deleting them", async () => {
    const repository = createRepositoryMock();
    const deletedTransaction = activeTransaction({ deletedAt: "2026-02-01T00:00:00.000Z" });
    repository.read.mockResolvedValue(activeTransaction());
    repository.softDelete.mockResolvedValue(deletedTransaction);
    const service = new TransactionsService(repository as unknown as TransactionsRepository);

    await expect(service.softDelete({ userId: "user-123" }, "transaction-1")).resolves.toEqual(deletedTransaction);

    expect(repository.softDelete).toHaveBeenCalledWith(
      { userId: "user-123" },
      "transaction-1",
      expect.objectContaining({
        deletedAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string
      })
    );
  });
});
