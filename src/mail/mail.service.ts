import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    this.fromAddress = this.config.getOrThrow<string>("GMAIL_USER");
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: this.fromAddress,
        pass: this.config.getOrThrow<string>("GMAIL_APP_PASSWORD"),
      },
    });
  }

  async send(options: SendMailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: `"MacroPage" <${this.fromAddress}>`,
      ...options,
    });
  }
}
