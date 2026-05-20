import { applyDecorators } from "@nestjs/common";
import { ApiHeader, ApiSecurity, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { TRUSTED_USER_SECURITY_NAME } from "../openapi";
import { TRUSTED_USER_ID_HEADER } from "./user-context";

export const ApiTrustedCoreUser = (): ClassDecorator & MethodDecorator =>
  applyDecorators(
    ApiSecurity(TRUSTED_USER_SECURITY_NAME),
    ApiHeader({
      name: TRUSTED_USER_ID_HEADER,
      required: true,
      description:
        "Trusted caller identity forwarded by MeshFlow Core Gateway. Finance V1 rejects protected routes when this header is missing and relies on Core Gateway to prevent header spoofing from public clients.",
      schema: { type: "string", minLength: 1, example: "user_01HZX4Q6W2" }
    }),
    ApiUnauthorizedResponse({ description: `Missing trusted Core Gateway header: ${TRUSTED_USER_ID_HEADER}` })
  );
