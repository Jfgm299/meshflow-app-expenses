import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { UserContext } from "../core/user-context";
import { calculateNextRunDate } from "./recurring-transactions.schedule";
import { RecurringTransactionsRepository } from "./recurring-transactions.repository";
import {
  RECURRING_TRANSACTION_FREQUENCIES,
  RECURRING_TRANSACTION_STATUSES,
  RECURRING_TRANSACTION_TYPES,
  type CreateRecurringTransactionDto,
  type ListRecurringTransactionsQuery,
  type NormalizedListRecurringTransactionsFilter,
  type RecurringTransactionFrequency,
  type RecurringTransactionRecord,
  type RecurringTransactionStatus,
  type RecurringTransactionType,
  type UpdateRecurringTransactionDto,
  type UpdateRecurringTransactionRecordInput
} from "./recurring-transactions.types";

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/u;

const isCallerOwnedRecurringTransaction = (definition: RecurringTransactionRecord, userContext: UserContext): boolean => definition.userId === userContext.userId;

const isActiveRecurringTransaction = (definition: RecurringTransactionRecord): boolean => definition.deletedAt === undefined;

const isCallerOwnedActiveRecurringTransaction = (definition: RecurringTransactionRecord, userContext: UserContext): boolean =>
  isCallerOwnedRecurringTransaction(definition, userContext) && isActiveRecurringTransaction(definition);

const isRecurringTransactionType = (value: unknown): value is RecurringTransactionType => value === RECURRING_TRANSACTION_TYPES.INCOME || value === RECURRING_TRANSACTION_TYPES.EXPENSE;

const isRecurringTransactionFrequency = (value: unknown): value is RecurringTransactionFrequency =>
  value === RECURRING_TRANSACTION_FREQUENCIES.DAILY || value === RECURRING_TRANSACTION_FREQUENCIES.WEEKLY || value === RECURRING_TRANSACTION_FREQUENCIES.MONTHLY;

const isRecurringTransactionStatus = (value: unknown): value is RecurringTransactionStatus =>
  value === RECURRING_TRANSACTION_STATUSES.ACTIVE || value === RECURRING_TRANSACTION_STATUSES.PAUSED || value === RECURRING_TRANSACTION_STATUSES.CANCELLED;

const parseType = (value: unknown): RecurringTransactionType => {
  if (isRecurringTransactionType(value)) {
    return value;
  }

  throw new BadRequestException("Recurring transaction type must be either income or expense");
};

const parseOptionalType = (value: unknown): RecurringTransactionType | undefined => (value === undefined ? undefined : parseType(value));

const parseFrequency = (value: unknown): RecurringTransactionFrequency => {
  if (isRecurringTransactionFrequency(value)) {
    return value;
  }

  throw new BadRequestException("Recurring transaction frequency must be daily, weekly, or monthly");
};

const parseOptionalFrequency = (value: unknown): RecurringTransactionFrequency | undefined => (value === undefined ? undefined : parseFrequency(value));

const parseStatus = (value: unknown): RecurringTransactionStatus => {
  if (isRecurringTransactionStatus(value)) {
    return value;
  }

  throw new BadRequestException("Recurring transaction status must be active, paused, or cancelled");
};

const parseOptionalStatus = (value: unknown): RecurringTransactionStatus | undefined => (value === undefined ? undefined : parseStatus(value));

const parseAmount = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  throw new BadRequestException("Recurring transaction amount must be a finite number");
};

const parseOptionalAmount = (value: unknown): number | undefined => (value === undefined ? undefined : parseAmount(value));

const parseCurrency = (value: unknown): string => {
  if (typeof value === "string") {
    const currency = value.trim();
    if (CURRENCY_CODE_PATTERN.test(currency)) {
      return currency;
    }
  }

  throw new BadRequestException("Recurring transaction currency is required and must be an uppercase ISO 4217 code");
};

const parseOptionalCurrency = (value: unknown): string | undefined => (value === undefined ? undefined : parseCurrency(value));

const parseRequiredText = (value: unknown, fieldName: string): string => {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized) {
      return normalized;
    }
  }

  throw new BadRequestException(`Recurring transaction ${fieldName} is required`);
};

const parseOptionalText = (value: unknown, fieldName: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : undefined;
  }

  throw new BadRequestException(`Recurring transaction ${fieldName} must be text`);
};

const parseDateText = (value: unknown, fieldName: string): string => {
  const date = parseRequiredText(value, fieldName);
  if (Number.isNaN(Date.parse(date))) {
    throw new BadRequestException(`Recurring transaction ${fieldName} must be a valid date`);
  }

  return date;
};

const parseOptionalDateText = (value: unknown, fieldName: string): string | undefined => (value === undefined ? undefined : parseDateText(value, fieldName));

const parseInterval = (value: unknown): number => {
  if (value === undefined) {
    return 1;
  }

  if (typeof value === "number" && Number.isInteger(value) && value >= 1) {
    return value;
  }

  throw new BadRequestException("Recurring transaction interval must be a positive integer");
};

const parseOptionalInterval = (value: unknown): number | undefined => (value === undefined ? undefined : parseInterval(value));

const normalizeListFilter = (query: ListRecurringTransactionsQuery): NormalizedListRecurringTransactionsFilter => ({
  type: parseOptionalType(query.type),
  status: parseOptionalStatus(query.status)
});

const matchesFilter = (definition: RecurringTransactionRecord, filter: NormalizedListRecurringTransactionsFilter): boolean =>
  (filter.type === undefined || definition.type === filter.type) && (filter.status === undefined || definition.status === filter.status);

@Injectable()
export class RecurringTransactionsService {
  constructor(private readonly recurringTransactionsRepository: RecurringTransactionsRepository) {}

  async list(userContext: UserContext, query: ListRecurringTransactionsQuery = {}): Promise<RecurringTransactionRecord[]> {
    const filter = normalizeListFilter(query);
    const definitions = await this.recurringTransactionsRepository.list(userContext, filter);
    return definitions.filter((definition) => isCallerOwnedActiveRecurringTransaction(definition, userContext) && matchesFilter(definition, filter));
  }

  async create(userContext: UserContext, dto: CreateRecurringTransactionDto): Promise<RecurringTransactionRecord> {
    const now = new Date().toISOString();
    const frequency = parseFrequency(dto.frequency);
    const interval = parseInterval(dto.interval);
    const startDate = parseDateText(dto.startDate, "startDate");

    return this.recurringTransactionsRepository.create(userContext, {
      userId: userContext.userId,
      type: parseType(dto.type),
      amount: parseAmount(dto.amount),
      currency: parseCurrency(dto.currency),
      accountId: parseRequiredText(dto.accountId, "accountId"),
      categoryId: parseOptionalText(dto.categoryId, "categoryId"),
      name: parseRequiredText(dto.name, "name"),
      description: parseOptionalText(dto.description, "description"),
      notes: parseOptionalText(dto.notes, "notes"),
      frequency,
      interval,
      startDate,
      endDate: parseOptionalDateText(dto.endDate, "endDate"),
      nextRunDate: calculateNextRunDate(startDate, frequency, interval),
      status: parseOptionalStatus(dto.status) ?? RECURRING_TRANSACTION_STATUSES.ACTIVE,
      createdAt: now,
      updatedAt: now
    });
  }

  async read(userContext: UserContext, recurringTransactionId: string): Promise<RecurringTransactionRecord> {
    const definition = await this.recurringTransactionsRepository.read(userContext, recurringTransactionId);
    this.assertCallerOwnedActiveRecurringTransaction(definition, userContext, recurringTransactionId);
    return definition;
  }

  async update(userContext: UserContext, recurringTransactionId: string, dto: UpdateRecurringTransactionDto): Promise<RecurringTransactionRecord> {
    const existingDefinition = await this.recurringTransactionsRepository.read(userContext, recurringTransactionId);
    this.assertCallerOwnedActiveRecurringTransaction(existingDefinition, userContext, recurringTransactionId);

    const input = this.buildUpdateInput(existingDefinition, dto);
    return this.recurringTransactionsRepository.update(userContext, recurringTransactionId, input);
  }

  async softDelete(userContext: UserContext, recurringTransactionId: string): Promise<RecurringTransactionRecord> {
    const existingDefinition = await this.recurringTransactionsRepository.read(userContext, recurringTransactionId);
    this.assertCallerOwnedActiveRecurringTransaction(existingDefinition, userContext, recurringTransactionId);

    const now = new Date().toISOString();
    return this.recurringTransactionsRepository.softDelete(userContext, recurringTransactionId, {
      updatedAt: now,
      deletedAt: now
    });
  }

  private buildUpdateInput(existingDefinition: RecurringTransactionRecord, dto: UpdateRecurringTransactionDto): UpdateRecurringTransactionRecordInput {
    const frequency = parseOptionalFrequency(dto.frequency);
    const interval = parseOptionalInterval(dto.interval);
    const startDate = parseOptionalDateText(dto.startDate, "startDate");
    const nextRunDate = parseOptionalDateText(dto.nextRunDate, "nextRunDate") ?? this.calculateUpdatedNextRunDate(existingDefinition, frequency, interval, startDate);

    return {
      type: parseOptionalType(dto.type),
      amount: parseOptionalAmount(dto.amount),
      currency: parseOptionalCurrency(dto.currency),
      accountId: dto.accountId === undefined ? undefined : parseRequiredText(dto.accountId, "accountId"),
      categoryId: parseOptionalText(dto.categoryId, "categoryId"),
      name: dto.name === undefined ? undefined : parseRequiredText(dto.name, "name"),
      description: parseOptionalText(dto.description, "description"),
      notes: parseOptionalText(dto.notes, "notes"),
      frequency,
      interval,
      startDate,
      endDate: parseOptionalDateText(dto.endDate, "endDate"),
      nextRunDate,
      lastRunDate: parseOptionalDateText(dto.lastRunDate, "lastRunDate"),
      status: parseOptionalStatus(dto.status),
      updatedAt: new Date().toISOString()
    };
  }

  private calculateUpdatedNextRunDate(
    existingDefinition: RecurringTransactionRecord,
    frequency: RecurringTransactionFrequency | undefined,
    interval: number | undefined,
    startDate: string | undefined
  ): string | undefined {
    if (frequency === undefined && interval === undefined && startDate === undefined) {
      return undefined;
    }

    return calculateNextRunDate(startDate ?? existingDefinition.startDate, frequency ?? existingDefinition.frequency, interval ?? existingDefinition.interval ?? 1);
  }

  private assertCallerOwnedActiveRecurringTransaction(definition: RecurringTransactionRecord, userContext: UserContext, recurringTransactionId: string): void {
    if (!isCallerOwnedActiveRecurringTransaction(definition, userContext)) {
      throw new NotFoundException(`Recurring transaction not found: ${recurringTransactionId}`);
    }
  }
}
