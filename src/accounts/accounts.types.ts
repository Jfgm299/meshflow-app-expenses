export const ACCOUNTS_COLLECTION = "accounts" as const;
export const DEFAULT_ACCOUNT_CURRENCY = "EUR" as const;

export interface AccountRecord {
  id: string;
  userId: string;
  name: string;
  currency: string;
  type?: string;
  initialBalance?: number;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateAccountDto {
  name: string;
  currency?: string;
  type?: string;
  initialBalance?: number;
  isArchived?: boolean;
}

export interface UpdateAccountDto {
  name?: string;
  currency?: string;
  type?: string;
  initialBalance?: number;
  isArchived?: boolean;
}

export interface CreateAccountRecordInput {
  userId: string;
  name: string;
  currency: string;
  type?: string;
  initialBalance?: number;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAccountRecordInput {
  name?: string;
  currency?: string;
  type?: string;
  initialBalance?: number;
  isArchived?: boolean;
  updatedAt: string;
}

export interface SoftDeleteAccountRecordInput {
  updatedAt: string;
  deletedAt: string;
}
