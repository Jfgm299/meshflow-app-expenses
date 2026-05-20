import { UnauthorizedException } from "@nestjs/common";
import type { IncomingHttpHeaders } from "node:http";

export const TRUSTED_USER_ID_HEADER = "x-meshflow-user-id" as const;

export interface UserContext {
  userId: string;
}

export interface TrustedUserRequest {
  headers: IncomingHttpHeaders;
  userContext?: UserContext;
}

const getSingleHeaderValue = (headers: IncomingHttpHeaders, headerName: typeof TRUSTED_USER_ID_HEADER): string | undefined => {
  const value = headers[headerName];

  if (Array.isArray(value)) {
    return value.length === 1 ? value[0] : undefined;
  }

  return value;
};

export const extractTrustedUserContext = (headers: IncomingHttpHeaders): UserContext => {
  const rawUserId = getSingleHeaderValue(headers, TRUSTED_USER_ID_HEADER);
  const userId = rawUserId?.trim();

  if (!userId) {
    throw new UnauthorizedException(`Missing trusted Core Gateway header: ${TRUSTED_USER_ID_HEADER}`);
  }

  return { userId };
};
