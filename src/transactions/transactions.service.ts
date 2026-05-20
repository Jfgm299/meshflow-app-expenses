import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { UserContext } from "../core/user-context";
import { TransactionsRepository } from "./transactions.repository";
import {
  TRANSACTION_SOURCES,
  TRANSACTION_TYPES,
  type CreateTransactionDto,
  type ListTransactionsQuery,
  type NormalizedListTransactionsFilter,
  type TransactionRecord,
  type TransactionType,
  type UpdateTransactionDto
} from "./transactions.types";

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/u;

const isCallerOwnedTransaction = (transaction: TransactionRecord, userContext: UserContext): boolean => transaction.userId === userContext.userId;

const isActiveTransaction = (transaction: TransactionRecord): boolean => transaction.deletedAt === undefined;

const isCallerOwnedVisibleTransaction = (transaction: TransactionRecord, userContext: UserContext, includeDeleted: boolean): boolean =>
  isCallerOwnedTransaction(transaction, userContext) && (includeDeleted || isActiveTransaction(transaction));

const isTransactionType = (value: unknown): value is TransactionType => value === TRANSACTION_TYPES.INCOME || value === TRANSACTION_TYPES.EXPENSE;

const parseTransactionType = (value: unknown): TransactionType => {
  if (isTransactionType(value)) {
    return value;
  }

  throw new BadRequestException("Transaction type must be either income or expense");
};

const parseOptionalTransactionType = (value: unknown): TransactionType | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return parseTransactionType(value);
};

const parseAmount = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  throw new BadRequestException("Transaction amount must be a finite number");
};

const parseOptionalAmount = (value: unknown): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return parseAmount(value);
};

const parseCurrency = (value: unknown): string => {
  if (typeof value === "string") {
    const currency = value.trim();
    if (CURRENCY_CODE_PATTERN.test(currency)) {
      return currency;
    }
  }

  throw new BadRequestException("Transaction currency is required and must be an uppercase ISO 4217 code");
};

const parseOptionalCurrency = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return parseCurrency(value);
};

const parseRequiredText = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (normalized) {
    return normalized;
  }

  throw new BadRequestException(`Transaction ${fieldName} is required`);
};

const normalizeOptionalText = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const parseDateText = (value: string, fieldName: string): string => {
  const date = parseRequiredText(value, fieldName);
  if (Number.isNaN(Date.parse(date))) {
    throw new BadRequestException(`Transaction ${fieldName} must be a valid date`);
  }

  return date;
};

const parseOptionalDateText = (value: string | undefined, fieldName: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return parseDateText(value, fieldName);
};

const parseIncludeDeleted = (value: unknown): boolean => {
  if (value === undefined || value === false || value === "false") {
    return false;
  }

  if (value === true || value === "true") {
    return true;
  }

  throw new BadRequestException("includeDeleted must be true or false");
};

const isDateOnly = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/u.test(value);

const getFromTime = (value: string | undefined): number | undefined => (value === undefined ? undefined : Date.parse(value));

const getToTime = (value: string | undefined): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (isDateOnly(value)) {
    return Date.parse(`${value}T23:59:59.999Z`);
  }

  return Date.parse(value);
};

const matchesFilter = (transaction: TransactionRecord, filter: NormalizedListTransactionsFilter): boolean => {
  const transactionTime = Date.parse(transaction.date);
  const fromTime = getFromTime(filter.from);
  const toTime = getToTime(filter.to);

  return (
    (fromTime === undefined || transactionTime >= fromTime) &&
    (toTime === undefined || transactionTime <= toTime) &&
    (filter.accountId === undefined || transaction.accountId === filter.accountId) &&
    (filter.categoryId === undefined || transaction.categoryId === filter.categoryId) &&
    (filter.type === undefined || transaction.type === filter.type)
  );
};

const normalizeListFilter = (query: ListTransactionsQuery): NormalizedListTransactionsFilter => ({
  from: parseOptionalDateText(query.from, "from filter"),
  to: parseOptionalDateText(query.to, "to filter"),
  accountId: normalizeOptionalText(query.accountId),
  categoryId: normalizeOptionalText(query.categoryId),
  type: parseOptionalTransactionType(query.type),
  includeDeleted: parseIncludeDeleted(query.includeDeleted)
});

@Injectable()
export class TransactionsService {
  constructor(private readonly transactionsRepository: TransactionsRepository) {}

  async list(userContext: UserContext, query: ListTransactionsQuery = {}): Promise<TransactionRecord[]> {
    const filter = normalizeListFilter(query);
    const transactions = await this.transactionsRepository.list(userContext, filter);
    return transactions.filter((transaction) => isCallerOwnedVisibleTransaction(transaction, userContext, filter.includeDeleted) && matchesFilter(transaction, filter));
  }

  async create(userContext: UserContext, dto: CreateTransactionDto): Promise<TransactionRecord> {
    const now = new Date().toISOString();

    return this.transactionsRepository.create(userContext, {
      userId: userContext.userId,
      type: parseTransactionType(dto.type),
      amount: parseAmount(dto.amount),
      currency: parseCurrency(dto.currency),
      accountId: parseRequiredText(dto.accountId, "accountId"),
      categoryId: normalizeOptionalText(dto.categoryId),
      date: parseDateText(dto.date, "date"),
      description: normalizeOptionalText(dto.description),
      notes: normalizeOptionalText(dto.notes),
      source: TRANSACTION_SOURCES.MANUAL,
      createdAt: now,
      updatedAt: now
    });
  }

  async read(userContext: UserContext, transactionId: string): Promise<TransactionRecord> {
    const transaction = await this.transactionsRepository.read(userContext, transactionId);
    this.assertCallerOwnedActiveTransaction(transaction, userContext, transactionId);
    return transaction;
  }

  async update(userContext: UserContext, transactionId: string, dto: UpdateTransactionDto): Promise<TransactionRecord> {
    const existingTransaction = await this.transactionsRepository.read(userContext, transactionId);
    this.assertCallerOwnedActiveTransaction(existingTransaction, userContext, transactionId);

    return this.transactionsRepository.update(userContext, transactionId, {
      type: parseOptionalTransactionType(dto.type),
      amount: parseOptionalAmount(dto.amount),
      currency: parseOptionalCurrency(dto.currency),
      accountId: dto.accountId === undefined ? undefined : parseRequiredText(dto.accountId, "accountId"),
      categoryId: dto.categoryId,
      date: parseOptionalDateText(dto.date, "date"),
      description: dto.description,
      notes: dto.notes,
      updatedAt: new Date().toISOString()
    });
  }

  async softDelete(userContext: UserContext, transactionId: string): Promise<TransactionRecord> {
    const existingTransaction = await this.transactionsRepository.read(userContext, transactionId);
    this.assertCallerOwnedActiveTransaction(existingTransaction, userContext, transactionId);

    const now = new Date().toISOString();
    return this.transactionsRepository.softDelete(userContext, transactionId, {
      updatedAt: now,
      deletedAt: now
    });
  }

  private assertCallerOwnedActiveTransaction(transaction: TransactionRecord, userContext: UserContext, transactionId: string): void {
    if (!isCallerOwnedTransaction(transaction, userContext) || !isActiveTransaction(transaction)) {
      throw new NotFoundException(`Transaction not found: ${transactionId}`);
    }
  }
}
