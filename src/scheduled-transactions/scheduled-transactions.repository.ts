import { Injectable } from "@nestjs/common";
import { CoreStorageClient } from "../core/core-storage.client";
import type { UserContext } from "../core/user-context";
import {
  SCHEDULED_TRANSACTIONS_COLLECTION,
  type CreateScheduledTransactionRecordInput,
  type NormalizedListScheduledTransactionsFilter,
  type ScheduledTransactionRecord,
  type SoftDeleteScheduledTransactionRecordInput,
  type UpdateScheduledTransactionRecordInput
} from "./scheduled-transactions.types";

@Injectable()
export class ScheduledTransactionsRepository {
  constructor(private readonly storageClient: CoreStorageClient) {}

  list(userContext: UserContext, filter: NormalizedListScheduledTransactionsFilter): Promise<ScheduledTransactionRecord[]> {
    return this.storageClient.collection(SCHEDULED_TRANSACTIONS_COLLECTION, userContext).request<ScheduledTransactionRecord[]>({
      method: "GET",
      path: "records",
      searchParams: {
        includeDeleted: "false",
        type: filter.type,
        status: filter.status,
        from: filter.from,
        to: filter.to
      }
    });
  }

  create(userContext: UserContext, input: CreateScheduledTransactionRecordInput): Promise<ScheduledTransactionRecord> {
    return this.storageClient.collection(SCHEDULED_TRANSACTIONS_COLLECTION, userContext).request<ScheduledTransactionRecord>({
      method: "POST",
      path: "records",
      body: input
    });
  }

  read(userContext: UserContext, scheduledTransactionId: string): Promise<ScheduledTransactionRecord> {
    return this.storageClient.collection(SCHEDULED_TRANSACTIONS_COLLECTION, userContext).request<ScheduledTransactionRecord>({
      method: "GET",
      path: `records/${encodeURIComponent(scheduledTransactionId)}`,
      searchParams: {
        includeDeleted: "false"
      }
    });
  }

  update(userContext: UserContext, scheduledTransactionId: string, input: UpdateScheduledTransactionRecordInput): Promise<ScheduledTransactionRecord> {
    return this.storageClient.collection(SCHEDULED_TRANSACTIONS_COLLECTION, userContext).request<ScheduledTransactionRecord>({
      method: "PATCH",
      path: `records/${encodeURIComponent(scheduledTransactionId)}`,
      searchParams: {
        includeDeleted: "false"
      },
      body: input
    });
  }

  softDelete(userContext: UserContext, scheduledTransactionId: string, input: SoftDeleteScheduledTransactionRecordInput): Promise<ScheduledTransactionRecord> {
    return this.storageClient.collection(SCHEDULED_TRANSACTIONS_COLLECTION, userContext).request<ScheduledTransactionRecord>({
      method: "PATCH",
      path: `records/${encodeURIComponent(scheduledTransactionId)}`,
      searchParams: {
        includeDeleted: "false"
      },
      body: input
    });
  }
}
