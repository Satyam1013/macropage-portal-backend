
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Contact, ContactSchema } from "../schemas/contact.schema";
import { Conversation, ConversationSchema } from "../schemas/conversation.schema";
import { WABAAccount, WABAAccountSchema } from "../schemas/waba-account.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { ApiKeysModule } from "../api-keys/api-keys.module";
import { PublicApiService } from "./public-api.service";
import { PublicApiController } from "./public-api.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contact.name, schema: ContactSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: WABAAccount.name, schema: WABAAccountSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ApiKeysModule,
  ],
  providers: [PublicApiService],
  controllers: [PublicApiController],
})
export class PublicApiModule {}
