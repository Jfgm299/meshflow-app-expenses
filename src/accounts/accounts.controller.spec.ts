import { GUARDS_METADATA } from "@nestjs/common/constants";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import { AccountsController } from "./accounts.controller";

describe("AccountsController", () => {
  it("protects accounts routes with the TrustedUserGuard", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AccountsController) as unknown[] | undefined;

    expect(guards).toContain(TrustedUserGuard);
  });
});
