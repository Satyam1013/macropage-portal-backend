import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User> & {
  createdAt: Date;
};

@Schema({ timestamps: true })
export class User {
  @Prop({ index: true })
  tenantId?: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ type: String, default: "OWNER" })
  role!: string;

  @Prop({ default: null })
  alertWhatsAppNumber?: string;

  @Prop({ default: true })
  leadAlertsEnabled!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
