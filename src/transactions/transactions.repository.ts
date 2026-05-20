import { Injectable } from "@nestjs/common";
import { CoreStorageClient } from "../core/core-storage.client";
import type { UserContext } from "../core/user-context";
import {
  TRANSACTIONS_COLLECTION,
  type CreateTransactionRecordInput,
  type NormalizedListTransactionsFilter,
  type SoftDeleteTransactionRecordInput,
  type TransactionRecord,
  type UpdateTransactionRecordInput
} from "./transactions.types";

@Injectable()
export class TransactionsRepository {
  constructor(private readonly storageClient: CoreStorageClient) {}

  list(userContext: UserContext, filter: NormalizedListTransactionsFilter): Promise<TransactionRecord[]> {
    return this.storageClient.collection(TRANSACTIONS_COLLECTION, userContext).request<TransactionRecord[]>({
      method: "GET",
      path: "records",
      searchParams: {
        includeDeleted: filter.includeDeleted ? "true" : "false",
        from: filter.from,
        to: filter.to,
        accountId: filter.accountId,
        categoryId: filter.categoryId,
        type: filter.type
      }
    });
  }

  create(userContext: UserContext, input: CreateTransactionRecordInput): Promise<TransactionRecord> {
    return this.storageClient.collection(TRANSACTIONS_COLLECTION, userContext).request<TransactionRecord>({
      method: "POST",
      path: "records",
      body: input
    });
  }

  read(userContext: UserContext, transactionId: string): Promise<TransactionRecord> {
    return this.storageClient.collection(TRANSACTIONS_COLLECTION, userContext).request<TransactionRecord>({
      method: "GET",
      path: `records/${encodeURIComponent(transactionId)}`,
      searchParams: {
        includeDeleted: "false"
      }
    });
  }

  update(userContext: UserContext, transactionId: string, input: UpdateTransactionRecordInput): Promise<TransactionRecord> {
    return this.storageClient.collection(TRANSACTIONS_COLLECTION, userContext).request<TransactionRecord>({
      method: "PATCH",
      path: `records/${encodeURIComponent(transactionId)}`,
      searchParams: {
        includeDeleted: "false"
      },
      body: input
    });
  }

  softDelete(userContext: UserContext, transactionId: string, input: SoftDeleteTransactionRecordInput): Promise<TransactionRecord> {
    return this.storageClient.collection(TRANSACTIONS_COLLECTION, userContext).request<TransactionRecord>({
      method: "PATCH",
      path: `records/${encodeURIComponent(transactionId)}`,
      searchParams: {
        includeDeleted: "false"
      },
      body: input
    });
  }
}
