import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ConversationDocument = HydratedDocument<Conversation> & {
  createdAt: Date;
};

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, index: true })
  contactId!: string;

  @Prop({
    type: String,
    enum: ["OPEN", "PENDING", "RESOLVED"],
    default: "OPEN",
    index: true,
  })
  status!: string;

  @Prop()
  lastMessageAt?: Date;

  @Prop({ default: 0 })
  unreadCount!: number;

  @Prop({ type: [String], default: [] })
  labels!: string[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
