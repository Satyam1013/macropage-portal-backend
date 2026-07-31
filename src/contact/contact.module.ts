import { Module } from "@nestjs/common";
import { ApiKeysModule } from "../api-keys/api-keys.module";
import { MailModule } from "../mail/mail.module";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";

@Module({
  imports: [ApiKeysModule, MailModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
