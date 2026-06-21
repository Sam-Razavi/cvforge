import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

const KEY_PREFIX = "cvf_";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Record<string, unknown>>();
    const header = request["headers"] as Record<string, string | undefined>;
    const raw = header["x-api-key"];

    if (!raw || !raw.startsWith(KEY_PREFIX)) {
      throw new UnauthorizedException("Missing or invalid API key");
    }

    const keyHash = createHash("sha256")
      .update(raw.slice(KEY_PREFIX.length))
      .digest("hex");

    const record = await this.prisma.apiKey.findUnique({ where: { keyHash } });
    if (!record || !record.active) {
      throw new UnauthorizedException("Invalid or inactive API key");
    }

    await this.prisma.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    request["apiKeyId"] = record.id;
    return true;
  }
}
