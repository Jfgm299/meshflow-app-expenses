import type { AccountRecord } from "../accounts/accounts.types";
import type { RecurringTransactionFrequency, RecurringTransactionRecord, RecurringTransactionType } from "../recurring-transactions/recurring-transactions.types";
import type { ScheduledTransactionRecord, ScheduledTransactionType } from "../scheduled-transactions/scheduled-transactions.types";
import type { TransactionRecord, TransactionType } from "../transactions/transactions.types";

export interface AnalyticsDateRangeQuery {
  from?: string;
  to?: string;
}

export interface AnalyticsTopQuery extends AnalyticsDateRangeQuery {
  limit?: unknown;
}

export interface AnalyticsForecastQuery extends AnalyticsDateRangeQuery {
  horizonDays?: unknown;
}

export interface AnalyticsOverview {
  income: number;
  expense: number;
  netCashflow: number;
  transactionCount: number;
  upcomingCount: number;
  activeRecurringCount: number;
}

export interface AnalyticsCashflow {
  income: number;
  expense: number;
  net: number;
  from?: string;
  to?: string;
}

export interface AnalyticsCategoryGroup {
  categoryId?: string;
  type: TransactionType;
  total: number;
  transactionCount: number;
}

export interface AnalyticsAccountMetadata {
  id: string;
  name: string;
  currency: string;
  type?: string;
}

export interface AnalyticsAccountGroup {
  accountId: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
  account?: AnalyticsAccountMetadata;
}

export interface AnalyticsTimelineBucket {
  date: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
}

export interface AnalyticsUpcomingItem {
  id: string;
  source: "scheduled" | "recurring";
  type: ScheduledTransactionType | RecurringTransactionType;
  amount: number;
  currency: string;
  accountId: string;
  categoryId?: string;
  description?: string;
  name?: string;
  dueDate: string;
}

export interface AnalyticsRecurringImpactItem {
  id: string;
  type: RecurringTransactionType;
  amount: number;
  currency: string;
  frequency: RecurringTransactionFrequency;
  interval: number;
  monthlyEquivalent: number;
}

export interface AnalyticsRecurringImpact {
  income: number;
  expense: number;
  net: number;
  basis: "monthly-equivalent";
  items: AnalyticsRecurringImpactItem[];
}

export interface AnalyticsForecastAccount {
  accountId: string;
  name: string;
  currency: string;
  openingBalance: number;
  upcomingIncome: number;
  upcomingExpense: number;
  forecastBalance: number;
}

export interface AnalyticsForecast {
  from: string;
  to: string;
  openingBalance: number;
  upcomingIncome: number;
  upcomingExpense: number;
  forecastBalance: number;
  accounts: AnalyticsForecastAccount[];
}

export interface AnalyticsDataSet {
  accounts: AccountRecord[];
  transactions: TransactionRecord[];
  recurring: RecurringTransactionRecord[];
  scheduled: ScheduledTransactionRecord[];
}
