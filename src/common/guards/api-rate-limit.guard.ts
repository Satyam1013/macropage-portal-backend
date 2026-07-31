import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

interface RateEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class ApiRateLimitGuard implements CanActivate {
  private readonly counts = new Map<string, RateEntry>();
  private readonly LIMIT = 100;
  private readonly WINDOW_MS = 60_000;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      tenantId?: string;
    }>();

    const key =
      request.headers["x-api-key"] ?? request.tenantId ?? "unknown";

    const now = Date.now();
    const entry = this.counts.get(key);

    if (!entry || now > entry.resetAt) {
      this.counts.set(key, { count: 1, resetAt: now + this.WINDOW_MS });
      return true;
    }

    if (entry.count >= this.LIMIT) {
      throw new HttpException(
        {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Limit: 100 requests per minute.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }
}
