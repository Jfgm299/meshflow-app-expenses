import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import type { TrustedUserRequest, UserContext } from "../core/user-context";
import { TransactionsService } from "./transactions.service";
import type { CreateTransactionDto, TransactionRecord, UpdateTransactionDto } from "./transactions.types";

const getTrustedUserContext = (request: TrustedUserRequest): UserContext => {
  if (!request.userContext) {
    throw new Error("Trusted user context was not attached to the request");
  }

  return request.userContext;
};

@ApiTags("transactions")
@UseGuards(TrustedUserGuard)
@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: "List caller-owned Finance transactions" })
  @ApiOkResponse({ description: "Caller-owned transactions matching filters." })
  list(
    @Req() request: TrustedUserRequest,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("accountId") accountId?: string,
    @Query("categoryId") categoryId?: string,
    @Query("type") type?: string,
    @Query("includeDeleted") includeDeleted?: string
  ): Promise<TransactionRecord[]> {
    return this.transactionsService.list(getTrustedUserContext(request), { from, to, accountId, categoryId, type, includeDeleted });
  }

  @Post()
  @ApiOperation({ summary: "Create a caller-owned Finance transaction" })
  @ApiCreatedResponse({ description: "Created transaction." })
  create(@Req() request: TrustedUserRequest, @Body() dto: CreateTransactionDto): Promise<TransactionRecord> {
    return this.transactionsService.create(getTrustedUserContext(request), dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Read a caller-owned Finance transaction" })
  @ApiOkResponse({ description: "Requested active transaction." })
  read(@Req() request: TrustedUserRequest, @Param("id") transactionId: string): Promise<TransactionRecord> {
    return this.transactionsService.read(getTrustedUserContext(request), transactionId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a caller-owned Finance transaction" })
  @ApiOkResponse({ description: "Updated transaction." })
  update(@Req() request: TrustedUserRequest, @Param("id") transactionId: string, @Body() dto: UpdateTransactionDto): Promise<TransactionRecord> {
    return this.transactionsService.update(getTrustedUserContext(request), transactionId, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete a caller-owned Finance transaction" })
  @ApiOkResponse({ description: "Soft-deleted transaction." })
  delete(@Req() request: TrustedUserRequest, @Param("id") transactionId: string): Promise<TransactionRecord> {
    return this.transactionsService.softDelete(getTrustedUserContext(request), transactionId);
  }
}
