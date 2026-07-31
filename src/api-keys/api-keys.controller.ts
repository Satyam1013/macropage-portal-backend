import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiKeysService } from "./api-keys.service";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";

interface AuthReq {
  user: { id: string; tenantId: string; role: string };
}

@Controller("api-keys")
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  listKeys(@Request() req: AuthReq) {
    return this.apiKeysService.listKeys(req.user.tenantId);
  }

  @Post()
  createKey(@Request() req: AuthReq, @Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.createKey(
      req.user.tenantId,
      dto.name,
      dto.permissions ?? ["full_access"],
      dto.expiresInDays,
    );
  }

  @Delete(":id")
  revokeKey(@Request() req: AuthReq, @Param("id") id: string) {
    return this.apiKeysService.revokeKey(req.user.tenantId, id);
  }
}
