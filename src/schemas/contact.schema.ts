import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ContactDocument = HydratedDocument<Contact> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Contact {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop()
  email?: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: Object, default: {} })
  customFields!: Record<string, unknown>;

  @Prop({ default: false })
  isOptedOut!: boolean;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
ContactSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
