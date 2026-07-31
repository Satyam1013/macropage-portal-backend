import * as crypto from "crypto";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { APIKey, APIKeyDocument } from "../schemas/api-key.schema";

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(APIKey.name)
    private readonly apiKeyModel: Model<APIKeyDocument>,
  ) {}

  async createKey(
    tenantId: string,
    name: string,
    permissions: string[],
    expiresInDays?: number,
  ) {
    const prefix =
      process.env.NODE_ENV === "production" ? "mc_live_" : "mc_test_";
    const rawKey = `${prefix}${crypto.randomBytes(24).toString("hex")}`;

    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPreview = rawKey.slice(0, 16);
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    await this.apiKeyModel.create({
      tenantId,
      name,
      keyHash,
      keyPreview,
      permissions,
      expiresAt,
    });

    return {
      success: true,
      data: {
        key: rawKey,
        keyPreview,
        name,
        permissions,
        expiresAt: expiresAt ?? null,
        warning: "Copy this key now — it will not be shown again.",
      },
    };
  }

  async validateKey(
    rawKey: string,
  ): Promise<{ tenantId: string; permissions: string[]; keyId: string } | null> {
    if (
      !rawKey ||
      (!rawKey.startsWith("mc_live_") && !rawKey.startsWith("mc_test_"))
    ) {
      return null;
    }

    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await this.apiKeyModel
      .findOne({ keyHash, isActive: true })
      .lean()
      .exec();

    if (!apiKey) return null;
    if (apiKey.expiresAt && new Date() > new Date(apiKey.expiresAt)) return null;

    void this.apiKeyModel
      .updateOne(
        { _id: apiKey._id },
        { $set: { lastUsedAt: new Date() }, $inc: { requestsToday: 1 } },
      )
      .exec();

    return {
      tenantId: apiKey.tenantId,
      permissions: apiKey.permissions,
      keyId: String(apiKey._id),
    };
  }

  async listKeys(tenantId: string) {
    const keys = await this.apiKeyModel
      .find({ tenantId })
      .select("-keyHash")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return { success: true, data: keys };
  }

  async revokeKey(tenantId: string, keyId: string) {
    await this.apiKeyModel.updateOne(
      { _id: keyId, tenantId },
      { $set: { isActive: false } },
    );
    return { success: true };
  }
}
