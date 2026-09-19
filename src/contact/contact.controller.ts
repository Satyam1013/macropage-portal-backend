import { Body, Controller, Post } from "@nestjs/common";
import { ContactService } from "./contact.service";
import { SendEmailOtpDto } from "./dto/send-email-otp.dto";
import { SendPhoneOtpDto } from "./dto/send-phone-otp.dto";
import { SubmitContactDto } from "./dto/submit-contact.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post("email/send-otp")
  sendEmailOtp(@Body() dto: SendEmailOtpDto) {
    return this.contactService.sendEmailOtp(dto);
  }

  @Post("email/verify-otp")
  verifyEmailOtp(@Body() dto: VerifyOtpDto) {
    return this.contactService.verifyOtp("email", dto);
  }

  @Post("phone/send-otp")
  sendPhoneOtp(@Body() dto: SendPhoneOtpDto) {
    return this.contactService.sendPhoneOtp(dto);
  }

  @Post("phone/verify-otp")
  verifyPhoneOtp(@Body() dto: VerifyOtpDto) {
    return this.contactService.verifyOtp("phone", dto);
  }

  @Post("submit")
  submit(@Body() dto: SubmitContactDto) {
    return this.contactService.submit(dto);
  }
}
