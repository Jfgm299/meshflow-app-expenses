import { RecurringTransactionsRepository } from "../recurring-transactions/recurring-transactions.repository";
import type { RecurringTransactionRecord } from "../recurring-transactions/recurring-transactions.types";
import { ScheduledTransactionsRepository } from "../scheduled-transactions/scheduled-transactions.repository";
import type { ScheduledTransactionRecord } from "../scheduled-transactions/scheduled-transactions.types";
import { TransactionsRepository } from "../transactions/transactions.repository";
import type { CreateTransactionRecordInput, TransactionRecord } from "../transactions/transactions.types";
import { DueProcessingService } from "./due-processing.service";

const userContext = { userId: "user-123" } as const;
const processingNow = new Date("2026-05-20T12:00:00.000Z");

const recurringDefinition = (overrides: Partial<RecurringTransactionRecord> = {}): RecurringTransactionRecord => ({
  id: "recurring-1",
  userId: "user-123",
  type: "expense",
  amount: 19.99,
  currency: "EUR",
  accountId: "account-1",
  categoryId: "category-1",
  name: "Subscription",
  description: "Streaming",
  notes: "Monthly plan",
  frequency: "monthly",
  interval: 1,
  startDate: "2026-01-20T00:00:00.000Z",
  nextRunDate: "2026-05-20T00:00:00.000Z",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const scheduledDefinition = (overrides: Partial<ScheduledTransactionRecord> = {}): ScheduledTransactionRecord => ({
  id: "scheduled-1",
  userId: "user-123",
  type: "income",
  amount: 150,
  currency: "EUR",
  accountId: "account-2",
  categoryId: "category-2",
  description: "One-off payment",
  scheduledDate: "2026-05-19T00:00:00.000Z",
  status: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const transactionRecord = (overrides: Partial<TransactionRecord> = {}): TransactionRecord => ({
  id: "transaction-1",
  userId: "user-123",
  type: "expense",
  amount: 19.99,
  currency: "EUR",
  accountId: "account-1",
  categoryId: "category-1",
  date: "2026-05-20T00:00:00.000Z",
  description: "Streaming",
  source: "recurring",
  sourceId: "recurring-1",
  sourceOccurrenceDate: "2026-05-20T00:00:00.000Z",
  createdAt: "2026-05-20T12:00:00.000Z",
  updatedAt: "2026-05-20T12:00:00.000Z",
  ...overrides
});

interface RepositoryMocks {
  recurringRepository: jest.Mocked<Pick<RecurringTransactionsRepository, "list" | "update">>;
  scheduledRepository: jest.Mocked<Pick<ScheduledTransactionsRepository, "list" | "update">>;
  transactionsRepository: jest.Mocked<Pick<TransactionsRepository, "list" | "create">>;
}

const createRepositoryMocks = (): RepositoryMocks => ({
  recurringRepository: {
    list: jest.fn(),
    update: jest.fn()
  },
  scheduledRepository: {
    list: jest.fn(),
    update: jest.fn()
  },
  transactionsRepository: {
    list: jest.fn(),
    create: jest.fn()
  }
});

const createService = (mocks: RepositoryMocks): DueProcessingService =>
  new DueProcessingService(
    mocks.recurringRepository as unknown as RecurringTransactionsRepository,
    mocks.scheduledRepository as unknown as ScheduledTransactionsRepository,
    mocks.transactionsRepository as unknown as TransactionsRepository
  );

describe("DueProcessingService", () => {
  it("materializes a due recurring definition and advances it from the occurrence date", async () => {
    const mocks = createRepositoryMocks();
    const recurring = recurringDefinition();
    const createdTransaction = transactionRecord();
    mocks.recurringRepository.list.mockResolvedValue([recurring]);
    mocks.scheduledRepository.list.mockResolvedValue([]);
    mocks.transactionsRepository.list.mockResolvedValue([]);
    mocks.transactionsRepository.create.mockResolvedValue(createdTransaction);
    mocks.recurringRepository.update.mockResolvedValue(recurringDefinition({ lastRunDate: recurring.nextRunDate, nextRunDate: "2026-06-20T00:00:00.000Z" }));
    const service = createService(mocks);

    await expect(service.processDue(userContext, { now: processingNow })).resolves.toEqual({
      recurringProcessed: 1,
      scheduledProcessed: 0,
      transactionsCreated: 1,
      skippedDuplicates: 0,
      errors: 0
    });

    expect(mocks.transactionsRepository.create).toHaveBeenCalledWith(
      userContext,
      expect.objectContaining({
        userId: "user-123",
        source: "recurring",
        sourceId: "recurring-1",
        sourceOccurrenceDate: "2026-05-20T00:00:00.000Z",
        date: "2026-05-20T00:00:00.000Z"
      }) as CreateTransactionRecordInput
    );
    expect(mocks.recurringRepository.update).toHaveBeenCalledWith(
      userContext,
      "recurring-1",
      expect.objectContaining({
        lastRunDate: "2026-05-20T00:00:00.000Z",
        nextRunDate: "2026-06-20T00:00:00.000Z"
      })
    );
  });

  it("materializes a due scheduled definition and marks it processed", async () => {
    const mocks = createRepositoryMocks();
    const scheduled = scheduledDefinition();
    const createdTransaction = transactionRecord({
      id: "transaction-scheduled-1",
      type: "income",
      amount: 150,
      accountId: "account-2",
      categoryId: "category-2",
      date: scheduled.scheduledDate,
      description: scheduled.description,
      source: "scheduled",
      sourceId: scheduled.id,
      sourceOccurrenceDate: scheduled.scheduledDate
    });
    mocks.recurringRepository.list.mockResolvedValue([]);
    mocks.scheduledRepository.list.mockResolvedValue([scheduled]);
    mocks.transactionsRepository.list.mockResolvedValue([]);
    mocks.transactionsRepository.create.mockResolvedValue(createdTransaction);
    mocks.scheduledRepository.update.mockResolvedValue(scheduledDefinition({ status: "processed", processedTransactionId: createdTransaction.id }));
    const service = createService(mocks);

    await expect(service.processDue(userContext, { now: processingNow })).resolves.toEqual({
      recurringProcessed: 0,
      scheduledProcessed: 1,
      transactionsCreated: 1,
      skippedDuplicates: 0,
      errors: 0
    });

    expect(mocks.transactionsRepository.create).toHaveBeenCalledWith(
      userContext,
      expect.objectContaining({
        source: "scheduled",
        sourceId: "scheduled-1",
        sourceOccurrenceDate: "2026-05-19T00:00:00.000Z",
        date: "2026-05-19T00:00:00.000Z"
      }) as CreateTransactionRecordInput
    );
    expect(mocks.scheduledRepository.update).toHaveBeenCalledWith(
      userContext,
      "scheduled-1",
      expect.objectContaining({
        status: "processed",
        processedTransactionId: "transaction-scheduled-1"
      })
    );
  });

  it("skips duplicate existing recurring and scheduled generated transactions", async () => {
    const mocks = createRepositoryMocks();
    const recurring = recurringDefinition();
    const scheduled = scheduledDefinition();
    const existingRecurring = transactionRecord({ id: "existing-recurring" });
    const existingScheduled = transactionRecord({ id: "existing-scheduled", source: "scheduled", sourceId: scheduled.id, sourceOccurrenceDate: scheduled.scheduledDate, date: scheduled.scheduledDate });
    mocks.recurringRepository.list.mockResolvedValue([recurring]);
    mocks.scheduledRepository.list.mockResolvedValue([scheduled]);
    mocks.transactionsRepository.list.mockResolvedValueOnce([existingRecurring]).mockResolvedValueOnce([existingScheduled]);
    mocks.recurringRepository.update.mockResolvedValue(recurringDefinition({ lastRunDate: recurring.nextRunDate }));
    mocks.scheduledRepository.update.mockResolvedValue(scheduledDefinition({ status: "processed", processedTransactionId: existingScheduled.id }));
    const service = createService(mocks);

    await expect(service.processDue(userContext, { now: processingNow })).resolves.toEqual({
      recurringProcessed: 1,
      scheduledProcessed: 1,
      transactionsCreated: 0,
      skippedDuplicates: 2,
      errors: 0
    });

    expect(mocks.transactionsRepository.create).not.toHaveBeenCalled();
    expect(mocks.scheduledRepository.update).toHaveBeenCalledWith(userContext, "scheduled-1", expect.objectContaining({ processedTransactionId: "existing-scheduled" }));
  });

  it("is safe to execute twice because the second run treats the generated transaction as a duplicate", async () => {
    const mocks = createRepositoryMocks();
    const recurring = recurringDefinition({ frequency: "daily", nextRunDate: "2026-05-20T00:00:00.000Z" });
    const generatedTransaction = transactionRecord();
    const recurringRecords: RecurringTransactionRecord[] = [recurring];
    const transactionRecords: TransactionRecord[] = [];
    mocks.recurringRepository.list.mockImplementation(async () => recurringRecords);
    mocks.scheduledRepository.list.mockResolvedValue([]);
    mocks.transactionsRepository.list.mockImplementation(async () => transactionRecords);
    mocks.transactionsRepository.create.mockImplementation(async (_userContext, input) => {
      const created = transactionRecord({
        ...input,
        id: generatedTransaction.id,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt
      });
      transactionRecords.push(created);
      return created;
    });
    mocks.recurringRepository.update.mockImplementation(async (_userContext, _id, input) => {
      recurringRecords[0] = recurringDefinition({
        ...recurringRecords[0],
        lastRunDate: input.lastRunDate,
        nextRunDate: input.nextRunDate ?? recurringRecords[0].nextRunDate
      });
      return recurringRecords[0];
    });
    const service = createService(mocks);

    await expect(service.processDue(userContext, { now: processingNow })).resolves.toMatchObject({ transactionsCreated: 1, skippedDuplicates: 0, errors: 0 });
    recurringRecords[0] = recurringDefinition({ ...recurringRecords[0], nextRunDate: "2026-05-20T00:00:00.000Z" });
    await expect(service.processDue(userContext, { now: processingNow })).resolves.toMatchObject({ transactionsCreated: 0, skippedDuplicates: 1, errors: 0 });
  });

  it("reports partial failures while keeping successful counters", async () => {
    const mocks = createRepositoryMocks();
    const successfulRecurring = recurringDefinition({ id: "recurring-success" });
    const failingRecurring = recurringDefinition({ id: "recurring-failure", nextRunDate: "2026-05-19T00:00:00.000Z" });
    mocks.recurringRepository.list.mockResolvedValue([successfulRecurring, failingRecurring]);
    mocks.scheduledRepository.list.mockResolvedValue([]);
    mocks.transactionsRepository.list.mockResolvedValue([]);
    mocks.transactionsRepository.create
      .mockResolvedValueOnce(transactionRecord({ id: "transaction-success", sourceId: successfulRecurring.id }))
      .mockRejectedValueOnce(new Error("Core Storage write failed"));
    mocks.recurringRepository.update.mockResolvedValue(successfulRecurring);
    const service = createService(mocks);

    await expect(service.processDue(userContext, { now: processingNow })).resolves.toEqual({
      recurringProcessed: 1,
      scheduledProcessed: 0,
      transactionsCreated: 1,
      skippedDuplicates: 0,
      errors: 1
    });
  });
});
