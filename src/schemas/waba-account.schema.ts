import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type WABAAccountDocument = HydratedDocument<WABAAccount>;

@Schema({ timestamps: true })
export class WABAAccount {
  @Prop({ required: true, unique: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  phoneNumberId!: string;

  @Prop({ required: true })
  accessToken!: string;

  @Prop({ default: false })
  metaConnected!: boolean;

  @Prop({ default: false })
  tokenExpired!: boolean;
}

export const WABAAccountSchema = SchemaFactory.createForClass(WABAAccount);
