import { GUARDS_METADATA } from "@nestjs/common/constants";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import { AnalyticsController } from "./analytics.controller";

describe("AnalyticsController", () => {
  it("protects analytics routes with the TrustedUserGuard", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AnalyticsController) as unknown[] | undefined;

    expect(guards).toContain(TrustedUserGuard);
  });
});
