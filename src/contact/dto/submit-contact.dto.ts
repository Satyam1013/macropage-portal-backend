import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class SubmitContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  email!: string;

  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: "phone must be in international format, e.g. +919876543210",
  })
  phone!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;

  @IsString()
  emailProof!: string;

  @IsString()
  phoneProof!: string;
}
