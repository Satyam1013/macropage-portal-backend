import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  app.enableCors();
  app.setGlobalPrefix("api/v1");

  const config = app.get(ConfigService);
  const port = config.get<number>("PORT", 4000);

  await app.listen(port);
  console.log(`macropage-backend running on port ${port}`);
}

void bootstrap();
