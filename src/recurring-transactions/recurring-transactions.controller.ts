import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import { ApiTrustedCoreUser } from "../core/openapi-security";
import type { TrustedUserRequest, UserContext } from "../core/user-context";
import { RecurringTransactionsService } from "./recurring-transactions.service";
import type { CreateRecurringTransactionDto, RecurringTransactionRecord, UpdateRecurringTransactionDto } from "./recurring-transactions.types";

const getTrustedUserContext = (request: TrustedUserRequest): UserContext => {
  if (!request.userContext) {
    throw new Error("Trusted user context was not attached to the request");
  }

  return request.userContext;
};

@ApiTags("recurring-transactions")
@ApiTrustedCoreUser()
@UseGuards(TrustedUserGuard)
@Controller("recurring-transactions")
export class RecurringTransactionsController {
  constructor(private readonly recurringTransactionsService: RecurringTransactionsService) {}

  @Get()
  @ApiOperation({ summary: "List caller-owned Finance recurring transaction definitions" })
  @ApiOkResponse({ description: "Caller-owned recurring transaction definitions matching filters." })
  list(@Req() request: TrustedUserRequest, @Query("type") type?: string, @Query("status") status?: string): Promise<RecurringTransactionRecord[]> {
    return this.recurringTransactionsService.list(getTrustedUserContext(request), { type, status });
  }

  @Post()
  @ApiOperation({ summary: "Create a caller-owned Finance recurring transaction definition" })
  @ApiCreatedResponse({ description: "Created recurring transaction definition." })
  create(@Req() request: TrustedUserRequest, @Body() dto: CreateRecurringTransactionDto): Promise<RecurringTransactionRecord> {
    return this.recurringTransactionsService.create(getTrustedUserContext(request), dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Read a caller-owned Finance recurring transaction definition" })
  @ApiOkResponse({ description: "Requested active recurring transaction definition." })
  read(@Req() request: TrustedUserRequest, @Param("id") recurringTransactionId: string): Promise<RecurringTransactionRecord> {
    return this.recurringTransactionsService.read(getTrustedUserContext(request), recurringTransactionId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update or cancel a caller-owned Finance recurring transaction definition" })
  @ApiOkResponse({ description: "Updated recurring transaction definition." })
  update(@Req() request: TrustedUserRequest, @Param("id") recurringTransactionId: string, @Body() dto: UpdateRecurringTransactionDto): Promise<RecurringTransactionRecord> {
    return this.recurringTransactionsService.update(getTrustedUserContext(request), recurringTransactionId, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete a caller-owned Finance recurring transaction definition" })
  @ApiOkResponse({ description: "Soft-deleted recurring transaction definition." })
  delete(@Req() request: TrustedUserRequest, @Param("id") recurringTransactionId: string): Promise<RecurringTransactionRecord> {
    return this.recurringTransactionsService.softDelete(getTrustedUserContext(request), recurringTransactionId);
  }
}
