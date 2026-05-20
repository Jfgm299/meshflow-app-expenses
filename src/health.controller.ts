import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { APP_ID, APP_VERSION } from "./app.identity";

export interface HealthResponse {
  status: "ok";
  app: typeof APP_ID;
  version: typeof APP_VERSION;
}

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({
    summary: "Check Finance app health",
    description: "Returns a minimal liveness response so MeshFlow Core can validate the remote Finance app during install, reinstall, and update flows."
  })
  @ApiOkResponse({ description: "Finance app is reachable." })
  getHealth(): HealthResponse {
    return {
      status: "ok",
      app: APP_ID,
      version: APP_VERSION
    };
  }
}
