import { Injectable } from "@nestjs/common";
import { CoreStorageClient } from "../core/core-storage.client";
import type { UserContext } from "../core/user-context";
import {
  ACCOUNTS_COLLECTION,
  type AccountRecord,
  type CreateAccountRecordInput,
  type SoftDeleteAccountRecordInput,
  type UpdateAccountRecordInput
} from "./accounts.types";

@Injectable()
export class AccountsRepository {
  constructor(private readonly storageClient: CoreStorageClient) {}

  list(userContext: UserContext): Promise<AccountRecord[]> {
    return this.storageClient.collection(ACCOUNTS_COLLECTION, userContext).request<AccountRecord[]>({
      method: "GET",
      path: "records",
      searchParams: {
        includeDeleted: "false"
      }
    });
  }

  create(userContext: UserContext, input: CreateAccountRecordInput): Promise<AccountRecord> {
    return this.storageClient.collection(ACCOUNTS_COLLECTION, userContext).request<AccountRecord>({
      method: "POST",
      path: "records",
      body: input
    });
  }

  read(userContext: UserContext, accountId: string): Promise<AccountRecord> {
    return this.storageClient.collection(ACCOUNTS_COLLECTION, userContext).request<AccountRecord>({
      method: "GET",
      path: `records/${encodeURIComponent(accountId)}`,
      searchParams: {
        includeDeleted: "false"
      }
    });
  }

  update(userContext: UserContext, accountId: string, input: UpdateAccountRecordInput): Promise<AccountRecord> {
    return this.storageClient.collection(ACCOUNTS_COLLECTION, userContext).request<AccountRecord>({
      method: "PATCH",
      path: `records/${encodeURIComponent(accountId)}`,
      searchParams: {
        includeDeleted: "false"
      },
      body: input
    });
  }

  softDelete(userContext: UserContext, accountId: string, input: SoftDeleteAccountRecordInput): Promise<AccountRecord> {
    return this.storageClient.collection(ACCOUNTS_COLLECTION, userContext).request<AccountRecord>({
      method: "PATCH",
      path: `records/${encodeURIComponent(accountId)}`,
      searchParams: {
        includeDeleted: "false"
      },
      body: input
    });
  }
}
