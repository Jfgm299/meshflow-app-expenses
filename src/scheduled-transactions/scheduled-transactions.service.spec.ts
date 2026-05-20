import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ScheduledTransactionsRepository } from "./scheduled-transactions.repository";
import { ScheduledTransactionsService } from "./scheduled-transactions.service";
import type { ScheduledTransactionRecord } from "./scheduled-transactions.types";

const activeDefinition = (overrides: Partial<ScheduledTransactionRecord> = {}): ScheduledTransactionRecord => ({
  id: "scheduled-1",
  userId: "user-123",
  type: "income",
  amount: 1250.5,
  currency: "EUR",
  accountId: "account-1",
  categoryId: "category-1",
  description: "Future salary",
  scheduledDate: "2026-06-01T00:00:00.000Z",
  status: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const createRepositoryMock = (): jest.Mocked<Pick<ScheduledTransactionsRepository, "list" | "create" | "read" | "update" | "softDelete">> => ({
  list: jest.fn(),
  create: jest.fn(),
  read: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn()
});

describe("ScheduledTransactionsService", () => {
  it("creates scheduled income definitions", async () => {
    const repository = createRepositoryMock();
    const createdDefinition = activeDefinition({ type: "income" });
    repository.create.mockResolvedValue(createdDefinition);
    const service = new ScheduledTransactionsService(repository as unknown as ScheduledTransactionsRepository);

    await expect(
      service.create({ userId: "user-123" }, { type: "income", amount: 1250.5, currency: "EUR", accountId: "account-1", scheduledDate: "2026-06-01T00:00:00.000Z" })
    ).resolves.toEqual(createdDefinition);

    expect(repository.create).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.objectContaining({ userId: "user-123", type: "income", amount: 1250.5, currency: "EUR", accountId: "account-1", scheduledDate: "2026-06-01T00:00:00.000Z", status: "pending" })
    );
  });

  it("creates scheduled expense definitions", async () => {
    const repository = createRepositoryMock();
    const createdDefinition = activeDefinition({ type: "expense", amount: 12.99, currency: "USD" });
    repository.create.mockResolvedValue(createdDefinition);
    const service = new ScheduledTransactionsService(repository as unknown as ScheduledTransactionsRepository);

    await expect(
      service.create({ userId: "user-123" }, { type: "expense", amount: 12.99, currency: "USD", accountId: "account-1", categoryId: "category-1", description: "Insurance", scheduledDate: "2026-06-15" })
    ).resolves.toEqual(createdDefinition);

    expect(repository.create).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.objectContaining({ type: "expense", amount: 12.99, currency: "USD", categoryId: "category-1", description: "Insurance", scheduledDate: "2026-06-15" })
    );
  });

  it("rejects invalid transaction type, status, currency, and date", async () => {
    const repository = createRepositoryMock();
    const service = new ScheduledTransactionsService(repository as unknown as ScheduledTransactionsRepository);
    const baseDto = { type: "income", amount: 1, currency: "EUR", accountId: "account-1", scheduledDate: "2026-06-01" };

    await expect(service.create({ userId: "user-123" }, { ...baseDto, type: "both" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ userId: "user-123" }, { ...baseDto, status: "active" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ userId: "user-123" }, { ...baseDto, currency: "eur" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ userId: "user-123" }, { ...baseDto, scheduledDate: "not-a-date" })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("lists definitions scoped to user and excludes soft-deleted records", async () => {
    const repository = createRepositoryMock();
    const callerDefinition = activeDefinition({ id: "scheduled-1" });
    const deletedDefinition = activeDefinition({ id: "scheduled-2", deletedAt: "2026-02-01T00:00:00.000Z" });
    const otherUserDefinition = activeDefinition({ id: "scheduled-3", userId: "other-user" });
    repository.list.mockResolvedValue([callerDefinition, deletedDefinition, otherUserDefinition]);
    const service = new ScheduledTransactionsService(repository as unknown as ScheduledTransactionsRepository);

    await expect(service.list({ userId: "user-123" })).resolves.toEqual([callerDefinition]);
    expect(repository.list).toHaveBeenCalledWith({ userId: "user-123" }, {});
  });

  it("filters definitions by type, status, and scheduled date range", async () => {
    const repository = createRepositoryMock();
    const matchingDefinition = activeDefinition({ id: "scheduled-1", type: "expense", status: "cancelled", scheduledDate: "2026-06-15T00:00:00.000Z" });
    const wrongType = activeDefinition({ id: "scheduled-2", type: "income", status: "cancelled", scheduledDate: "2026-06-15T00:00:00.000Z" });
    const beforeRange = activeDefinition({ id: "scheduled-3", type: "expense", status: "cancelled", scheduledDate: "2026-05-31T00:00:00.000Z" });
    const afterRange = activeDefinition({ id: "scheduled-4", type: "expense", status: "cancelled", scheduledDate: "2026-07-01T00:00:00.000Z" });
    repository.list.mockResolvedValue([matchingDefinition, wrongType, beforeRange, afterRange]);
    const service = new ScheduledTransactionsService(repository as unknown as ScheduledTransactionsRepository);

    await expect(service.list({ userId: "user-123" }, { type: "expense", status: "cancelled", from: "2026-06-01", to: "2026-06-30" })).resolves.toEqual([matchingDefinition]);
  });

  it("enforces user scoping when reading, updating, and deleting", async () => {
    const repository = createRepositoryMock();
    repository.read.mockResolvedValue(activeDefinition({ userId: "other-user" }));
    const service = new ScheduledTransactionsService(repository as unknown as ScheduledTransactionsRepository);

    await expect(service.read({ userId: "user-123" }, "scheduled-1")).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update({ userId: "user-123" }, "scheduled-1", { status: "cancelled" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.softDelete({ userId: "user-123" }, "scheduled-1")).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.read).toHaveBeenCalledWith({ userId: "user-123" }, "scheduled-1");
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it("cancels definitions by setting status cancelled and updatedAt", async () => {
    const repository = createRepositoryMock();
    const cancelledDefinition = activeDefinition({ status: "cancelled" });
    repository.read.mockResolvedValue(activeDefinition());
    repository.update.mockResolvedValue(cancelledDefinition);
    const service = new ScheduledTransactionsService(repository as unknown as ScheduledTransactionsRepository);

    await expect(service.update({ userId: "user-123" }, "scheduled-1", { status: "cancelled" })).resolves.toEqual(cancelledDefinition);

    expect(repository.update).toHaveBeenCalledWith({ userId: "user-123" }, "scheduled-1", expect.objectContaining({ status: "cancelled", updatedAt: expect.any(String) as string }));
  });

  it("soft deletes definitions instead of hard deleting them", async () => {
    const repository = createRepositoryMock();
    const deletedDefinition = activeDefinition({ deletedAt: "2026-02-01T00:00:00.000Z" });
    repository.read.mockResolvedValue(activeDefinition());
    repository.softDelete.mockResolvedValue(deletedDefinition);
    const service = new ScheduledTransactionsService(repository as unknown as ScheduledTransactionsRepository);

    await expect(service.softDelete({ userId: "user-123" }, "scheduled-1")).resolves.toEqual(deletedDefinition);

    expect(repository.softDelete).toHaveBeenCalledWith({ userId: "user-123" }, "scheduled-1", expect.objectContaining({ deletedAt: expect.any(String) as string, updatedAt: expect.any(String) as string }));
  });
});
