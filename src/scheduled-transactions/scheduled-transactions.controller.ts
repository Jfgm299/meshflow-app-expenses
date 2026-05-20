import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import type { TrustedUserRequest, UserContext } from "../core/user-context";
import { ScheduledTransactionsService } from "./scheduled-transactions.service";
import type { CreateScheduledTransactionDto, ScheduledTransactionRecord, UpdateScheduledTransactionDto } from "./scheduled-transactions.types";

const getTrustedUserContext = (request: TrustedUserRequest): UserContext => {
  if (!request.userContext) {
    throw new Error("Trusted user context was not attached to the request");
  }

  return request.userContext;
};

@ApiTags("scheduled-transactions")
@UseGuards(TrustedUserGuard)
@Controller("scheduled-transactions")
export class ScheduledTransactionsController {
  constructor(private readonly scheduledTransactionsService: ScheduledTransactionsService) {}

  @Get()
  @ApiOperation({ summary: "List caller-owned Finance scheduled transaction definitions" })
  @ApiOkResponse({ description: "Caller-owned scheduled transaction definitions matching filters." })
  list(
    @Req() request: TrustedUserRequest,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ): Promise<ScheduledTransactionRecord[]> {
    return this.scheduledTransactionsService.list(getTrustedUserContext(request), { type, status, from, to });
  }

  @Post()
  @ApiOperation({ summary: "Create a caller-owned Finance scheduled transaction definition" })
  @ApiCreatedResponse({ description: "Created scheduled transaction definition." })
  create(@Req() request: TrustedUserRequest, @Body() dto: CreateScheduledTransactionDto): Promise<ScheduledTransactionRecord> {
    return this.scheduledTransactionsService.create(getTrustedUserContext(request), dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Read a caller-owned Finance scheduled transaction definition" })
  @ApiOkResponse({ description: "Requested active scheduled transaction definition." })
  read(@Req() request: TrustedUserRequest, @Param("id") scheduledTransactionId: string): Promise<ScheduledTransactionRecord> {
    return this.scheduledTransactionsService.read(getTrustedUserContext(request), scheduledTransactionId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update or cancel a caller-owned Finance scheduled transaction definition" })
  @ApiOkResponse({ description: "Updated scheduled transaction definition." })
  update(@Req() request: TrustedUserRequest, @Param("id") scheduledTransactionId: string, @Body() dto: UpdateScheduledTransactionDto): Promise<ScheduledTransactionRecord> {
    return this.scheduledTransactionsService.update(getTrustedUserContext(request), scheduledTransactionId, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete a caller-owned Finance scheduled transaction definition" })
  @ApiOkResponse({ description: "Soft-deleted scheduled transaction definition." })
  delete(@Req() request: TrustedUserRequest, @Param("id") scheduledTransactionId: string): Promise<ScheduledTransactionRecord> {
    return this.scheduledTransactionsService.softDelete(getTrustedUserContext(request), scheduledTransactionId);
  }
}
