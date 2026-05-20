import { UnauthorizedException } from "@nestjs/common";
import { extractTrustedUserContext, TRUSTED_USER_ID_HEADER } from "./user-context";

describe("extractTrustedUserContext", () => {
  it("extracts the trusted user id from Core Gateway headers", () => {
    expect(extractTrustedUserContext({ [TRUSTED_USER_ID_HEADER]: " user-123 " })).toEqual({
      userId: "user-123"
    });
  });

  it("rejects requests without the trusted user id header", () => {
    expect(() => extractTrustedUserContext({})).toThrow(UnauthorizedException);
  });

  it("rejects ambiguous repeated trusted user id headers", () => {
    expect(() => extractTrustedUserContext({ [TRUSTED_USER_ID_HEADER]: ["user-123", "user-456"] })).toThrow(UnauthorizedException);
  });
});
