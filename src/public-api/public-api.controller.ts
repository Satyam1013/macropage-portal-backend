import { Controller, Post, Body, UseGuards, Request } from "@nestjs/common";
import { ApiKeyGuard } from "../common/guards/api-key.guard";
import { ApiRateLimitGuard } from "../common/guards/api-rate-limit.guard";
import { PublicApiService } from "./public-api.service";
import { ContactFormDto } from "./dto/contact-form.dto";

@Controller("public/contact-form")
@UseGuards(ApiKeyGuard, ApiRateLimitGuard)
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @Post()
  submit(@Request() req: { tenantId: string }, @Body() dto: ContactFormDto) {
    return this.publicApiService.handleContactForm(req.tenantId, dto);
  }
}
