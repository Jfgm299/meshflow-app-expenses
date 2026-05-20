import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import { ApiTrustedCoreUser } from "../core/openapi-security";
import type { TrustedUserRequest, UserContext } from "../core/user-context";
import { AccountsService } from "./accounts.service";
import type { AccountRecord, CreateAccountDto, UpdateAccountDto } from "./accounts.types";

const getTrustedUserContext = (request: TrustedUserRequest): UserContext => {
  if (!request.userContext) {
    throw new Error("Trusted user context was not attached to the request");
  }

  return request.userContext;
};

@ApiTags("accounts")
@ApiTrustedCoreUser()
@UseGuards(TrustedUserGuard)
@Controller("accounts")
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: "List caller-owned Finance accounts" })
  @ApiOkResponse({ description: "Caller-owned active accounts." })
  list(@Req() request: TrustedUserRequest): Promise<AccountRecord[]> {
    return this.accountsService.list(getTrustedUserContext(request));
  }

  @Post()
  @ApiOperation({ summary: "Create a caller-owned Finance account" })
  @ApiCreatedResponse({ description: "Created account." })
  create(@Req() request: TrustedUserRequest, @Body() dto: CreateAccountDto): Promise<AccountRecord> {
    return this.accountsService.create(getTrustedUserContext(request), dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Read a caller-owned Finance account" })
  @ApiOkResponse({ description: "Requested active account." })
  read(@Req() request: TrustedUserRequest, @Param("id") accountId: string): Promise<AccountRecord> {
    return this.accountsService.read(getTrustedUserContext(request), accountId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a caller-owned Finance account" })
  @ApiOkResponse({ description: "Updated account." })
  update(@Req() request: TrustedUserRequest, @Param("id") accountId: string, @Body() dto: UpdateAccountDto): Promise<AccountRecord> {
    return this.accountsService.update(getTrustedUserContext(request), accountId, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete a caller-owned Finance account" })
  @ApiOkResponse({ description: "Soft-deleted account." })
  delete(@Req() request: TrustedUserRequest, @Param("id") accountId: string): Promise<AccountRecord> {
    return this.accountsService.softDelete(getTrustedUserContext(request), accountId);
  }
}
