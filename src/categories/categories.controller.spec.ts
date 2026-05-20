import { GUARDS_METADATA } from "@nestjs/common/constants";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import { CategoriesController } from "./categories.controller";

describe("CategoriesController", () => {
  it("protects categories routes with the TrustedUserGuard", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, CategoriesController) as unknown[] | undefined;

    expect(guards).toContain(TrustedUserGuard);
  });
});
