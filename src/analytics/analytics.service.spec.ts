import type { AccountRecord } from "../accounts/accounts.types";
import { AccountsRepository } from "../accounts/accounts.repository";
import type { UserContext } from "../core/user-context";
import { RecurringTransactionsRepository } from "../recurring-transactions/recurring-transactions.repository";
import { RECURRING_TRANSACTION_FREQUENCIES, RECURRING_TRANSACTION_STATUSES, type RecurringTransactionRecord } from "../recurring-transactions/recurring-transactions.types";
import { ScheduledTransactionsRepository } from "../scheduled-transactions/scheduled-transactions.repository";
import { SCHEDULED_TRANSACTION_STATUSES, type ScheduledTransactionRecord } from "../scheduled-transactions/scheduled-transactions.types";
import { TransactionsRepository } from "../transactions/transactions.repository";
import { TRANSACTION_SOURCES, TRANSACTION_TYPES, type TransactionRecord } from "../transactions/transactions.types";
import { AnalyticsService } from "./analytics.service";

interface RepositoryMocks {
  accounts: jest.Mocked<Pick<AccountsRepository, "list">>;
  transactions: jest.Mocked<Pick<TransactionsRepository, "list">>;
  recurring: jest.Mocked<Pick<RecurringTransactionsRepository, "list">>;
  scheduled: jest.Mocked<Pick<ScheduledTransactionsRepository, "list">>;
}

const userContext: UserContext = { userId: "user-1" };

const createAccount = (overrides: Partial<AccountRecord> = {}): AccountRecord => ({
  id: "account-1",
  userId: "user-1",
  name: "Checking",
  currency: "EUR",
  type: "bank",
  initialBalance: 1000,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const createTransaction = (overrides: Partial<TransactionRecord> = {}): TransactionRecord => ({
  id: "transaction-1",
  userId: "user-1",
  type: TRANSACTION_TYPES.EXPENSE,
  amount: 10,
  currency: "EUR",
  accountId: "account-1",
  categoryId: "category-1",
  date: "2026-01-10T00:00:00.000Z",
  source: TRANSACTION_SOURCES.MANUAL,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const createRecurring = (overrides: Partial<RecurringTransactionRecord> = {}): RecurringTransactionRecord => ({
  id: "recurring-1",
  userId: "user-1",
  type: TRANSACTION_TYPES.EXPENSE,
  amount: 30,
  currency: "EUR",
  accountId: "account-1",
  categoryId: "category-1",
  name: "Subscription",
  frequency: RECURRING_TRANSACTION_FREQUENCIES.MONTHLY,
  interval: 1,
  startDate: "2026-01-01T00:00:00.000Z",
  nextRunDate: "2026-02-01T00:00:00.000Z",
  status: RECURRING_TRANSACTION_STATUSES.ACTIVE,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const createScheduled = (overrides: Partial<ScheduledTransactionRecord> = {}): ScheduledTransactionRecord => ({
  id: "scheduled-1",
  userId: "user-1",
  type: TRANSACTION_TYPES.EXPENSE,
  amount: 80,
  currency: "EUR",
  accountId: "account-1",
  categoryId: "category-1",
  description: "Upcoming bill",
  scheduledDate: "2026-01-20T00:00:00.000Z",
  status: SCHEDULED_TRANSACTION_STATUSES.PENDING,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const createService = (): { service: AnalyticsService; mocks: RepositoryMocks } => {
  const mocks: RepositoryMocks = {
    accounts: { list: jest.fn() },
    transactions: { list: jest.fn() },
    recurring: { list: jest.fn() },
    scheduled: { list: jest.fn() }
  };

  mocks.accounts.list.mockResolvedValue([createAccount()]);
  mocks.transactions.list.mockResolvedValue([]);
  mocks.recurring.list.mockResolvedValue([]);
  mocks.scheduled.list.mockResolvedValue([]);

  return {
    service: new AnalyticsService(
      mocks.accounts as unknown as AccountsRepository,
      mocks.transactions as unknown as TransactionsRepository,
      mocks.recurring as unknown as RecurringTransactionsRepository,
      mocks.scheduled as unknown as ScheduledTransactionsRepository
    ),
    mocks
  };
};

describe("AnalyticsService", () => {
  it("summarizes overview totals and counts scoped to the caller", async () => {
    const { service, mocks } = createService();
    mocks.transactions.list.mockResolvedValue([
      createTransaction({ id: "expense", amount: 40 }),
      createTransaction({ id: "income", type: TRANSACTION_TYPES.INCOME, amount: 100 }),
      createTransaction({ id: "other-user", userId: "user-2", amount: 999 }),
      createTransaction({ id: "deleted", amount: 999, deletedAt: "2026-01-02T00:00:00.000Z" })
    ]);
    mocks.recurring.list.mockResolvedValue([createRecurring(), createRecurring({ id: "paused", status: RECURRING_TRANSACTION_STATUSES.PAUSED })]);
    mocks.scheduled.list.mockResolvedValue([createScheduled(), createScheduled({ id: "processed", status: SCHEDULED_TRANSACTION_STATUSES.PROCESSED })]);

    await expect(service.overview(userContext)).resolves.toEqual({
      income: 100,
      expense: 40,
      netCashflow: 60,
      transactionCount: 2,
      upcomingCount: 2,
      activeRecurringCount: 1
    });
  });

  it("calculates cashflow totals with date filters", async () => {
    const { service, mocks } = createService();
    mocks.transactions.list.mockResolvedValue([
      createTransaction({ id: "before", amount: 50, date: "2025-12-31T00:00:00.000Z" }),
      createTransaction({ id: "expense", amount: 25, date: "2026-01-05T00:00:00.000Z" }),
      createTransaction({ id: "income", type: TRANSACTION_TYPES.INCOME, amount: 125, date: "2026-01-06T00:00:00.000Z" })
    ]);

    await expect(service.cashflow(userContext, { from: "2026-01-01", to: "2026-01-31" })).resolves.toEqual({
      income: 125,
      expense: 25,
      net: 100,
      from: "2026-01-01",
      to: "2026-01-31"
    });
    expect(mocks.transactions.list).toHaveBeenCalledWith(userContext, { from: "2026-01-01", to: "2026-01-31", includeDeleted: false });
  });

  it("groups transaction totals by category and type", async () => {
    const { service, mocks } = createService();
    mocks.transactions.list.mockResolvedValue([
      createTransaction({ id: "groceries-1", categoryId: "groceries", amount: 20 }),
      createTransaction({ id: "groceries-2", categoryId: "groceries", amount: 30 }),
      createTransaction({ id: "salary", categoryId: "salary", type: TRANSACTION_TYPES.INCOME, amount: 1000 })
    ]);

    await expect(service.byCategory(userContext)).resolves.toEqual([
      { categoryId: "groceries", type: TRANSACTION_TYPES.EXPENSE, total: 50, transactionCount: 2 },
      { categoryId: "salary", type: TRANSACTION_TYPES.INCOME, total: 1000, transactionCount: 1 }
    ]);
  });

  it("groups transaction totals by account with account metadata", async () => {
    const { service, mocks } = createService();
    mocks.accounts.list.mockResolvedValue([createAccount(), createAccount({ id: "account-2", name: "Savings", currency: "USD" })]);
    mocks.transactions.list.mockResolvedValue([
      createTransaction({ id: "a1-expense", amount: 20, accountId: "account-1" }),
      createTransaction({ id: "a1-income", amount: 70, accountId: "account-1", type: TRANSACTION_TYPES.INCOME }),
      createTransaction({ id: "a2-expense", amount: 5, accountId: "account-2" })
    ]);

    await expect(service.byAccount(userContext)).resolves.toEqual([
      {
        accountId: "account-1",
        income: 70,
        expense: 20,
        net: 50,
        transactionCount: 2,
        account: { id: "account-1", name: "Checking", currency: "EUR", type: "bank" }
      },
      {
        accountId: "account-2",
        income: 0,
        expense: 5,
        net: -5,
        transactionCount: 1,
        account: { id: "account-2", name: "Savings", currency: "USD", type: "bank" }
      }
    ]);
  });

  it("buckets timeline by day", async () => {
    const { service, mocks } = createService();
    mocks.transactions.list.mockResolvedValue([
      createTransaction({ id: "expense-1", amount: 10, date: "2026-01-02T10:00:00.000Z" }),
      createTransaction({ id: "income-1", amount: 50, type: TRANSACTION_TYPES.INCOME, date: "2026-01-02T11:00:00.000Z" }),
      createTransaction({ id: "expense-2", amount: 5, date: "2026-01-03T10:00:00.000Z" })
    ]);

    await expect(service.timeline(userContext)).resolves.toEqual([
      { date: "2026-01-02", income: 50, expense: 10, net: 40, transactionCount: 2 },
      { date: "2026-01-03", income: 0, expense: 5, net: -5, transactionCount: 1 }
    ]);
  });

  it("returns top expenses and income with limit", async () => {
    const { service, mocks } = createService();
    mocks.transactions.list.mockResolvedValue([
      createTransaction({ id: "expense-low", amount: 10 }),
      createTransaction({ id: "expense-high", amount: 100 }),
      createTransaction({ id: "income-low", type: TRANSACTION_TYPES.INCOME, amount: 50 }),
      createTransaction({ id: "income-high", type: TRANSACTION_TYPES.INCOME, amount: 500 })
    ]);

    await expect(service.topExpenses(userContext, { limit: "1" })).resolves.toMatchObject([{ id: "expense-high" }]);
    await expect(service.topIncome(userContext, { limit: "1" })).resolves.toMatchObject([{ id: "income-high" }]);
  });

  it("combines pending scheduled and active recurring upcoming items sorted by due date", async () => {
    const { service, mocks } = createService();
    mocks.scheduled.list.mockResolvedValue([createScheduled({ id: "scheduled-later", scheduledDate: "2026-02-10T00:00:00.000Z" })]);
    mocks.recurring.list.mockResolvedValue([createRecurring({ id: "recurring-sooner", nextRunDate: "2026-02-01T00:00:00.000Z" })]);

    await expect(service.upcoming(userContext, { from: "2026-02-01", to: "2026-02-28" })).resolves.toMatchObject([
      { id: "recurring-sooner", source: "recurring", dueDate: "2026-02-01T00:00:00.000Z" },
      { id: "scheduled-later", source: "scheduled", dueDate: "2026-02-10T00:00:00.000Z" }
    ]);
  });

  it("summarizes active recurring impact as monthly-equivalent totals", async () => {
    const { service, mocks } = createService();
    mocks.recurring.list.mockResolvedValue([
      createRecurring({ id: "salary", type: TRANSACTION_TYPES.INCOME, amount: 3000, frequency: RECURRING_TRANSACTION_FREQUENCIES.MONTHLY }),
      createRecurring({ id: "weekly", amount: 70, frequency: RECURRING_TRANSACTION_FREQUENCIES.WEEKLY }),
      createRecurring({ id: "daily", amount: 2, frequency: RECURRING_TRANSACTION_FREQUENCIES.DAILY })
    ]);

    await expect(service.recurringImpact(userContext)).resolves.toMatchObject({
      income: 3000,
      expense: 360,
      net: 2640,
      basis: "monthly-equivalent"
    });
  });

  it("returns deterministic forecast output for an explicit date range", async () => {
    const { service, mocks } = createService();
    mocks.accounts.list.mockResolvedValue([createAccount({ initialBalance: 1000 })]);
    mocks.transactions.list.mockResolvedValue([
      createTransaction({ id: "spent", amount: 100 }),
      createTransaction({ id: "earned", amount: 300, type: TRANSACTION_TYPES.INCOME })
    ]);
    mocks.scheduled.list.mockResolvedValue([createScheduled({ id: "bill", amount: 50, scheduledDate: "2026-02-05T00:00:00.000Z" })]);
    mocks.recurring.list.mockResolvedValue([createRecurring({ id: "paycheck", type: TRANSACTION_TYPES.INCOME, amount: 200, nextRunDate: "2026-02-10T00:00:00.000Z" })]);

    await expect(service.forecast(userContext, { from: "2026-02-01", to: "2026-02-28" })).resolves.toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
      openingBalance: 1200,
      upcomingIncome: 200,
      upcomingExpense: 50,
      forecastBalance: 1350,
      accounts: [
        {
          accountId: "account-1",
          name: "Checking",
          currency: "EUR",
          openingBalance: 1200,
          upcomingIncome: 200,
          upcomingExpense: 50,
          forecastBalance: 1350
        }
      ]
    });
  });
});
