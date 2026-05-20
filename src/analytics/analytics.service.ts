import { BadRequestException, Injectable } from "@nestjs/common";
import { AccountsRepository } from "../accounts/accounts.repository";
import type { AccountRecord } from "../accounts/accounts.types";
import type { UserContext } from "../core/user-context";
import { RECURRING_TRANSACTION_FREQUENCIES, RECURRING_TRANSACTION_STATUSES, type RecurringTransactionRecord } from "../recurring-transactions/recurring-transactions.types";
import { SCHEDULED_TRANSACTION_STATUSES, type ScheduledTransactionRecord } from "../scheduled-transactions/scheduled-transactions.types";
import { ScheduledTransactionsRepository } from "../scheduled-transactions/scheduled-transactions.repository";
import { TransactionsRepository } from "../transactions/transactions.repository";
import { TRANSACTION_TYPES, type TransactionRecord } from "../transactions/transactions.types";
import { RecurringTransactionsRepository } from "../recurring-transactions/recurring-transactions.repository";
import type {
  AnalyticsAccountGroup,
  AnalyticsCashflow,
  AnalyticsCategoryGroup,
  AnalyticsDataSet,
  AnalyticsDateRangeQuery,
  AnalyticsForecast,
  AnalyticsForecastAccount,
  AnalyticsForecastQuery,
  AnalyticsOverview,
  AnalyticsRecurringImpact,
  AnalyticsRecurringImpactItem,
  AnalyticsTimelineBucket,
  AnalyticsTopQuery,
  AnalyticsUpcomingItem
} from "./analytics.types";

const DEFAULT_TOP_LIMIT = 10;
const DEFAULT_FORECAST_HORIZON_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const isDateOnly = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/u.test(value);

const parseDateText = (value: string, fieldName: string): string => {
  if (Number.isNaN(Date.parse(value))) {
    throw new BadRequestException(`Analytics ${fieldName} must be a valid date`);
  }

  return value;
};

const parseOptionalDateText = (value: string | undefined, fieldName: string): string | undefined => (value === undefined ? undefined : parseDateText(value, fieldName));

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

const parseRange = (query: AnalyticsDateRangeQuery): AnalyticsDateRangeQuery => ({
  from: parseOptionalDateText(query.from, "from filter"),
  to: parseOptionalDateText(query.to, "to filter")
});

const isInRange = (dateText: string, range: AnalyticsDateRangeQuery): boolean => {
  const time = Date.parse(dateText);
  const fromTime = getFromTime(range.from);
  const toTime = getToTime(range.to);

  return (fromTime === undefined || time >= fromTime) && (toTime === undefined || time <= toTime);
};

const parseLimit = (value: unknown): number => {
  if (value === undefined) {
    return DEFAULT_TOP_LIMIT;
  }

  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  throw new BadRequestException("Analytics limit must be a positive integer");
};

const parseHorizonDays = (value: unknown): number => {
  if (value === undefined) {
    return DEFAULT_FORECAST_HORIZON_DAYS;
  }

  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  throw new BadRequestException("Analytics horizonDays must be a positive integer");
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const addToTotals = (totals: AnalyticsCashflow, transaction: TransactionRecord): AnalyticsCashflow => {
  if (transaction.type === TRANSACTION_TYPES.INCOME) {
    totals.income += transaction.amount;
  } else {
    totals.expense += transaction.amount;
  }

  totals.net = totals.income - totals.expense;
  return totals;
};

const getDateBucket = (dateText: string): string => dateText.slice(0, 10);

const byDateThenSource = (left: AnalyticsUpcomingItem, right: AnalyticsUpcomingItem): number => {
  const dateOrder = Date.parse(left.dueDate) - Date.parse(right.dueDate);
  return dateOrder === 0 ? left.source.localeCompare(right.source) || left.id.localeCompare(right.id) : dateOrder;
};

const getMonthlyEquivalent = (definition: RecurringTransactionRecord): number => {
  const interval = definition.interval ?? 1;

  if (definition.frequency === RECURRING_TRANSACTION_FREQUENCIES.DAILY) {
    return definition.amount * (30 / interval);
  }

  if (definition.frequency === RECURRING_TRANSACTION_FREQUENCIES.WEEKLY) {
    return definition.amount * (30 / (7 * interval));
  }

  return definition.amount / interval;
};

const addInterval = (date: Date, definition: RecurringTransactionRecord): Date => {
  const result = new Date(date.getTime());
  const interval = definition.interval ?? 1;

  if (definition.frequency === RECURRING_TRANSACTION_FREQUENCIES.DAILY) {
    result.setUTCDate(result.getUTCDate() + interval);
    return result;
  }

  if (definition.frequency === RECURRING_TRANSACTION_FREQUENCIES.WEEKLY) {
    result.setUTCDate(result.getUTCDate() + interval * 7);
    return result;
  }

  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + interval);
  const lastDayOfTargetMonth = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly accountsRepository: AccountsRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly recurringTransactionsRepository: RecurringTransactionsRepository,
    private readonly scheduledTransactionsRepository: ScheduledTransactionsRepository
  ) {}

  async overview(userContext: UserContext): Promise<AnalyticsOverview> {
    const dataSet = await this.loadDataSet(userContext, {});
    const cashflow = this.calculateCashflow(dataSet.transactions, {});

    return {
      income: cashflow.income,
      expense: cashflow.expense,
      netCashflow: cashflow.net,
      transactionCount: dataSet.transactions.length,
      upcomingCount: this.getUpcomingItems(dataSet.scheduled, dataSet.recurring, {}).length,
      activeRecurringCount: dataSet.recurring.length
    };
  }

  async cashflow(userContext: UserContext, query: AnalyticsDateRangeQuery = {}): Promise<AnalyticsCashflow> {
    const range = parseRange(query);
    const transactions = await this.loadTransactions(userContext, range);
    return this.calculateCashflow(transactions, range);
  }

  async byCategory(userContext: UserContext, query: AnalyticsDateRangeQuery = {}): Promise<AnalyticsCategoryGroup[]> {
    const range = parseRange(query);
    const transactions = await this.loadTransactions(userContext, range);
    const groups = new Map<string, AnalyticsCategoryGroup>();

    for (const transaction of transactions) {
      const key = `${transaction.categoryId ?? "uncategorized"}:${transaction.type}`;
      const group = groups.get(key) ?? { categoryId: transaction.categoryId, type: transaction.type, total: 0, transactionCount: 0 };
      group.total += transaction.amount;
      group.transactionCount += 1;
      groups.set(key, group);
    }

    return [...groups.values()].sort((left, right) => (left.categoryId ?? "").localeCompare(right.categoryId ?? "") || left.type.localeCompare(right.type));
  }

  async byAccount(userContext: UserContext, query: AnalyticsDateRangeQuery = {}): Promise<AnalyticsAccountGroup[]> {
    const range = parseRange(query);
    const [accounts, transactions] = await Promise.all([this.loadAccounts(userContext), this.loadTransactions(userContext, range)]);
    const accountsById = new Map(accounts.map((account) => [account.id, account]));
    const groups = new Map<string, AnalyticsAccountGroup>();

    for (const transaction of transactions) {
      const account = accountsById.get(transaction.accountId);
      const group = groups.get(transaction.accountId) ?? {
        accountId: transaction.accountId,
        income: 0,
        expense: 0,
        net: 0,
        transactionCount: 0,
        account: account === undefined ? undefined : { id: account.id, name: account.name, currency: account.currency, type: account.type }
      };
      if (transaction.type === TRANSACTION_TYPES.INCOME) {
        group.income += transaction.amount;
      } else {
        group.expense += transaction.amount;
      }
      group.net = group.income - group.expense;
      group.transactionCount += 1;
      groups.set(transaction.accountId, group);
    }

    return [...groups.values()].sort((left, right) => left.accountId.localeCompare(right.accountId));
  }

  async timeline(userContext: UserContext, query: AnalyticsDateRangeQuery = {}): Promise<AnalyticsTimelineBucket[]> {
    const range = parseRange(query);
    const transactions = await this.loadTransactions(userContext, range);
    const buckets = new Map<string, AnalyticsTimelineBucket>();

    for (const transaction of transactions) {
      const date = getDateBucket(transaction.date);
      const bucket = buckets.get(date) ?? { date, income: 0, expense: 0, net: 0, transactionCount: 0 };
      if (transaction.type === TRANSACTION_TYPES.INCOME) {
        bucket.income += transaction.amount;
      } else {
        bucket.expense += transaction.amount;
      }
      bucket.net = bucket.income - bucket.expense;
      bucket.transactionCount += 1;
      buckets.set(date, bucket);
    }

    return [...buckets.values()].sort((left, right) => left.date.localeCompare(right.date));
  }

  async topExpenses(userContext: UserContext, query: AnalyticsTopQuery = {}): Promise<TransactionRecord[]> {
    return this.topTransactions(userContext, TRANSACTION_TYPES.EXPENSE, query);
  }

  async topIncome(userContext: UserContext, query: AnalyticsTopQuery = {}): Promise<TransactionRecord[]> {
    return this.topTransactions(userContext, TRANSACTION_TYPES.INCOME, query);
  }

  async upcoming(userContext: UserContext, query: AnalyticsDateRangeQuery = {}): Promise<AnalyticsUpcomingItem[]> {
    const range = parseRange(query);
    const [scheduled, recurring] = await Promise.all([this.loadScheduled(userContext, range), this.loadRecurring(userContext)]);
    return this.getUpcomingItems(scheduled, recurring, range);
  }

  async recurringImpact(userContext: UserContext): Promise<AnalyticsRecurringImpact> {
    const recurring = await this.loadRecurring(userContext);
    const items = recurring.map<AnalyticsRecurringImpactItem>((definition) => ({
      id: definition.id,
      type: definition.type,
      amount: definition.amount,
      currency: definition.currency,
      frequency: definition.frequency,
      interval: definition.interval ?? 1,
      monthlyEquivalent: roundMoney(getMonthlyEquivalent(definition))
    }));

    const income = roundMoney(items.filter((item) => item.type === TRANSACTION_TYPES.INCOME).reduce((total, item) => total + item.monthlyEquivalent, 0));
    const expense = roundMoney(items.filter((item) => item.type === TRANSACTION_TYPES.EXPENSE).reduce((total, item) => total + item.monthlyEquivalent, 0));

    return { income, expense, net: roundMoney(income - expense), basis: "monthly-equivalent", items };
  }

  async forecast(userContext: UserContext, query: AnalyticsForecastQuery = {}): Promise<AnalyticsForecast> {
    const now = new Date();
    const from = parseOptionalDateText(query.from, "from filter") ?? now.toISOString();
    const to = parseOptionalDateText(query.to, "to filter") ?? new Date(Date.parse(from) + parseHorizonDays(query.horizonDays) * MILLISECONDS_PER_DAY).toISOString();
    const range = { from, to };
    const dataSet = await this.loadDataSet(userContext, {});
    const upcomingItems = this.getUpcomingItems(dataSet.scheduled, dataSet.recurring, range);
    const accounts = this.buildForecastAccounts(dataSet.accounts, dataSet.transactions, upcomingItems);
    const openingBalance = roundMoney(accounts.reduce((total, account) => total + account.openingBalance, 0));
    const upcomingIncome = roundMoney(accounts.reduce((total, account) => total + account.upcomingIncome, 0));
    const upcomingExpense = roundMoney(accounts.reduce((total, account) => total + account.upcomingExpense, 0));

    return { from, to, openingBalance, upcomingIncome, upcomingExpense, forecastBalance: roundMoney(openingBalance + upcomingIncome - upcomingExpense), accounts };
  }

  private async topTransactions(userContext: UserContext, type: typeof TRANSACTION_TYPES.EXPENSE | typeof TRANSACTION_TYPES.INCOME, query: AnalyticsTopQuery): Promise<TransactionRecord[]> {
    const range = parseRange(query);
    const limit = parseLimit(query.limit);
    const transactions = await this.loadTransactions(userContext, range);

    return transactions
      .filter((transaction) => transaction.type === type)
      .sort((left, right) => right.amount - left.amount || left.date.localeCompare(right.date) || left.id.localeCompare(right.id))
      .slice(0, limit);
  }

  private calculateCashflow(transactions: TransactionRecord[], range: AnalyticsDateRangeQuery): AnalyticsCashflow {
    const totals = transactions.reduce(addToTotals, { income: 0, expense: 0, net: 0, from: range.from, to: range.to });
    return { ...totals, income: roundMoney(totals.income), expense: roundMoney(totals.expense), net: roundMoney(totals.net) };
  }

  private async loadDataSet(userContext: UserContext, range: AnalyticsDateRangeQuery): Promise<AnalyticsDataSet> {
    const [accounts, transactions, recurring, scheduled] = await Promise.all([
      this.loadAccounts(userContext),
      this.loadTransactions(userContext, range),
      this.loadRecurring(userContext),
      this.loadScheduled(userContext, range)
    ]);

    return { accounts, transactions, recurring, scheduled };
  }

  private async loadAccounts(userContext: UserContext): Promise<AccountRecord[]> {
    const accounts = await this.accountsRepository.list(userContext);
    return accounts.filter((account) => account.userId === userContext.userId && account.deletedAt === undefined);
  }

  private async loadTransactions(userContext: UserContext, range: AnalyticsDateRangeQuery): Promise<TransactionRecord[]> {
    const transactions = await this.transactionsRepository.list(userContext, { from: range.from, to: range.to, includeDeleted: false });
    return transactions.filter((transaction) => transaction.userId === userContext.userId && transaction.deletedAt === undefined && isInRange(transaction.date, range));
  }

  private async loadRecurring(userContext: UserContext): Promise<RecurringTransactionRecord[]> {
    const recurring = await this.recurringTransactionsRepository.list(userContext, { status: RECURRING_TRANSACTION_STATUSES.ACTIVE });
    return recurring.filter((definition) => definition.userId === userContext.userId && definition.deletedAt === undefined && definition.status === RECURRING_TRANSACTION_STATUSES.ACTIVE);
  }

  private async loadScheduled(userContext: UserContext, range: AnalyticsDateRangeQuery): Promise<ScheduledTransactionRecord[]> {
    const scheduled = await this.scheduledTransactionsRepository.list(userContext, { status: SCHEDULED_TRANSACTION_STATUSES.PENDING, from: range.from, to: range.to });
    return scheduled.filter(
      (definition) =>
        definition.userId === userContext.userId &&
        definition.deletedAt === undefined &&
        definition.status === SCHEDULED_TRANSACTION_STATUSES.PENDING &&
        isInRange(definition.scheduledDate, range)
    );
  }

  private getUpcomingItems(scheduled: ScheduledTransactionRecord[], recurring: RecurringTransactionRecord[], range: AnalyticsDateRangeQuery): AnalyticsUpcomingItem[] {
    const scheduledItems = scheduled.filter((definition) => isInRange(definition.scheduledDate, range)).map<AnalyticsUpcomingItem>((definition) => ({
      id: definition.id,
      source: "scheduled",
      type: definition.type,
      amount: definition.amount,
      currency: definition.currency,
      accountId: definition.accountId,
      categoryId: definition.categoryId,
      description: definition.description,
      dueDate: definition.scheduledDate
    }));

    const recurringItems = recurring.flatMap((definition) => this.getRecurringOccurrences(definition, range));
    return [...scheduledItems, ...recurringItems].sort(byDateThenSource);
  }

  private getRecurringOccurrences(definition: RecurringTransactionRecord, range: AnalyticsDateRangeQuery): AnalyticsUpcomingItem[] {
    if (range.from === undefined && range.to === undefined) {
      return [this.createRecurringUpcomingItem(definition, new Date(definition.nextRunDate))];
    }

    const fromTime = getFromTime(range.from) ?? Number.NEGATIVE_INFINITY;
    const toTime = getToTime(range.to) ?? Number.POSITIVE_INFINITY;
    const endTime = definition.endDate === undefined ? Number.POSITIVE_INFINITY : getToTime(definition.endDate) ?? Number.POSITIVE_INFINITY;
    const maxTime = Math.min(toTime, endTime);
    const occurrences: AnalyticsUpcomingItem[] = [];
    let occurrence = new Date(definition.nextRunDate);

    while (occurrences.length < 366 && occurrence.getTime() <= maxTime) {
      if (occurrence.getTime() >= fromTime) {
        occurrences.push(this.createRecurringUpcomingItem(definition, occurrence));
      }

      occurrence = addInterval(occurrence, definition);
    }

    return occurrences;
  }

  private createRecurringUpcomingItem(definition: RecurringTransactionRecord, occurrence: Date): AnalyticsUpcomingItem {
    return {
      id: definition.id,
      source: "recurring",
      type: definition.type,
      amount: definition.amount,
      currency: definition.currency,
      accountId: definition.accountId,
      categoryId: definition.categoryId,
      description: definition.description,
      name: definition.name,
      dueDate: occurrence.toISOString()
    };
  }

  private buildForecastAccounts(accounts: AccountRecord[], transactions: TransactionRecord[], upcomingItems: AnalyticsUpcomingItem[]): AnalyticsForecastAccount[] {
    return accounts
      .map((account) => {
        const openingBalance = roundMoney(
          (account.initialBalance ?? 0) +
            transactions
              .filter((transaction) => transaction.accountId === account.id)
              .reduce((total, transaction) => total + (transaction.type === TRANSACTION_TYPES.INCOME ? transaction.amount : -transaction.amount), 0)
        );
        const upcomingIncome = roundMoney(
          upcomingItems.filter((item) => item.accountId === account.id && item.type === TRANSACTION_TYPES.INCOME).reduce((total, item) => total + item.amount, 0)
        );
        const upcomingExpense = roundMoney(
          upcomingItems.filter((item) => item.accountId === account.id && item.type === TRANSACTION_TYPES.EXPENSE).reduce((total, item) => total + item.amount, 0)
        );

        return {
          accountId: account.id,
          name: account.name,
          currency: account.currency,
          openingBalance,
          upcomingIncome,
          upcomingExpense,
          forecastBalance: roundMoney(openingBalance + upcomingIncome - upcomingExpense)
        };
      })
      .sort((left, right) => left.accountId.localeCompare(right.accountId));
  }
}
