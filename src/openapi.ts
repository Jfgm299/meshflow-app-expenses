import { DocumentBuilder, type OpenAPIObject } from "@nestjs/swagger";
import { APP_VERSION, OPENAPI_DESCRIPTION, OPENAPI_TITLE } from "./app.identity";
import { TRUSTED_USER_ID_HEADER } from "./core/user-context";

export const TRUSTED_USER_SECURITY_NAME = "trustedCoreUser" as const;

export const createOpenApiConfig = (): Omit<OpenAPIObject, "paths"> =>
  new DocumentBuilder()
    .setTitle(OPENAPI_TITLE)
    .setDescription(OPENAPI_DESCRIPTION)
    .setVersion(APP_VERSION)
    .addApiKey(
      {
        type: "apiKey",
        in: "header",
        name: TRUSTED_USER_ID_HEADER,
        description:
          "Trusted user identity header injected by MeshFlow Core Gateway. Finance V1 trusts this header only behind the gateway; do not expose protected routes directly to public clients."
      },
      TRUSTED_USER_SECURITY_NAME
    )
    .build();
