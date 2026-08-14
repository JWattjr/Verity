import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator"

export class ListPolymarketEventsDto {
  @IsOptional()
  @IsString()
  sport?: string

  @IsOptional()
  @IsString()
  tagId?: string

  @IsOptional()
  @IsString()
  marketType?: string

  @IsOptional()
  @IsString()
  cursor?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20
}
