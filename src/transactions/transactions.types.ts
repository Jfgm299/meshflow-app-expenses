export const TRANSACTIONS_COLLECTION = "transactions" as const;

export const TRANSACTION_TYPES = {
  INCOME: "income",
  EXPENSE: "expense"
} as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

export const TRANSACTION_SOURCES = {
  MANUAL: "manual",
  RECURRING: "recurring",
  SCHEDULED: "scheduled"
} as const;

export type TransactionSource = (typeof TRANSACTION_SOURCES)[keyof typeof TRANSACTION_SOURCES];

export interface TransactionRecord {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  accountId: string;
  categoryId?: string;
  date: string;
  description?: string;
  notes?: string;
  source?: TransactionSource;
  sourceId?: string;
  sourceOccurrenceDate?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateTransactionDto {
  type: unknown;
  amount: unknown;
  currency?: unknown;
  accountId: string;
  categoryId?: string;
  date: string;
  description?: string;
  notes?: string;
}

export interface UpdateTransactionDto {
  type?: unknown;
  amount?: unknown;
  currency?: unknown;
  accountId?: string;
  categoryId?: string;
  date?: string;
  description?: string;
  notes?: string;
}

export interface ListTransactionsQuery {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: unknown;
  includeDeleted?: unknown;
}

export interface NormalizedListTransactionsFilter {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  includeDeleted: boolean;
}

export interface CreateTransactionRecordInput {
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  accountId: string;
  categoryId?: string;
  date: string;
  description?: string;
  notes?: string;
  source: TransactionSource;
  sourceId?: string;
  sourceOccurrenceDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTransactionRecordInput {
  type?: TransactionType;
  amount?: number;
  currency?: string;
  accountId?: string;
  categoryId?: string;
  date?: string;
  description?: string;
  notes?: string;
  updatedAt: string;
}

export interface SoftDeleteTransactionRecordInput {
  updatedAt: string;
  deletedAt: string;
}
