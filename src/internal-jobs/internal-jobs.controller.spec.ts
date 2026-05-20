import { ExecutionContext } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import type { IncomingHttpHeaders } from "node:http";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import { InternalJobsController } from "./internal-jobs.controller";

interface TestRequest {
  headers: IncomingHttpHeaders;
}

const createExecutionContext = (headers: IncomingHttpHeaders): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }) satisfies TestRequest
    })
  }) as ExecutionContext;

describe("InternalJobsController", () => {
  it("protects internal job routes with the TrustedUserGuard", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, InternalJobsController) as unknown[] | undefined;

    expect(guards).toContain(TrustedUserGuard);
  });

  it("rejects process-due requests missing the trusted user header", () => {
    const guard = new TrustedUserGuard();

    expect(() => guard.canActivate(createExecutionContext({}))).toThrow("Missing trusted Core Gateway header: x-meshflow-user-id");
  });
});
