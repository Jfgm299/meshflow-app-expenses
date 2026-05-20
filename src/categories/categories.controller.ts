import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import type { TrustedUserRequest, UserContext } from "../core/user-context";
import { CategoriesService } from "./categories.service";
import type { CategoryRecord, CreateCategoryDto, UpdateCategoryDto } from "./categories.types";

const getTrustedUserContext = (request: TrustedUserRequest): UserContext => {
  if (!request.userContext) {
    throw new Error("Trusted user context was not attached to the request");
  }

  return request.userContext;
};

@ApiTags("categories")
@UseGuards(TrustedUserGuard)
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: "List caller-owned Finance categories" })
  @ApiOkResponse({ description: "Caller-owned active categories." })
  list(@Req() request: TrustedUserRequest, @Query("type") type?: string): Promise<CategoryRecord[]> {
    return this.categoriesService.list(getTrustedUserContext(request), { type });
  }

  @Post()
  @ApiOperation({ summary: "Create a caller-owned Finance category" })
  @ApiCreatedResponse({ description: "Created category." })
  create(@Req() request: TrustedUserRequest, @Body() dto: CreateCategoryDto): Promise<CategoryRecord> {
    return this.categoriesService.create(getTrustedUserContext(request), dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Read a caller-owned Finance category" })
  @ApiOkResponse({ description: "Requested active category." })
  read(@Req() request: TrustedUserRequest, @Param("id") categoryId: string): Promise<CategoryRecord> {
    return this.categoriesService.read(getTrustedUserContext(request), categoryId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a caller-owned Finance category" })
  @ApiOkResponse({ description: "Updated category." })
  update(@Req() request: TrustedUserRequest, @Param("id") categoryId: string, @Body() dto: UpdateCategoryDto): Promise<CategoryRecord> {
    return this.categoriesService.update(getTrustedUserContext(request), categoryId, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete a caller-owned Finance category" })
  @ApiOkResponse({ description: "Soft-deleted category." })
  delete(@Req() request: TrustedUserRequest, @Param("id") categoryId: string): Promise<CategoryRecord> {
    return this.categoriesService.softDelete(getTrustedUserContext(request), categoryId);
  }
}
