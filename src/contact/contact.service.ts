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
import { SendEmailOtpDto } from "./dto/send-email-otp.dto";
import { SendPhoneOtpDto } from "./dto/send-phone-otp.dto";
import { SubmitContactDto } from "./dto/submit-contact.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

type Channel = "email" | "phone";
type Purpose = `${Channel}-otp` | `${Channel}-proof`;

// Every token is a signed, self-contained blob. An "-otp" token carries a hash
// of the code we sent; a "-proof" token is what the visitor receives after
// entering the right code and is what /contact/submit checks.
interface TokenPayload {
  purpose: Purpose;
  subject: string;
  otpHash?: string;
  expiresAt: number;
}

const OTP_TTL_MS = 10 * 60 * 1000;
const PROOF_TTL_MS = 30 * 60 * 1000;

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

  private issueOtp(channel: Channel, subject: string) {
    const otp = crypto.randomInt(100000, 1000000).toString();
    const token = this.sign({
      purpose: `${channel}-otp`,
      subject,
      otpHash: this.hashOtp(otp),
      expiresAt: Date.now() + OTP_TTL_MS,
    });
    return { otp, token };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async sendEmailOtp(dto: SendEmailOtpDto) {
    const email = this.normalizeEmail(dto.email);
    const { otp, token } = this.issueOtp("email", email);

    try {
      await this.mail.send({
        to: email,
        subject: "Your verification code — MacroPage",
        html: otpEmailTemplate({ name: dto.name, otp }),
      });
    } catch (err) {
      this.logger.error(`Email OTP failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        "We couldn't send the verification code to your email. Please check it and try again.",
      );
    }

    return { token };
  }

  async sendPhoneOtp(dto: SendPhoneOtpDto) {
    if (!this.otpTemplate) {
      throw new ServiceUnavailableException(
        "WhatsApp verification is not available right now. Please try again later.",
      );
    }
    const { otp, token } = this.issueOtp("phone", dto.phone);

    try {
      await this.postWhatsAppTemplate(dto.phone, dto.name, this.otpTemplate, {
        "1": otp,
      });
    } catch (err) {
      this.logger.error(`WhatsApp OTP failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        "We couldn't send the verification code to your WhatsApp number. Please check it and try again.",
      );
    }

    return { token };
  }

  verifyOtp(channel: Channel, dto: VerifyOtpDto) {
    const payload = this.verify(dto.token);

    if (!payload || payload.purpose !== `${channel}-otp` || !payload.otpHash) {
      throw new BadRequestException("Invalid session. Please request a new code.");
    }
    if (Date.now() > payload.expiresAt) {
      throw new BadRequestException("Code expired. Please request a new one.");
    }
    const given = Buffer.from(this.hashOtp(dto.otp));
    const expected = Buffer.from(payload.otpHash);
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
      throw new BadRequestException("Incorrect code. Please try again.");
    }

    return {
      proof: this.sign({
        purpose: `${channel}-proof`,
        subject: payload.subject,
        expiresAt: Date.now() + PROOF_TTL_MS,
      }),
    };
  }

  private assertProof(channel: Channel, proof: string, subject: string) {
    const payload = this.verify(proof);
    if (
      !payload ||
      payload.purpose !== `${channel}-proof` ||
      payload.subject !== subject ||
      Date.now() > payload.expiresAt
    ) {
      throw new BadRequestException(
        `Please verify your ${channel === "email" ? "email" : "WhatsApp number"} first.`,
      );
    }
  }

  async submit(dto: SubmitContactDto) {
    const email = this.normalizeEmail(dto.email);
    this.assertProof("email", dto.emailProof, email);
    this.assertProof("phone", dto.phoneProof, dto.phone);

    await this.mail.send({
      to: this.contactEmail,
      replyTo: email,
      subject: `New inquiry from ${dto.name}`,
      html: contactNotificationTemplate({
        name: dto.name,
        email,
        phone: dto.phone,
        message: dto.message,
      }),
    });

    await this.sendWhatsAppAlert({ ...dto, email });

    return { success: true };
  }

  private async sendWhatsAppAlert(payload: {
    name: string;
    email: string;
    phone: string;
    message: string;
  }): Promise<void> {
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
