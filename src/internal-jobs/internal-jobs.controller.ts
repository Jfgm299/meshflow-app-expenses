import { Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import { ApiTrustedCoreUser } from "../core/openapi-security";
import type { TrustedUserRequest, UserContext } from "../core/user-context";
import { DueProcessingService } from "./due-processing.service";
import type { ProcessDueResult } from "./due-processing.types";

const getTrustedUserContext = (request: TrustedUserRequest): UserContext => {
  if (!request.userContext) {
    throw new Error("Trusted user context was not attached to the request");
  }

  return request.userContext;
};

@ApiTags("internal-jobs")
@ApiTrustedCoreUser()
@UseGuards(TrustedUserGuard)
@Controller("internal/jobs")
export class InternalJobsController {
  constructor(private readonly dueProcessingService: DueProcessingService) {}

  @Post("process-due")
  @ApiOperation({ summary: "Process due recurring and scheduled Finance transactions for the caller" })
  @ApiOkResponse({ description: "Due processing counters." })
  processDue(@Req() request: TrustedUserRequest): Promise<ProcessDueResult> {
    return this.dueProcessingService.processDue(getTrustedUserContext(request));
  }
}
