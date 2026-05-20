import { Injectable } from "@nestjs/common";
import { CoreStorageClient } from "../core/core-storage.client";
import type { UserContext } from "../core/user-context";
import {
  RECURRING_TRANSACTIONS_COLLECTION,
  type CreateRecurringTransactionRecordInput,
  type NormalizedListRecurringTransactionsFilter,
  type RecurringTransactionRecord,
  type SoftDeleteRecurringTransactionRecordInput,
  type UpdateRecurringTransactionRecordInput
} from "./recurring-transactions.types";

@Injectable()
export class RecurringTransactionsRepository {
  constructor(private readonly storageClient: CoreStorageClient) {}

  list(userContext: UserContext, filter: NormalizedListRecurringTransactionsFilter): Promise<RecurringTransactionRecord[]> {
    return this.storageClient.collection(RECURRING_TRANSACTIONS_COLLECTION, userContext).request<RecurringTransactionRecord[]>({
      method: "GET",
      path: "records",
      searchParams: {
        includeDeleted: "false",
        type: filter.type,
        status: filter.status
      }
    });
  }

  create(userContext: UserContext, input: CreateRecurringTransactionRecordInput): Promise<RecurringTransactionRecord> {
    return this.storageClient.collection(RECURRING_TRANSACTIONS_COLLECTION, userContext).request<RecurringTransactionRecord>({
      method: "POST",
      path: "records",
      body: input
    });
  }

  read(userContext: UserContext, recurringTransactionId: string): Promise<RecurringTransactionRecord> {
    return this.storageClient.collection(RECURRING_TRANSACTIONS_COLLECTION, userContext).request<RecurringTransactionRecord>({
      method: "GET",
      path: `records/${encodeURIComponent(recurringTransactionId)}`,
      searchParams: {
        includeDeleted: "false"
      }
    });
  }

  update(userContext: UserContext, recurringTransactionId: string, input: UpdateRecurringTransactionRecordInput): Promise<RecurringTransactionRecord> {
    return this.storageClient.collection(RECURRING_TRANSACTIONS_COLLECTION, userContext).request<RecurringTransactionRecord>({
      method: "PATCH",
      path: `records/${encodeURIComponent(recurringTransactionId)}`,
      searchParams: {
        includeDeleted: "false"
      },
      body: input
    });
  }

  softDelete(userContext: UserContext, recurringTransactionId: string, input: SoftDeleteRecurringTransactionRecordInput): Promise<RecurringTransactionRecord> {
    return this.storageClient.collection(RECURRING_TRANSACTIONS_COLLECTION, userContext).request<RecurringTransactionRecord>({
      method: "PATCH",
      path: `records/${encodeURIComponent(recurringTransactionId)}`,
      searchParams: {
        includeDeleted: "false"
      },
      body: input
    });
  }
}
