import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { UserContext } from "../core/user-context";
import { ScheduledTransactionsRepository } from "./scheduled-transactions.repository";
import {
  SCHEDULED_TRANSACTION_STATUSES,
  SCHEDULED_TRANSACTION_TYPES,
  type CreateScheduledTransactionDto,
  type ListScheduledTransactionsQuery,
  type NormalizedListScheduledTransactionsFilter,
  type ScheduledTransactionRecord,
  type ScheduledTransactionStatus,
  type ScheduledTransactionType,
  type UpdateScheduledTransactionDto,
  type UpdateScheduledTransactionRecordInput
} from "./scheduled-transactions.types";

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/u;

const isCallerOwnedScheduledTransaction = (definition: ScheduledTransactionRecord, userContext: UserContext): boolean => definition.userId === userContext.userId;

const isActiveScheduledTransaction = (definition: ScheduledTransactionRecord): boolean => definition.deletedAt === undefined;

const isCallerOwnedActiveScheduledTransaction = (definition: ScheduledTransactionRecord, userContext: UserContext): boolean =>
  isCallerOwnedScheduledTransaction(definition, userContext) && isActiveScheduledTransaction(definition);

const isScheduledTransactionType = (value: unknown): value is ScheduledTransactionType => value === SCHEDULED_TRANSACTION_TYPES.INCOME || value === SCHEDULED_TRANSACTION_TYPES.EXPENSE;

const isScheduledTransactionStatus = (value: unknown): value is ScheduledTransactionStatus =>
  value === SCHEDULED_TRANSACTION_STATUSES.PENDING || value === SCHEDULED_TRANSACTION_STATUSES.PROCESSED || value === SCHEDULED_TRANSACTION_STATUSES.CANCELLED;

const parseType = (value: unknown): ScheduledTransactionType => {
  if (isScheduledTransactionType(value)) {
    return value;
  }

  throw new BadRequestException("Scheduled transaction type must be either income or expense");
};

const parseOptionalType = (value: unknown): ScheduledTransactionType | undefined => (value === undefined ? undefined : parseType(value));

const parseStatus = (value: unknown): ScheduledTransactionStatus => {
  if (isScheduledTransactionStatus(value)) {
    return value;
  }

  throw new BadRequestException("Scheduled transaction status must be pending, processed, or cancelled");
};

const parseOptionalStatus = (value: unknown): ScheduledTransactionStatus | undefined => (value === undefined ? undefined : parseStatus(value));

const parseAmount = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  throw new BadRequestException("Scheduled transaction amount must be a finite number");
};

const parseOptionalAmount = (value: unknown): number | undefined => (value === undefined ? undefined : parseAmount(value));

const parseCurrency = (value: unknown): string => {
  if (typeof value === "string") {
    const currency = value.trim();
    if (CURRENCY_CODE_PATTERN.test(currency)) {
      return currency;
    }
  }

  throw new BadRequestException("Scheduled transaction currency is required and must be an uppercase ISO 4217 code");
};

const parseOptionalCurrency = (value: unknown): string | undefined => (value === undefined ? undefined : parseCurrency(value));

const parseRequiredText = (value: unknown, fieldName: string): string => {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized) {
      return normalized;
    }
  }

  throw new BadRequestException(`Scheduled transaction ${fieldName} is required`);
};

const parseOptionalText = (value: unknown, fieldName: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : undefined;
  }

  throw new BadRequestException(`Scheduled transaction ${fieldName} must be text`);
};

const parseDateText = (value: unknown, fieldName: string): string => {
  const date = parseRequiredText(value, fieldName);
  if (Number.isNaN(Date.parse(date))) {
    throw new BadRequestException(`Scheduled transaction ${fieldName} must be a valid date`);
  }

  return date;
};

const parseOptionalDateText = (value: unknown, fieldName: string): string | undefined => (value === undefined ? undefined : parseDateText(value, fieldName));

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

const normalizeListFilter = (query: ListScheduledTransactionsQuery): NormalizedListScheduledTransactionsFilter => ({
  type: parseOptionalType(query.type),
  status: parseOptionalStatus(query.status),
  from: parseOptionalDateText(query.from, "from filter"),
  to: parseOptionalDateText(query.to, "to filter")
});

const matchesFilter = (definition: ScheduledTransactionRecord, filter: NormalizedListScheduledTransactionsFilter): boolean => {
  const scheduledTime = Date.parse(definition.scheduledDate);
  const fromTime = getFromTime(filter.from);
  const toTime = getToTime(filter.to);

  return (
    (filter.type === undefined || definition.type === filter.type) &&
    (filter.status === undefined || definition.status === filter.status) &&
    (fromTime === undefined || scheduledTime >= fromTime) &&
    (toTime === undefined || scheduledTime <= toTime)
  );
};

@Injectable()
export class ScheduledTransactionsService {
  constructor(private readonly scheduledTransactionsRepository: ScheduledTransactionsRepository) {}

  async list(userContext: UserContext, query: ListScheduledTransactionsQuery = {}): Promise<ScheduledTransactionRecord[]> {
    const filter = normalizeListFilter(query);
    const definitions = await this.scheduledTransactionsRepository.list(userContext, filter);
    return definitions.filter((definition) => isCallerOwnedActiveScheduledTransaction(definition, userContext) && matchesFilter(definition, filter));
  }

  async create(userContext: UserContext, dto: CreateScheduledTransactionDto): Promise<ScheduledTransactionRecord> {
    const now = new Date().toISOString();

    return this.scheduledTransactionsRepository.create(userContext, {
      userId: userContext.userId,
      type: parseType(dto.type),
      amount: parseAmount(dto.amount),
      currency: parseCurrency(dto.currency),
      accountId: parseRequiredText(dto.accountId, "accountId"),
      categoryId: parseOptionalText(dto.categoryId, "categoryId"),
      description: parseOptionalText(dto.description, "description"),
      scheduledDate: parseDateText(dto.scheduledDate, "scheduledDate"),
      status: parseOptionalStatus(dto.status) ?? SCHEDULED_TRANSACTION_STATUSES.PENDING,
      processedTransactionId: parseOptionalText(dto.processedTransactionId, "processedTransactionId"),
      createdAt: now,
      updatedAt: now
    });
  }

  async read(userContext: UserContext, scheduledTransactionId: string): Promise<ScheduledTransactionRecord> {
    const definition = await this.scheduledTransactionsRepository.read(userContext, scheduledTransactionId);
    this.assertCallerOwnedActiveScheduledTransaction(definition, userContext, scheduledTransactionId);
    return definition;
  }

  async update(userContext: UserContext, scheduledTransactionId: string, dto: UpdateScheduledTransactionDto): Promise<ScheduledTransactionRecord> {
    const existingDefinition = await this.scheduledTransactionsRepository.read(userContext, scheduledTransactionId);
    this.assertCallerOwnedActiveScheduledTransaction(existingDefinition, userContext, scheduledTransactionId);

    return this.scheduledTransactionsRepository.update(userContext, scheduledTransactionId, this.buildUpdateInput(dto));
  }

  async softDelete(userContext: UserContext, scheduledTransactionId: string): Promise<ScheduledTransactionRecord> {
    const existingDefinition = await this.scheduledTransactionsRepository.read(userContext, scheduledTransactionId);
    this.assertCallerOwnedActiveScheduledTransaction(existingDefinition, userContext, scheduledTransactionId);

    const now = new Date().toISOString();
    return this.scheduledTransactionsRepository.softDelete(userContext, scheduledTransactionId, {
      updatedAt: now,
      deletedAt: now
    });
  }

  private buildUpdateInput(dto: UpdateScheduledTransactionDto): UpdateScheduledTransactionRecordInput {
    return {
      type: parseOptionalType(dto.type),
      amount: parseOptionalAmount(dto.amount),
      currency: parseOptionalCurrency(dto.currency),
      accountId: dto.accountId === undefined ? undefined : parseRequiredText(dto.accountId, "accountId"),
      categoryId: parseOptionalText(dto.categoryId, "categoryId"),
      description: parseOptionalText(dto.description, "description"),
      scheduledDate: parseOptionalDateText(dto.scheduledDate, "scheduledDate"),
      status: parseOptionalStatus(dto.status),
      processedTransactionId: parseOptionalText(dto.processedTransactionId, "processedTransactionId"),
      updatedAt: new Date().toISOString()
    };
  }

  private assertCallerOwnedActiveScheduledTransaction(definition: ScheduledTransactionRecord, userContext: UserContext, scheduledTransactionId: string): void {
    if (!isCallerOwnedActiveScheduledTransaction(definition, userContext)) {
      throw new NotFoundException(`Scheduled transaction not found: ${scheduledTransactionId}`);
    }
  }
}
