import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiKeysService } from "../../api-keys/api-keys.service";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      tenantId?: string;
      apiKeyPermissions?: string[];
    }>();

    const rawKey =
      request.headers["x-api-key"] ??
      request.headers["authorization"]?.replace("Bearer ", "");

    if (!rawKey) {
      throw new UnauthorizedException({
        code: "MISSING_API_KEY",
        message: "API key required. Pass it as the X-API-Key header.",
      });
    }

    const result = await this.apiKeysService.validateKey(rawKey);

    if (!result) {
      throw new UnauthorizedException({
        code: "INVALID_API_KEY",
        message: "Invalid or expired API key.",
      });
    }

    request.tenantId = result.tenantId;
    request.apiKeyPermissions = result.permissions;

    return true;
  }
}
