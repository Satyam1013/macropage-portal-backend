import { BadRequestException, Injectable, Logger } from "@nestjs/common";
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
  message: string;
  otp: string;
  expiresAt: number;
}

const OTP_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly secret: string;
  private readonly contactEmail: string;

  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    this.secret = this.config.getOrThrow<string>("CONTACT_JWT_SECRET");
    this.contactEmail =
      this.config.get<string>("CONTACT_EMAIL") ??
      this.config.getOrThrow<string>("GMAIL_USER");
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + OTP_TTL_MS;
    const token = this.sign({ ...dto, otp, expiresAt });

    await this.mail.send({
      to: dto.email,
      subject: "Your verification code — MacroPage",
      html: otpEmailTemplate({ name: dto.name, otp }),
    });

    return { token };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const payload = this.verify(dto.token);

    if (!payload) {
      throw new BadRequestException("Invalid session. Please try again.");
    }
    if (Date.now() > payload.expiresAt) {
      throw new BadRequestException("Code expired. Please request a new one.");
    }
    if (dto.otp !== payload.otp) {
      throw new BadRequestException("Incorrect code. Please try again.");
    }

    await this.mail.send({
      to: this.contactEmail,
      replyTo: payload.email,
      subject: `New inquiry from ${payload.name}`,
      html: contactNotificationTemplate({
        name: payload.name,
        email: payload.email,
        message: payload.message,
      }),
    });

    await this.sendWhatsAppAlert(payload);

    return { success: true };
  }

  private async sendWhatsAppAlert(payload: TokenPayload): Promise<void> {
    const baseUrl = this.config.get<string>("MACROPAGE_CONNECT_URL")?.trim();
    const apiKey = this.config.get<string>("MACROPAGE_CONNECT_API_KEY")?.trim();
    const alertNumber = this.config
      .get<string>("WHATSAPP_ALERT_NUMBER")
      ?.trim()
      .replace(/^["']|["']$/g, "");
    const templateName = this.config
      .get<string>("WHATSAPP_ALERT_TEMPLATE", "test1213212")
      .trim();

    if (!baseUrl || !apiKey || !alertNumber) return;

    const summary = `New lead: ${payload.name} (${payload.email}) - ${payload.message}`
      .replace(/\s+/g, " ")
      .slice(0, 300);

    try {
      await axios.post(
        `${baseUrl}/api/v1/public/messages/send`,
        {
          phone: alertNumber,
          name: payload.name,
          templateName,
          templateVars: { "1": summary },
        },
        { headers: { "X-API-Key": apiKey } },
      );
    } catch (err) {
      const detail = axios.isAxiosError(err)
        ? JSON.stringify(err.response?.data ?? err.message)
        : (err as Error).message;
      this.logger.error(`WhatsApp alert failed: ${detail}`);
    }
  }
}
