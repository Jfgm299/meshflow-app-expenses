import { Injectable, NotFoundException } from "@nestjs/common";
import type { UserContext } from "../core/user-context";
import { AccountsRepository } from "./accounts.repository";
import { DEFAULT_ACCOUNT_CURRENCY, type AccountRecord, type CreateAccountDto, type UpdateAccountDto } from "./accounts.types";

const isCallerOwnedActiveAccount = (account: AccountRecord, userContext: UserContext): boolean => account.userId === userContext.userId && account.deletedAt === undefined;

const normalizeOptionalText = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

@Injectable()
export class AccountsService {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  async list(userContext: UserContext): Promise<AccountRecord[]> {
    const accounts = await this.accountsRepository.list(userContext);
    return accounts.filter((account) => isCallerOwnedActiveAccount(account, userContext));
  }

  create(userContext: UserContext, dto: CreateAccountDto): Promise<AccountRecord> {
    const now = new Date().toISOString();

    return this.accountsRepository.create(userContext, {
      userId: userContext.userId,
      name: dto.name,
      currency: normalizeOptionalText(dto.currency) ?? DEFAULT_ACCOUNT_CURRENCY,
      type: dto.type,
      initialBalance: dto.initialBalance,
      isArchived: dto.isArchived,
      createdAt: now,
      updatedAt: now
    });
  }

  async read(userContext: UserContext, accountId: string): Promise<AccountRecord> {
    const account = await this.accountsRepository.read(userContext, accountId);
    this.assertCallerOwnedActiveAccount(account, userContext, accountId);
    return account;
  }

  async update(userContext: UserContext, accountId: string, dto: UpdateAccountDto): Promise<AccountRecord> {
    const existingAccount = await this.accountsRepository.read(userContext, accountId);
    this.assertCallerOwnedActiveAccount(existingAccount, userContext, accountId);

    return this.accountsRepository.update(userContext, accountId, {
      name: dto.name,
      currency: normalizeOptionalText(dto.currency),
      type: dto.type,
      initialBalance: dto.initialBalance,
      isArchived: dto.isArchived,
      updatedAt: new Date().toISOString()
    });
  }

  async softDelete(userContext: UserContext, accountId: string): Promise<AccountRecord> {
    const existingAccount = await this.accountsRepository.read(userContext, accountId);
    this.assertCallerOwnedActiveAccount(existingAccount, userContext, accountId);

    const now = new Date().toISOString();
    return this.accountsRepository.softDelete(userContext, accountId, {
      updatedAt: now,
      deletedAt: now
    });
  }

  private assertCallerOwnedActiveAccount(account: AccountRecord, userContext: UserContext, accountId: string): void {
    if (!isCallerOwnedActiveAccount(account, userContext)) {
      throw new NotFoundException(`Account not found: ${accountId}`);
    }
  }
}
