import { GUARDS_METADATA } from "@nestjs/common/constants";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import { RecurringTransactionsController } from "./recurring-transactions.controller";

describe("RecurringTransactionsController", () => {
  it("protects recurring transaction routes with the TrustedUserGuard", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, RecurringTransactionsController) as unknown[] | undefined;

    expect(guards).toContain(TrustedUserGuard);
  });
});
