import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import * as crypto from "crypto";
import { MailService } from "../mail/mail.service";
import { contactNotificationTemplate, otpEmailTemplate } from "../mail/templates/contact.templates";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

interface TokenPayload {
  name: string;
  email: string;
  phone: string;
  message: string;
  otpHash: string;
  expiresAt: number;
}

const OTP_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly secret: string;
  private readonly contactEmail: string;
  private readonly otpTemplate?: string;

  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    this.secret = this.config.getOrThrow<string>("CONTACT_JWT_SECRET");
    this.contactEmail =
      this.config.get<string>("CONTACT_EMAIL") ??
      this.config.getOrThrow<string>("GMAIL_USER");
    this.otpTemplate = this.config.get<string>("WHATSAPP_OTP_TEMPLATE")?.trim();
  }

  // The token travels through the browser, so it must never contain the OTP
  // itself — only a keyed hash that can't be reversed without the server secret.
  private hashOtp(otp: string): string {
    return crypto
      .createHmac("sha256", this.secret)
      .update(`otp:${otp}`)
      .digest("base64url");
  }

  private sign(payload: TokenPayload): string {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = crypto
      .createHmac("sha256", this.secret)
      .update(data)
      .digest("base64url");
    return `${data}.${sig}`;
  }

  private verify(token: string): TokenPayload | null {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;

    const expected = crypto
      .createHmac("sha256", this.secret)
      .update(data)
      .digest("base64url");
    if (sig !== expected) return null;

    try {
      return JSON.parse(Buffer.from(data, "base64url").toString()) as TokenPayload;
    } catch {
      return null;
    }
  }

  async sendOtp(dto: SendOtpDto) {
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + OTP_TTL_MS;
    const token = this.sign({ ...dto, otpHash: this.hashOtp(otp), expiresAt });

    // The same code goes out on every configured channel.
    const attempts: Array<{ channel: "email" | "whatsapp"; run: Promise<void> }> = [
      {
        channel: "email",
        run: this.mail.send({
          to: dto.email,
          subject: "Your verification code — MacroPage",
          html: otpEmailTemplate({ name: dto.name, otp }),
        }),
      },
    ];
    if (this.otpTemplate) {
      attempts.push({
        channel: "whatsapp",
        run: this.postWhatsAppTemplate(dto.phone, dto.name, this.otpTemplate, {
          "1": otp,
        }),
      });
    }

    const results = await Promise.allSettled(attempts.map((a) => a.run));
    const sentTo: string[] = [];
    const failed: string[] = [];
    results.forEach((result, i) => {
      const { channel } = attempts[i];
      if (result.status === "fulfilled") {
        sentTo.push(channel);
      } else {
        failed.push(channel === "email" ? "email" : "WhatsApp number");
        this.logger.error(
          `OTP via ${channel} failed: ${(result.reason as Error).message}`,
        );
      }
    });

    // Both the email and the phone must be reachable, so any failure is an error.
    if (failed.length > 0) {
      throw new ServiceUnavailableException(
        `We couldn't send the verification code to your ${failed.join(" and ")}. Please check it and try again.`,
      );
    }

    return { token, sentTo };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const payload = this.verify(dto.token);

    if (!payload) {
      throw new BadRequestException("Invalid session. Please try again.");
    }
    if (Date.now() > payload.expiresAt) {
      throw new BadRequestException("Code expired. Please request a new one.");
    }
    const given = Buffer.from(this.hashOtp(dto.otp));
    const expected = Buffer.from(payload.otpHash);
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
      throw new BadRequestException("Incorrect code. Please try again.");
    }

    await this.mail.send({
      to: this.contactEmail,
      replyTo: payload.email,
      subject: `New inquiry from ${payload.name}`,
      html: contactNotificationTemplate({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        message: payload.message,
      }),
    });

    await this.sendWhatsAppAlert(payload);

    return { success: true };
  }

  private async sendWhatsAppAlert(payload: TokenPayload): Promise<void> {
    const alertNumber = this.config
      .get<string>("WHATSAPP_ALERT_NUMBER")
      ?.trim()
      .replace(/^["']|["']$/g, "");
    const templateName = this.config
      .get<string>("WHATSAPP_ALERT_TEMPLATE", "test1213212")
      .trim();

    if (!this.connectConfigured() || !alertNumber) return;

    const summary = `New lead: ${payload.name} (${payload.email}, ${payload.phone}) - ${payload.message}`
      .replace(/\s+/g, " ")
      .slice(0, 300);

    try {
      await this.postWhatsAppTemplate(alertNumber, payload.name, templateName, {
        "1": summary,
      });
    } catch (err) {
      this.logger.error(`WhatsApp alert failed: ${(err as Error).message}`);
    }
  }

  private connectConfigured(): boolean {
    return Boolean(
      this.config.get<string>("MACROPAGE_CONNECT_URL")?.trim() &&
        this.config.get<string>("MACROPAGE_CONNECT_API_KEY")?.trim(),
    );
  }

  private async postWhatsAppTemplate(
    phone: string,
    name: string,
    templateName: string,
    templateVars: Record<string, string>,
  ): Promise<void> {
    const baseUrl = this.config.get<string>("MACROPAGE_CONNECT_URL")?.trim();
    const apiKey = this.config.get<string>("MACROPAGE_CONNECT_API_KEY")?.trim();
    if (!baseUrl || !apiKey) {
      throw new Error("MACROPAGE_CONNECT_URL / MACROPAGE_CONNECT_API_KEY not set");
    }

    try {
      await axios.post(
        `${baseUrl}/api/v1/public/messages/send`,
        { phone, name, templateName, templateVars },
        { headers: { "X-API-Key": apiKey } },
      );
    } catch (err) {
      throw new Error(
        axios.isAxiosError(err)
          ? JSON.stringify(err.response?.data ?? err.message)
          : (err as Error).message,
      );
    }
  }
}
