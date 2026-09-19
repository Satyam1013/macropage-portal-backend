import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class SendPhoneOtpDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: "phone must be in international format, e.g. +919876543210",
  })
  phone!: string;
}
