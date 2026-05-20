export const SCHEDULED_TRANSACTIONS_COLLECTION = "scheduled-transactions" as const;

export const SCHEDULED_TRANSACTION_TYPES = {
  INCOME: "income",
  EXPENSE: "expense"
} as const;

export type ScheduledTransactionType = (typeof SCHEDULED_TRANSACTION_TYPES)[keyof typeof SCHEDULED_TRANSACTION_TYPES];

export const SCHEDULED_TRANSACTION_STATUSES = {
  PENDING: "pending",
  PROCESSED: "processed",
  CANCELLED: "cancelled"
} as const;

export type ScheduledTransactionStatus = (typeof SCHEDULED_TRANSACTION_STATUSES)[keyof typeof SCHEDULED_TRANSACTION_STATUSES];

export interface ScheduledTransactionRecord {
  id: string;
  userId: string;
  type: ScheduledTransactionType;
  amount: number;
  currency: string;
  accountId: string;
  categoryId?: string;
  description?: string;
  scheduledDate: string;
  status: ScheduledTransactionStatus;
  processedTransactionId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateScheduledTransactionDto {
  type: unknown;
  amount: unknown;
  currency: unknown;
  accountId: unknown;
  categoryId?: unknown;
  description?: unknown;
  scheduledDate: unknown;
  status?: unknown;
  processedTransactionId?: unknown;
}

export interface UpdateScheduledTransactionDto {
  type?: unknown;
  amount?: unknown;
  currency?: unknown;
  accountId?: unknown;
  categoryId?: unknown;
  description?: unknown;
  scheduledDate?: unknown;
  status?: unknown;
  processedTransactionId?: unknown;
}

export interface ListScheduledTransactionsQuery {
  type?: unknown;
  status?: unknown;
  from?: unknown;
  to?: unknown;
}

export interface NormalizedListScheduledTransactionsFilter {
  type?: ScheduledTransactionType;
  status?: ScheduledTransactionStatus;
  from?: string;
  to?: string;
}

export interface CreateScheduledTransactionRecordInput {
  userId: string;
  type: ScheduledTransactionType;
  amount: number;
  currency: string;
  accountId: string;
  categoryId?: string;
  description?: string;
  scheduledDate: string;
  status: ScheduledTransactionStatus;
  processedTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateScheduledTransactionRecordInput {
  type?: ScheduledTransactionType;
  amount?: number;
  currency?: string;
  accountId?: string;
  categoryId?: string;
  description?: string;
  scheduledDate?: string;
  status?: ScheduledTransactionStatus;
  processedTransactionId?: string;
  updatedAt: string;
}

export interface SoftDeleteScheduledTransactionRecordInput {
  updatedAt: string;
  deletedAt: string;
}
