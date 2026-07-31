import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import axios from "axios";
import { Contact, ContactDocument } from "../schemas/contact.schema";
import { Conversation, ConversationDocument } from "../schemas/conversation.schema";
import { WABAAccount, WABAAccountDocument } from "../schemas/waba-account.schema";
import { User, UserDocument } from "../schemas/user.schema";
import { EncryptionService } from "../encryption/encryption.service";
import { ContactFormDto } from "./dto/contact-form.dto";

const META_BASE = "https://graph.facebook.com/v21.0";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  return digits;
}

@Injectable()
export class PublicApiService {
  private readonly logger = new Logger(PublicApiService.name);

  constructor(
    @InjectModel(Contact.name)
    private readonly contactModel: Model<ContactDocument>,

    @InjectModel(Conversation.name)
    private readonly convModel: Model<ConversationDocument>,

    @InjectModel(WABAAccount.name)
    private readonly wabaModel: Model<WABAAccountDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly encryption: EncryptionService,
  ) {}

  async handleContactForm(tenantId: string, dto: ContactFormDto) {
    // ── 1: upsert contact ────────────────────────────────────────────────

    const contact = await this.contactModel
      .findOneAndUpdate(
        { tenantId, phone: dto.phone },
        {
          $setOnInsert: {
            tenantId,
            name: dto.name,
            phone: dto.phone,
            email: dto.email ?? null,
          },
          $addToSet: { tags: "website-lead" },
        },
        { upsert: true, new: true },
      )
      .exec();

    // ── 2: find or create conversation ───────────────────────────────────

    let conversation = await this.convModel
      .findOne({
        tenantId,
        contactId: String(contact._id),
        status: { $ne: "RESOLVED" },
      })
      .exec();

    if (!conversation) {
      conversation = await this.convModel.create({
        tenantId,
        contactId: String(contact._id),
        status: "OPEN",
      });
    }

    // ── 3: check WABA ─────────────────────────────────────────────────────

    const waba = await this.wabaModel
      .findOne({ tenantId, metaConnected: true })
      .lean()
      .exec();

    if (!waba) {
      return {
        success: true,
        data: {
          message: "Contact created. WhatsApp not connected — messages not sent.",
          contactId: String(contact._id),
          conversationId: String(conversation._id),
          welcomeSent: false,
          ownerAlertSent: false,
        },
      };
    }

    const token = this.encryption.decrypt(waba.accessToken);

    const sendTemplate = async (
      to: string,
      templateName: string,
      variables: string[],
    ): Promise<boolean> => {
      try {
        await axios.post(
          `${META_BASE}/${waba.phoneNumberId}/messages`,
          {
            messaging_product: "whatsapp",
            to: normalizePhone(to),
            type: "template",
            template: {
              name: templateName,
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: variables.map((v) => ({ type: "text", text: v })),
                },
              ],
            },
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        return true;
      } catch (err) {
        this.logger.error(
          `[PublicAPI] sendTemplate ${templateName} to ${to} failed: ${(err as Error).message}`,
        );
        return false;
      }
    };

    // ── 4: welcome message → form-filler ─────────────────────────────────

    const welcomeSent = await sendTemplate(
      dto.phone,
      "website_lead_welcome",
      [dto.name],
    );

    // ── 5: alert → owner's personal WhatsApp ─────────────────────────────

    let ownerAlertSent = false;
    const owner = await this.userModel.findById(tenantId).lean().exec();

    if (owner?.alertWhatsAppNumber && owner.leadAlertsEnabled) {
      ownerAlertSent = await sendTemplate(
        owner.alertWhatsAppNumber,
        "new_lead_alert",
        [dto.name, dto.phone, dto.message ?? "No message provided"],
      );
    }

    return {
      success: true,
      data: {
        message: "Contact form processed successfully",
        contactId: String(contact._id),
        conversationId: String(conversation._id),
        welcomeSent,
        ownerAlertSent,
      },
    };
  }
}
