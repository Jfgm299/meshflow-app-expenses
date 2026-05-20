import type { ExecutionContext } from "@nestjs/common";
import { TrustedUserGuard } from "./trusted-user.guard";
import { TRUSTED_USER_ID_HEADER, type TrustedUserRequest } from "./user-context";

describe("TrustedUserGuard", () => {
  it("propagates the trusted user context onto the request", () => {
    const request: TrustedUserRequest = {
      headers: {
        [TRUSTED_USER_ID_HEADER]: "user-123"
      }
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request
      })
    } as unknown as ExecutionContext;

    expect(new TrustedUserGuard().canActivate(context)).toBe(true);
    expect(request.userContext).toEqual({ userId: "user-123" });
  });

  it("rejects requests without the trusted user header", () => {
    const request: TrustedUserRequest = {
      headers: {}
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request
      })
    } as unknown as ExecutionContext;

    expect(() => new TrustedUserGuard().canActivate(context)).toThrow("Missing trusted Core Gateway header");
  });
});
