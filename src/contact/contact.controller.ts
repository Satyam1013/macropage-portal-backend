import { Body, Controller, Post } from "@nestjs/common";
import { ContactService } from "./contact.service";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@Controller("contact")
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
