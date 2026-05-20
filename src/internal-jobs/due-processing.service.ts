import { Injectable } from "@nestjs/common";
import type { UserContext } from "../core/user-context";
import { calculateNextRunDate } from "../recurring-transactions/recurring-transactions.schedule";
import { RecurringTransactionsRepository } from "../recurring-transactions/recurring-transactions.repository";
import { RECURRING_TRANSACTION_STATUSES, type RecurringTransactionRecord } from "../recurring-transactions/recurring-transactions.types";
import { ScheduledTransactionsRepository } from "../scheduled-transactions/scheduled-transactions.repository";
import { SCHEDULED_TRANSACTION_STATUSES, type ScheduledTransactionRecord } from "../scheduled-transactions/scheduled-transactions.types";
import { TransactionsRepository } from "../transactions/transactions.repository";
import { TRANSACTION_SOURCES, type TransactionRecord, type TransactionSource } from "../transactions/transactions.types";
import type { ProcessDueOptions, ProcessDueResult } from "./due-processing.types";

interface GeneratedTransactionLookup {
  source: TransactionSource;
  sourceId: string;
  sourceOccurrenceDate: string;
}

interface CreatedOrExistingTransaction {
  transaction: TransactionRecord;
  created: boolean;
}

const createInitialResult = (): ProcessDueResult => ({
  recurringProcessed: 0,
  scheduledProcessed: 0,
  transactionsCreated: 0,
  skippedDuplicates: 0,
  errors: 0
});

const isActiveCallerRecurringDefinition = (definition: RecurringTransactionRecord, userContext: UserContext): boolean =>
  definition.userId === userContext.userId && definition.deletedAt === undefined && definition.status === RECURRING_TRANSACTION_STATUSES.ACTIVE;

const isPendingCallerScheduledDefinition = (definition: ScheduledTransactionRecord, userContext: UserContext): boolean =>
  definition.userId === userContext.userId && definition.deletedAt === undefined && definition.status === SCHEDULED_TRANSACTION_STATUSES.PENDING;

const isDueAtOrBefore = (dateText: string, now: Date): boolean => {
  const dueTime = Date.parse(dateText);
  return Number.isFinite(dueTime) && dueTime <= now.getTime();
};

@Injectable()
export class DueProcessingService {
  constructor(
    private readonly recurringTransactionsRepository: RecurringTransactionsRepository,
    private readonly scheduledTransactionsRepository: ScheduledTransactionsRepository,
    private readonly transactionsRepository: TransactionsRepository
  ) {}

  async processDue(userContext: UserContext, options: ProcessDueOptions = {}): Promise<ProcessDueResult> {
    const now = options.now ?? new Date();
    const result = createInitialResult();

    await this.processRecurringDefinitions(userContext, now, result);
    await this.processScheduledDefinitions(userContext, now, result);

    return result;
  }

  private async processRecurringDefinitions(userContext: UserContext, now: Date, result: ProcessDueResult): Promise<void> {
    let definitions: RecurringTransactionRecord[];

    try {
      definitions = await this.recurringTransactionsRepository.list(userContext, { status: RECURRING_TRANSACTION_STATUSES.ACTIVE });
    } catch {
      result.errors += 1;
      return;
    }

    const dueDefinitions = definitions.filter((definition) => isActiveCallerRecurringDefinition(definition, userContext) && isDueAtOrBefore(definition.nextRunDate, now));

    for (const definition of dueDefinitions) {
      await this.processRecurringDefinition(userContext, definition, result);
    }
  }

  private async processRecurringDefinition(userContext: UserContext, definition: RecurringTransactionRecord, result: ProcessDueResult): Promise<void> {
    const occurrenceDate = definition.nextRunDate;

    try {
      const transactionResult = await this.createOrGetRecurringTransaction(userContext, definition, occurrenceDate);
      this.countTransactionResult(transactionResult, result);

      await this.recurringTransactionsRepository.update(userContext, definition.id, {
        lastRunDate: occurrenceDate,
        nextRunDate: calculateNextRunDate(occurrenceDate, definition.frequency, definition.interval ?? 1),
        updatedAt: new Date().toISOString()
      });

      result.recurringProcessed += 1;
    } catch {
      result.errors += 1;
    }
  }

  private async processScheduledDefinitions(userContext: UserContext, now: Date, result: ProcessDueResult): Promise<void> {
    let definitions: ScheduledTransactionRecord[];

    try {
      definitions = await this.scheduledTransactionsRepository.list(userContext, { status: SCHEDULED_TRANSACTION_STATUSES.PENDING });
    } catch {
      result.errors += 1;
      return;
    }

    const dueDefinitions = definitions.filter((definition) => isPendingCallerScheduledDefinition(definition, userContext) && isDueAtOrBefore(definition.scheduledDate, now));

    for (const definition of dueDefinitions) {
      await this.processScheduledDefinition(userContext, definition, result);
    }
  }

  private async processScheduledDefinition(userContext: UserContext, definition: ScheduledTransactionRecord, result: ProcessDueResult): Promise<void> {
    const occurrenceDate = definition.scheduledDate;

    try {
      const transactionResult = await this.createOrGetScheduledTransaction(userContext, definition, occurrenceDate);
      this.countTransactionResult(transactionResult, result);

      await this.scheduledTransactionsRepository.update(userContext, definition.id, {
        status: SCHEDULED_TRANSACTION_STATUSES.PROCESSED,
        processedTransactionId: transactionResult.transaction.id,
        updatedAt: new Date().toISOString()
      });

      result.scheduledProcessed += 1;
    } catch {
      result.errors += 1;
    }
  }

  private async createOrGetRecurringTransaction(userContext: UserContext, definition: RecurringTransactionRecord, occurrenceDate: string): Promise<CreatedOrExistingTransaction> {
    const existingTransaction = await this.findExistingGeneratedTransaction(userContext, {
      source: TRANSACTION_SOURCES.RECURRING,
      sourceId: definition.id,
      sourceOccurrenceDate: occurrenceDate
    });

    if (existingTransaction) {
      return { transaction: existingTransaction, created: false };
    }

    const now = new Date().toISOString();
    const transaction = await this.transactionsRepository.create(userContext, {
      userId: userContext.userId,
      type: definition.type,
      amount: definition.amount,
      currency: definition.currency,
      accountId: definition.accountId,
      categoryId: definition.categoryId,
      date: occurrenceDate,
      description: definition.description ?? definition.name,
      notes: definition.notes,
      source: TRANSACTION_SOURCES.RECURRING,
      sourceId: definition.id,
      sourceOccurrenceDate: occurrenceDate,
      createdAt: now,
      updatedAt: now
    });

    return { transaction, created: true };
  }

  private async createOrGetScheduledTransaction(userContext: UserContext, definition: ScheduledTransactionRecord, occurrenceDate: string): Promise<CreatedOrExistingTransaction> {
    const existingTransaction = await this.findExistingGeneratedTransaction(userContext, {
      source: TRANSACTION_SOURCES.SCHEDULED,
      sourceId: definition.id,
      sourceOccurrenceDate: occurrenceDate
    });

    if (existingTransaction) {
      return { transaction: existingTransaction, created: false };
    }

    const now = new Date().toISOString();
    const transaction = await this.transactionsRepository.create(userContext, {
      userId: userContext.userId,
      type: definition.type,
      amount: definition.amount,
      currency: definition.currency,
      accountId: definition.accountId,
      categoryId: definition.categoryId,
      date: occurrenceDate,
      description: definition.description,
      source: TRANSACTION_SOURCES.SCHEDULED,
      sourceId: definition.id,
      sourceOccurrenceDate: occurrenceDate,
      createdAt: now,
      updatedAt: now
    });

    return { transaction, created: true };
  }

  private async findExistingGeneratedTransaction(userContext: UserContext, lookup: GeneratedTransactionLookup): Promise<TransactionRecord | undefined> {
    const transactions = await this.transactionsRepository.list(userContext, { includeDeleted: false });

    return transactions.find(
      (transaction) =>
        transaction.userId === userContext.userId &&
        transaction.deletedAt === undefined &&
        transaction.source === lookup.source &&
        transaction.sourceId === lookup.sourceId &&
        transaction.sourceOccurrenceDate === lookup.sourceOccurrenceDate
    );
  }

  private countTransactionResult(transactionResult: CreatedOrExistingTransaction, result: ProcessDueResult): void {
    if (transactionResult.created) {
      result.transactionsCreated += 1;
      return;
    }

    result.skippedDuplicates += 1;
  }
}
