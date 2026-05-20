import { BadRequestException, NotFoundException } from "@nestjs/common";
import { RecurringTransactionsRepository } from "./recurring-transactions.repository";
import { RecurringTransactionsService } from "./recurring-transactions.service";
import type { RecurringTransactionRecord } from "./recurring-transactions.types";

const activeDefinition = (overrides: Partial<RecurringTransactionRecord> = {}): RecurringTransactionRecord => ({
  id: "recurring-1",
  userId: "user-123",
  type: "income",
  amount: 1250.5,
  currency: "EUR",
  accountId: "account-1",
  categoryId: "category-1",
  name: "Salary",
  frequency: "monthly",
  interval: 1,
  startDate: "2026-01-01T00:00:00.000Z",
  nextRunDate: "2026-02-01T00:00:00.000Z",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const createRepositoryMock = (): jest.Mocked<Pick<RecurringTransactionsRepository, "list" | "create" | "read" | "update" | "softDelete">> => ({
  list: jest.fn(),
  create: jest.fn(),
  read: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn()
});

describe("RecurringTransactionsService", () => {
  it("creates recurring income definitions", async () => {
    const repository = createRepositoryMock();
    const createdDefinition = activeDefinition({ type: "income", name: "Monthly salary" });
    repository.create.mockResolvedValue(createdDefinition);
    const service = new RecurringTransactionsService(repository as unknown as RecurringTransactionsRepository);

    await expect(
      service.create(
        { userId: "user-123" },
        {
          type: "income",
          amount: 1250.5,
          currency: "EUR",
          accountId: "account-1",
          name: "Monthly salary",
          frequency: "monthly",
          startDate: "2026-01-01T00:00:00.000Z"
        }
      )
    ).resolves.toEqual(createdDefinition);

    expect(repository.create).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.objectContaining({
        userId: "user-123",
        type: "income",
        amount: 1250.5,
        currency: "EUR",
        accountId: "account-1",
        name: "Monthly salary",
        frequency: "monthly",
        interval: 1,
        nextRunDate: "2026-02-01T00:00:00.000Z",
        status: "active"
      })
    );
  });

  it("creates recurring expense definitions", async () => {
    const repository = createRepositoryMock();
    const createdDefinition = activeDefinition({ type: "expense", amount: 12.99, name: "Streaming subscription", frequency: "monthly" });
    repository.create.mockResolvedValue(createdDefinition);
    const service = new RecurringTransactionsService(repository as unknown as RecurringTransactionsRepository);

    await expect(
      service.create(
        { userId: "user-123" },
        {
          type: "expense",
          amount: 12.99,
          currency: "USD",
          accountId: "account-1",
          categoryId: "category-1",
          name: "Streaming subscription",
          frequency: "monthly",
          interval: 1,
          startDate: "2026-01-15T00:00:00.000Z"
        }
      )
    ).resolves.toEqual(createdDefinition);

    expect(repository.create).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.objectContaining({
        type: "expense",
        amount: 12.99,
        currency: "USD",
        categoryId: "category-1",
        nextRunDate: "2026-02-15T00:00:00.000Z"
      })
    );
  });

  it("rejects invalid transaction type", async () => {
    const repository = createRepositoryMock();
    const service = new RecurringTransactionsService(repository as unknown as RecurringTransactionsRepository);

    await expect(
      service.create({ userId: "user-123" }, { type: "both", amount: 1, currency: "EUR", accountId: "account-1", name: "Bad", frequency: "monthly", startDate: "2026-01-01" })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects invalid frequency, status, and currency", async () => {
    const repository = createRepositoryMock();
    const service = new RecurringTransactionsService(repository as unknown as RecurringTransactionsRepository);
    const baseDto = { type: "income", amount: 1, currency: "EUR", accountId: "account-1", name: "Base", frequency: "monthly", startDate: "2026-01-01" };

    await expect(service.create({ userId: "user-123" }, { ...baseDto, frequency: "yearly" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ userId: "user-123" }, { ...baseDto, status: "archived" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ userId: "user-123" }, { ...baseDto, currency: "eur" })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("calculates nextRunDate from startDate, frequency, and interval", async () => {
    const repository = createRepositoryMock();
    repository.create.mockResolvedValue(activeDefinition({ frequency: "weekly", interval: 2, nextRunDate: "2026-01-15T00:00:00.000Z" }));
    const service = new RecurringTransactionsService(repository as unknown as RecurringTransactionsRepository);

    await service.create({ userId: "user-123" }, { type: "income", amount: 1, currency: "EUR", accountId: "account-1", name: "Biweekly", frequency: "weekly", interval: 2, startDate: "2026-01-01T00:00:00.000Z" });

    expect(repository.create).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.objectContaining({
        nextRunDate: "2026-01-15T00:00:00.000Z"
      })
    );
  });

  it("lists definitions scoped to user and excludes soft-deleted records", async () => {
    const repository = createRepositoryMock();
    const callerDefinition = activeDefinition({ id: "recurring-1" });
    const deletedDefinition = activeDefinition({ id: "recurring-2", deletedAt: "2026-02-01T00:00:00.000Z" });
    const otherUserDefinition = activeDefinition({ id: "recurring-3", userId: "other-user" });
    repository.list.mockResolvedValue([callerDefinition, deletedDefinition, otherUserDefinition]);
    const service = new RecurringTransactionsService(repository as unknown as RecurringTransactionsRepository);

    await expect(service.list({ userId: "user-123" })).resolves.toEqual([callerDefinition]);
    expect(repository.list).toHaveBeenCalledWith({ userId: "user-123" }, {});
  });

  it("enforces user scoping when reading, updating, and deleting", async () => {
    const repository = createRepositoryMock();
    repository.read.mockResolvedValue(activeDefinition({ userId: "other-user" }));
    const service = new RecurringTransactionsService(repository as unknown as RecurringTransactionsRepository);

    await expect(service.read({ userId: "user-123" }, "recurring-1")).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update({ userId: "user-123" }, "recurring-1", { name: "Updated" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.softDelete({ userId: "user-123" }, "recurring-1")).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.read).toHaveBeenCalledWith({ userId: "user-123" }, "recurring-1");
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it("cancels definitions by setting status cancelled and updatedAt", async () => {
    const repository = createRepositoryMock();
    const cancelledDefinition = activeDefinition({ status: "cancelled" });
    repository.read.mockResolvedValue(activeDefinition());
    repository.update.mockResolvedValue(cancelledDefinition);
    const service = new RecurringTransactionsService(repository as unknown as RecurringTransactionsRepository);

    await expect(service.update({ userId: "user-123" }, "recurring-1", { status: "cancelled" })).resolves.toEqual(cancelledDefinition);

    expect(repository.update).toHaveBeenCalledWith(
      { userId: "user-123" },
      "recurring-1",
      expect.objectContaining({
        status: "cancelled",
        updatedAt: expect.any(String) as string
      })
    );
  });

  it("soft deletes definitions instead of hard deleting them", async () => {
    const repository = createRepositoryMock();
    const deletedDefinition = activeDefinition({ deletedAt: "2026-02-01T00:00:00.000Z" });
    repository.read.mockResolvedValue(activeDefinition());
    repository.softDelete.mockResolvedValue(deletedDefinition);
    const service = new RecurringTransactionsService(repository as unknown as RecurringTransactionsRepository);

    await expect(service.softDelete({ userId: "user-123" }, "recurring-1")).resolves.toEqual(deletedDefinition);

    expect(repository.softDelete).toHaveBeenCalledWith(
      { userId: "user-123" },
      "recurring-1",
      expect.objectContaining({
        deletedAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string
      })
    );
  });
});
