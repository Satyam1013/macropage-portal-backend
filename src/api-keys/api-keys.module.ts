import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { APIKey, APIKeySchema } from "../schemas/api-key.schema";
import { ApiKeysService } from "./api-keys.service";
import { ApiKeysController } from "./api-keys.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: APIKey.name, schema: APIKeySchema }]),
    AuthModule,
  ],
  providers: [ApiKeysService],
  controllers: [ApiKeysController],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
