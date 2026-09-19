import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

@Injectable()
export class MailService {
  private readonly apiKey: string;
  private readonly sender: { name?: string; email: string };

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.getOrThrow<string>("BREVO_API_KEY");
    this.sender = this.parseAddress(this.config.getOrThrow<string>("MAIL_FROM"));
  }

  async send(options: SendMailOptions): Promise<void> {
    try {
      await axios.post(
        BREVO_SEND_URL,
        {
          sender: this.sender,
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          ...(options.replyTo && { replyTo: { email: options.replyTo } }),
        },
        { headers: { "api-key": this.apiKey } },
      );
    } catch (err) {
      const detail = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? err.message)
        : (err as Error).message;
      throw new Error(`Failed to send email: ${detail}`);
    }
  }

  // Accepts "Name <email@domain>" or a bare "email@domain".
  private parseAddress(value: string): { name?: string; email: string } {
    const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    if (!match) return { email: value.trim() };
    const [, name, email] = match;
    return name ? { name, email } : { email };
  }
}
