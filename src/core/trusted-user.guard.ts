import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { extractTrustedUserContext, type TrustedUserRequest } from "./user-context";

@Injectable()
export class TrustedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TrustedUserRequest>();
    request.userContext = extractTrustedUserContext(request.headers);

    return true;
  }
}
