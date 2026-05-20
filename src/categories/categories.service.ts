import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { UserContext } from "../core/user-context";
import { CategoriesRepository } from "./categories.repository";
import { CATEGORY_TYPES, type CategoryRecord, type CategoryType, type CreateCategoryDto, type ListCategoriesQuery, type UpdateCategoryDto } from "./categories.types";

const isCallerOwnedActiveCategory = (category: CategoryRecord, userContext: UserContext): boolean => category.userId === userContext.userId && category.deletedAt === undefined;

const isCategoryType = (value: unknown): value is CategoryType => value === CATEGORY_TYPES.INCOME || value === CATEGORY_TYPES.EXPENSE;

const parseCategoryType = (value: unknown): CategoryType => {
  if (isCategoryType(value)) {
    return value;
  }

  throw new BadRequestException("Category type must be either income or expense");
};

const parseOptionalCategoryType = (value: unknown): CategoryType | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return parseCategoryType(value);
};

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async list(userContext: UserContext, query: ListCategoriesQuery = {}): Promise<CategoryRecord[]> {
    const type = parseOptionalCategoryType(query.type);
    const categories = await this.categoriesRepository.list(userContext, type);
    return categories.filter((category) => isCallerOwnedActiveCategory(category, userContext) && (type === undefined || category.type === type));
  }

  async create(userContext: UserContext, dto: CreateCategoryDto): Promise<CategoryRecord> {
    const now = new Date().toISOString();

    return this.categoriesRepository.create(userContext, {
      userId: userContext.userId,
      name: dto.name,
      type: parseCategoryType(dto.type),
      createdAt: now,
      updatedAt: now
    });
  }

  async read(userContext: UserContext, categoryId: string): Promise<CategoryRecord> {
    const category = await this.categoriesRepository.read(userContext, categoryId);
    this.assertCallerOwnedActiveCategory(category, userContext, categoryId);
    return category;
  }

  async update(userContext: UserContext, categoryId: string, dto: UpdateCategoryDto): Promise<CategoryRecord> {
    const existingCategory = await this.categoriesRepository.read(userContext, categoryId);
    this.assertCallerOwnedActiveCategory(existingCategory, userContext, categoryId);

    return this.categoriesRepository.update(userContext, categoryId, {
      name: dto.name,
      type: parseOptionalCategoryType(dto.type),
      updatedAt: new Date().toISOString()
    });
  }

  async softDelete(userContext: UserContext, categoryId: string): Promise<CategoryRecord> {
    const existingCategory = await this.categoriesRepository.read(userContext, categoryId);
    this.assertCallerOwnedActiveCategory(existingCategory, userContext, categoryId);

    const now = new Date().toISOString();
    return this.categoriesRepository.softDelete(userContext, categoryId, {
      updatedAt: now,
      deletedAt: now
    });
  }

  private assertCallerOwnedActiveCategory(category: CategoryRecord, userContext: UserContext, categoryId: string): void {
    if (!isCallerOwnedActiveCategory(category, userContext)) {
      throw new NotFoundException(`Category not found: ${categoryId}`);
    }
  }
}
