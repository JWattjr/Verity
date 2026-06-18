import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsNotEmpty, IsNumber, IsString, IsUrl, IsBoolean, IsOptional, Min } from "class-validator"

export class CreateMissionDto {
  @ApiProperty({ example: "Follow Twitter" })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiPropertyOptional({ example: "Follow us on Twitter to earn 100 XP" })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  xpReward: number

  @ApiProperty({ example: "https://twitter.com/verity" })
  @IsString()
  @IsNotEmpty()
  actionUrl: string
}

export class UpdateMissionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  xpReward?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  actionUrl?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
