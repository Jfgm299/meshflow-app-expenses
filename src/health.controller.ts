import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

export interface HealthResponse {
  status: "ok";
  app: "expenses";
  version: "0.1.0";
}

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({
    summary: "Check Expenses app health",
    description: "Returns a minimal liveness response so MeshFlow Core can validate the remote Expenses app during install, reinstall, and update flows."
  })
  @ApiOkResponse({ description: "Expenses app is reachable." })
  getHealth(): HealthResponse {
    return {
      status: "ok",
      app: "expenses",
      version: "0.1.0"
    };
  }
}
