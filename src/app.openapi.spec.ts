import { Test } from "@nestjs/testing";
import { SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { createOpenApiConfig, TRUSTED_USER_SECURITY_NAME } from "./openapi";
import { TRUSTED_USER_ID_HEADER } from "./core/user-context";

const REQUIRED_OPENAPI_PATHS = {
  HEALTH: "/health",
  ACCOUNTS: "/accounts",
  ACCOUNT_BY_ID: "/accounts/{id}",
  CATEGORIES: "/categories",
  CATEGORY_BY_ID: "/categories/{id}",
  TRANSACTIONS: "/transactions",
  TRANSACTION_BY_ID: "/transactions/{id}",
  RECURRING_TRANSACTIONS: "/recurring-transactions",
  RECURRING_TRANSACTION_BY_ID: "/recurring-transactions/{id}",
  SCHEDULED_TRANSACTIONS: "/scheduled-transactions",
  SCHEDULED_TRANSACTION_BY_ID: "/scheduled-transactions/{id}",
  PROCESS_DUE: "/internal/jobs/process-due",
  ANALYTICS_OVERVIEW: "/analytics/overview",
  ANALYTICS_CASHFLOW: "/analytics/cashflow",
  ANALYTICS_BY_CATEGORY: "/analytics/by-category",
  ANALYTICS_BY_ACCOUNT: "/analytics/by-account",
  ANALYTICS_TIMELINE: "/analytics/timeline",
  ANALYTICS_TOP_EXPENSES: "/analytics/top-expenses",
  ANALYTICS_TOP_INCOME: "/analytics/top-income",
  ANALYTICS_UPCOMING: "/analytics/upcoming",
  ANALYTICS_RECURRING_IMPACT: "/analytics/recurring-impact",
  ANALYTICS_FORECAST: "/analytics/forecast"
} as const;

const REQUIRED_PATH_METHODS = {
  [REQUIRED_OPENAPI_PATHS.HEALTH]: ["get"],
  [REQUIRED_OPENAPI_PATHS.ACCOUNTS]: ["get", "post"],
  [REQUIRED_OPENAPI_PATHS.ACCOUNT_BY_ID]: ["get", "patch", "delete"],
  [REQUIRED_OPENAPI_PATHS.CATEGORIES]: ["get", "post"],
  [REQUIRED_OPENAPI_PATHS.CATEGORY_BY_ID]: ["get", "patch", "delete"],
  [REQUIRED_OPENAPI_PATHS.TRANSACTIONS]: ["get", "post"],
  [REQUIRED_OPENAPI_PATHS.TRANSACTION_BY_ID]: ["get", "patch", "delete"],
  [REQUIRED_OPENAPI_PATHS.RECURRING_TRANSACTIONS]: ["get", "post"],
  [REQUIRED_OPENAPI_PATHS.RECURRING_TRANSACTION_BY_ID]: ["get", "patch", "delete"],
  [REQUIRED_OPENAPI_PATHS.SCHEDULED_TRANSACTIONS]: ["get", "post"],
  [REQUIRED_OPENAPI_PATHS.SCHEDULED_TRANSACTION_BY_ID]: ["get", "patch", "delete"],
  [REQUIRED_OPENAPI_PATHS.PROCESS_DUE]: ["post"],
  [REQUIRED_OPENAPI_PATHS.ANALYTICS_OVERVIEW]: ["get"],
  [REQUIRED_OPENAPI_PATHS.ANALYTICS_CASHFLOW]: ["get"],
  [REQUIRED_OPENAPI_PATHS.ANALYTICS_BY_CATEGORY]: ["get"],
  [REQUIRED_OPENAPI_PATHS.ANALYTICS_BY_ACCOUNT]: ["get"],
  [REQUIRED_OPENAPI_PATHS.ANALYTICS_TIMELINE]: ["get"],
  [REQUIRED_OPENAPI_PATHS.ANALYTICS_TOP_EXPENSES]: ["get"],
  [REQUIRED_OPENAPI_PATHS.ANALYTICS_TOP_INCOME]: ["get"],
  [REQUIRED_OPENAPI_PATHS.ANALYTICS_UPCOMING]: ["get"],
  [REQUIRED_OPENAPI_PATHS.ANALYTICS_RECURRING_IMPACT]: ["get"],
  [REQUIRED_OPENAPI_PATHS.ANALYTICS_FORECAST]: ["get"]
} as const;

const PROTECTED_OPENAPI_PATHS = Object.values(REQUIRED_OPENAPI_PATHS).filter((path) => path !== REQUIRED_OPENAPI_PATHS.HEALTH);

type OpenApiPath = keyof typeof REQUIRED_PATH_METHODS;
type OpenApiMethod = (typeof REQUIRED_PATH_METHODS)[OpenApiPath][number];

interface OpenApiParameter {
  name?: string;
  in?: string;
  required?: boolean;
}

interface OpenApiSecurityRequirement {
  [schemeName: string]: string[];
}

interface OpenApiOperation {
  parameters?: OpenApiParameter[];
  security?: OpenApiSecurityRequirement[];
  responses?: Record<string, unknown>;
}

const getOperation = (document: OpenAPIObject, path: OpenApiPath, method: OpenApiMethod): OpenApiOperation => {
  const pathItem = document.paths[path];
  const operation = pathItem?.[method] as OpenApiOperation | undefined;

  if (operation === undefined) {
    throw new Error(`Missing OpenAPI operation ${method.toUpperCase()} ${path}`);
  }

  return operation;
};

describe("Finance V1 OpenAPI document", () => {
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    document = SwaggerModule.createDocument(app, createOpenApiConfig());

    await app.close();
  });

  it("documents every Finance V1 endpoint path and HTTP method", () => {
    for (const [path, methods] of Object.entries(REQUIRED_PATH_METHODS) as [OpenApiPath, readonly OpenApiMethod[]][]) {
      expect(document.paths).toHaveProperty(path);

      for (const method of methods) {
        expect(getOperation(document, path, method)).toBeDefined();
      }
    }
  });

  it("documents the trusted Core user header scheme for protected endpoints", () => {
    expect(document.components?.securitySchemes?.[TRUSTED_USER_SECURITY_NAME]).toEqual(
      expect.objectContaining({
        type: "apiKey",
        in: "header",
        name: TRUSTED_USER_ID_HEADER
      })
    );

    for (const path of PROTECTED_OPENAPI_PATHS as OpenApiPath[]) {
      for (const method of REQUIRED_PATH_METHODS[path]) {
        const operation = getOperation(document, path, method);
        expect(operation.security).toContainEqual({ [TRUSTED_USER_SECURITY_NAME]: [] });
        expect(operation.parameters).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: TRUSTED_USER_ID_HEADER,
              in: "header",
              required: true
            })
          ])
        );
        expect(operation.responses).toHaveProperty("401");
      }
    }
  });

  it("keeps health public in the OpenAPI contract", () => {
    const operation = getOperation(document, REQUIRED_OPENAPI_PATHS.HEALTH, "get");
    expect(operation.security).toBeUndefined();
    expect(operation.parameters ?? []).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: TRUSTED_USER_ID_HEADER })]));
  });
});
