import { NotFoundException } from "@nestjs/common";
import { AccountsRepository } from "./accounts.repository";
import { AccountsService } from "./accounts.service";
import type { AccountRecord } from "./accounts.types";

const activeAccount = (overrides: Partial<AccountRecord> = {}): AccountRecord => ({
  id: "account-1",
  userId: "user-123",
  name: "Main account",
  currency: "EUR",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const createRepositoryMock = (): jest.Mocked<Pick<AccountsRepository, "list" | "create" | "read" | "update" | "softDelete">> => ({
  list: jest.fn(),
  create: jest.fn(),
  read: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn()
});

describe("AccountsService", () => {
  it("creates accounts with EUR as the default currency", async () => {
    const repository = createRepositoryMock();
    const createdAccount = activeAccount();
    repository.create.mockResolvedValue(createdAccount);
    const service = new AccountsService(repository as unknown as AccountsRepository);

    await expect(service.create({ userId: "user-123" }, { name: "Main account" })).resolves.toEqual(createdAccount);

    expect(repository.create).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.objectContaining({
        userId: "user-123",
        name: "Main account",
        currency: "EUR"
      })
    );
  });

  it("creates accounts with a custom currency when provided", async () => {
    const repository = createRepositoryMock();
    const createdAccount = activeAccount({ currency: "USD" });
    repository.create.mockResolvedValue(createdAccount);
    const service = new AccountsService(repository as unknown as AccountsRepository);

    await expect(service.create({ userId: "user-123" }, { name: "USD account", currency: "USD" })).resolves.toEqual(createdAccount);

    expect(repository.create).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.objectContaining({
        currency: "USD"
      })
    );
  });

  it("lists only caller-owned active accounts", async () => {
    const repository = createRepositoryMock();
    const callerAccount = activeAccount({ id: "account-1" });
    const softDeletedAccount = activeAccount({ id: "account-2", deletedAt: "2026-02-01T00:00:00.000Z" });
    const otherUserAccount = activeAccount({ id: "account-3", userId: "other-user" });
    repository.list.mockResolvedValue([callerAccount, softDeletedAccount, otherUserAccount]);
    const service = new AccountsService(repository as unknown as AccountsRepository);

    await expect(service.list({ userId: "user-123" })).resolves.toEqual([callerAccount]);
    expect(repository.list).toHaveBeenCalledWith({ userId: "user-123" });
  });

  it("rejects reads for soft-deleted or non-owned records", async () => {
    const repository = createRepositoryMock();
    repository.read.mockResolvedValue(activeAccount({ userId: "other-user" }));
    const service = new AccountsService(repository as unknown as AccountsRepository);

    await expect(service.read({ userId: "user-123" }, "account-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.read).toHaveBeenCalledWith({ userId: "user-123" }, "account-1");
  });

  it("updates only after reading the caller-owned active account", async () => {
    const repository = createRepositoryMock();
    const updatedAccount = activeAccount({ name: "Updated account" });
    repository.read.mockResolvedValue(activeAccount());
    repository.update.mockResolvedValue(updatedAccount);
    const service = new AccountsService(repository as unknown as AccountsRepository);

    await expect(service.update({ userId: "user-123" }, "account-1", { name: "Updated account" })).resolves.toEqual(updatedAccount);

    expect(repository.read).toHaveBeenCalledWith({ userId: "user-123" }, "account-1");
    expect(repository.update).toHaveBeenCalledWith(
      { userId: "user-123" },
      "account-1",
      expect.objectContaining({
        name: "Updated account",
        updatedAt: expect.any(String) as string
      })
    );
  });

  it("soft deletes accounts instead of hard deleting them", async () => {
    const repository = createRepositoryMock();
    const deletedAccount = activeAccount({ deletedAt: "2026-02-01T00:00:00.000Z" });
    repository.read.mockResolvedValue(activeAccount());
    repository.softDelete.mockResolvedValue(deletedAccount);
    const service = new AccountsService(repository as unknown as AccountsRepository);

    await expect(service.softDelete({ userId: "user-123" }, "account-1")).resolves.toEqual(deletedAccount);

    expect(repository.read).toHaveBeenCalledWith({ userId: "user-123" }, "account-1");
    expect(repository.softDelete).toHaveBeenCalledWith(
      { userId: "user-123" },
      "account-1",
      expect.objectContaining({
        deletedAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string
      })
    );
  });
});
