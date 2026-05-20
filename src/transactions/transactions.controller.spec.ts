import { GUARDS_METADATA } from "@nestjs/common/constants";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import { TransactionsController } from "./transactions.controller";

describe("TransactionsController", () => {
  it("protects transaction routes with the TrustedUserGuard", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, TransactionsController) as unknown[] | undefined;

    expect(guards).toContain(TrustedUserGuard);
  });
});
