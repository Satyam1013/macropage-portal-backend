import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.getOrThrow<string>("RESEND_API_KEY"));
    this.fromAddress = this.config.get<string>(
      "MAIL_FROM",
      "MacroPage <onboarding@resend.dev>",
    );
  }

  async send(options: SendMailOptions): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      ...options,
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}
