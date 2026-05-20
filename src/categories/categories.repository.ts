import { Injectable } from "@nestjs/common";
import { CoreStorageClient } from "../core/core-storage.client";
import type { UserContext } from "../core/user-context";
import {
  CATEGORIES_COLLECTION,
  type CategoryRecord,
  type CategoryType,
  type CreateCategoryRecordInput,
  type SoftDeleteCategoryRecordInput,
  type UpdateCategoryRecordInput
} from "./categories.types";

@Injectable()
export class CategoriesRepository {
  constructor(private readonly storageClient: CoreStorageClient) {}

  list(userContext: UserContext, type?: CategoryType): Promise<CategoryRecord[]> {
    return this.storageClient.collection(CATEGORIES_COLLECTION, userContext).request<CategoryRecord[]>({
      method: "GET",
      path: "records",
      searchParams: {
        includeDeleted: "false",
        type
      }
    });
  }

  create(userContext: UserContext, input: CreateCategoryRecordInput): Promise<CategoryRecord> {
    return this.storageClient.collection(CATEGORIES_COLLECTION, userContext).request<CategoryRecord>({
      method: "POST",
      path: "records",
      body: input
    });
  }

  read(userContext: UserContext, categoryId: string): Promise<CategoryRecord> {
    return this.storageClient.collection(CATEGORIES_COLLECTION, userContext).request<CategoryRecord>({
      method: "GET",
      path: `records/${encodeURIComponent(categoryId)}`,
      searchParams: {
        includeDeleted: "false"
      }
    });
  }

  update(userContext: UserContext, categoryId: string, input: UpdateCategoryRecordInput): Promise<CategoryRecord> {
    return this.storageClient.collection(CATEGORIES_COLLECTION, userContext).request<CategoryRecord>({
      method: "PATCH",
      path: `records/${encodeURIComponent(categoryId)}`,
      searchParams: {
        includeDeleted: "false"
      },
      body: input
    });
  }

  softDelete(userContext: UserContext, categoryId: string, input: SoftDeleteCategoryRecordInput): Promise<CategoryRecord> {
    return this.storageClient.collection(CATEGORIES_COLLECTION, userContext).request<CategoryRecord>({
      method: "PATCH",
      path: `records/${encodeURIComponent(categoryId)}`,
      searchParams: {
        includeDeleted: "false"
      },
      body: input
    });
  }
}
