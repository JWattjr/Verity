import { IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator"

export class OpenPrelaunchSessionDto {
  @IsString()
  initData: string

  @IsOptional()
  @IsString()
  @Matches(/^ref_\d+$/)
  referralCode?: string
}

export class SelectClubDto {
  @IsString()
  initData: string

  @IsString()
  @MaxLength(60)
  club: string
}

export class TrackShareClickDto {
  @IsString()
  initData: string

  @IsIn(["copy", "share"])
  method: "copy" | "share"
}

export class RecordPrelaunchDuelDto {
  @IsString()
  @Matches(/^\d+$/)
  telegramId: string
}
