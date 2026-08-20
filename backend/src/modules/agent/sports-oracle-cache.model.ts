import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument, Schema as MongooseSchema } from "mongoose"

export type SportsOracleCacheDocument = HydratedDocument<SportsOracleCache>

@Schema({ timestamps: true, versionKey: false })
export class SportsOracleCache {
  @Prop({ type: String, required: true, unique: true, index: true })
  key: string

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  data: unknown

  @Prop({ type: Date, default: null, index: true })
  expiresAt: Date | null
}

export const SportsOracleCacheSchema =
  SchemaFactory.createForClass(SportsOracleCache)
