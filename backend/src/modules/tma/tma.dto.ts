import { ApiProperty } from "@nestjs/swagger"
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator"

export class OpenTmaSessionDto {
  @ApiProperty({ description: "Signed Telegram initData string" })
  @IsString()
  @IsNotEmpty()
  initData: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referralCode?: string
}

export class SelectClubDto {
  @ApiProperty({ description: "Signed Telegram initData string" })
  @IsString()
  @IsNotEmpty()
  initData: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  club: string
}

export class TrackShareClickDto {
  @ApiProperty({ description: "Signed Telegram initData string" })
  @IsString()
  @IsNotEmpty()
  initData: string

  @ApiProperty({ enum: ["copy", "share"] })
  @IsIn(["copy", "share"])
  method: "copy" | "share"
}

export class RecordTmaDuelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  telegramId: string
}
