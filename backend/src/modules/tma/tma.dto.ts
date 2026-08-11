import { ApiProperty } from "@nestjs/swagger"
import {
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator"

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
  @ApiProperty({ description: "Telegram user ID that completed the duel" })
  @IsString()
  @IsNotEmpty()
  telegramId: string

  @ApiProperty({ description: "Unique resolved PvP match ID" })
  @IsMongoId()
  matchId: string
}

export class LinkTmaAccountDto {
  @ApiProperty({ description: "Signed Telegram initData string" })
  @IsString()
  @IsNotEmpty()
  initData: string
}
