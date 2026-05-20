export const RECURRING_TRANSACTIONS_COLLECTION = "recurring-transactions" as const;

export const RECURRING_TRANSACTION_TYPES = {
  INCOME: "income",
  EXPENSE: "expense"
} as const;

export type RecurringTransactionType = (typeof RECURRING_TRANSACTION_TYPES)[keyof typeof RECURRING_TRANSACTION_TYPES];

export const RECURRING_TRANSACTION_FREQUENCIES = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly"
} as const;

export type RecurringTransactionFrequency = (typeof RECURRING_TRANSACTION_FREQUENCIES)[keyof typeof RECURRING_TRANSACTION_FREQUENCIES];

export const RECURRING_TRANSACTION_STATUSES = {
  ACTIVE: "active",
  PAUSED: "paused",
  CANCELLED: "cancelled"
} as const;

export type RecurringTransactionStatus = (typeof RECURRING_TRANSACTION_STATUSES)[keyof typeof RECURRING_TRANSACTION_STATUSES];

export interface RecurringTransactionRecord {
  id: string;
  userId: string;
  type: RecurringTransactionType;
  amount: number;
  currency: string;
  accountId: string;
  categoryId?: string;
  name: string;
  description?: string;
  notes?: string;
  frequency: RecurringTransactionFrequency;
  interval?: number;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  lastRunDate?: string;
  status: RecurringTransactionStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateRecurringTransactionDto {
  type: unknown;
  amount: unknown;
  currency: unknown;
  accountId: unknown;
  categoryId?: unknown;
  name: unknown;
  description?: unknown;
  notes?: unknown;
  frequency: unknown;
  interval?: unknown;
  startDate: unknown;
  endDate?: unknown;
  status?: unknown;
}

export interface UpdateRecurringTransactionDto {
  type?: unknown;
  amount?: unknown;
  currency?: unknown;
  accountId?: unknown;
  categoryId?: unknown;
  name?: unknown;
  description?: unknown;
  notes?: unknown;
  frequency?: unknown;
  interval?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  nextRunDate?: unknown;
  lastRunDate?: unknown;
  status?: unknown;
}

export interface ListRecurringTransactionsQuery {
  type?: unknown;
  status?: unknown;
}

export interface NormalizedListRecurringTransactionsFilter {
  type?: RecurringTransactionType;
  status?: RecurringTransactionStatus;
}

export interface CreateRecurringTransactionRecordInput {
  userId: string;
  type: RecurringTransactionType;
  amount: number;
  currency: string;
  accountId: string;
  categoryId?: string;
  name: string;
  description?: string;
  notes?: string;
  frequency: RecurringTransactionFrequency;
  interval?: number;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  status: RecurringTransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateRecurringTransactionRecordInput {
  type?: RecurringTransactionType;
  amount?: number;
  currency?: string;
  accountId?: string;
  categoryId?: string;
  name?: string;
  description?: string;
  notes?: string;
  frequency?: RecurringTransactionFrequency;
  interval?: number;
  startDate?: string;
  endDate?: string;
  nextRunDate?: string;
  lastRunDate?: string;
  status?: RecurringTransactionStatus;
  updatedAt: string;
}

export interface SoftDeleteRecurringTransactionRecordInput {
  updatedAt: string;
  deletedAt: string;
}
