export const CATEGORIES_COLLECTION = "categories" as const;

export const CATEGORY_TYPES = {
  INCOME: "income",
  EXPENSE: "expense"
} as const;

export type CategoryType = (typeof CATEGORY_TYPES)[keyof typeof CATEGORY_TYPES];

export interface CategoryRecord {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateCategoryDto {
  name: string;
  type: unknown;
}

export interface UpdateCategoryDto {
  name?: string;
  type?: unknown;
}

export interface ListCategoriesQuery {
  type?: unknown;
}

export interface CreateCategoryRecordInput {
  userId: string;
  name: string;
  type: CategoryType;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCategoryRecordInput {
  name?: string;
  type?: CategoryType;
  updatedAt: string;
}

export interface SoftDeleteCategoryRecordInput {
  updatedAt: string;
  deletedAt: string;
}
