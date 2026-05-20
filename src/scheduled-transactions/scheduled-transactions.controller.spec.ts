import { GUARDS_METADATA } from "@nestjs/common/constants";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import { ScheduledTransactionsController } from "./scheduled-transactions.controller";

describe("ScheduledTransactionsController", () => {
  it("protects scheduled transaction routes with the TrustedUserGuard", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ScheduledTransactionsController) as unknown[] | undefined;

    expect(guards).toContain(TrustedUserGuard);
  });
});
