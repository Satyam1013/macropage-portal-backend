import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiKeyGuard } from "../common/guards/api-key.guard";
import { ApiRateLimitGuard } from "../common/guards/api-rate-limit.guard";
import { ContactService } from "./contact.service";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@Controller("contact")
@UseGuards(ApiKeyGuard, ApiRateLimitGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post("send-otp")
  sendOtp(@Body() dto: SendOtpDto) {
    return this.contactService.sendOtp(dto);
  }

  @Post("verify")
  verify(@Body() dto: VerifyOtpDto) {
    return this.contactService.verifyOtp(dto);
  }
}
