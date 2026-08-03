import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type TmaUserDocument = TmaUser & Document
export type TmaReferralDocument = TmaReferral & Document
export type TmaShareClickDocument = TmaShareClick & Document

@Schema({ timestamps: true, collection: "tma_users" })
export class TmaUser {
  @Prop({ required: true, unique: true, index: true })
  telegramId: string

  @Prop({ type: String, default: null })
  username: string | null

  @Prop({ type: String, default: null })
  club: string | null

  @Prop({ type: String, default: null })
  referredBy: string | null

  @Prop({ type: Number, default: 0 })
  postLaunchDuels: number
}

export const TmaUserSchema = SchemaFactory.createForClass(TmaUser)

@Schema({ timestamps: true, collection: "tma_referrals" })
export class TmaReferral {
  @Prop({ required: true, index: true })
  referrerId: string

  @Prop({ required: true, unique: true, index: true })
  referredId: string

  @Prop({
    required: true,
    enum: ["pending", "activated"],
    default: "pending",
    index: true,
  })
  status: "pending" | "activated"

  @Prop({ type: Number, default: null })
  ticketSlot: number | null

  @Prop({ type: Date, default: null })
  activatedAt: Date | null
}

export const TmaReferralSchema = SchemaFactory.createForClass(TmaReferral)
TmaReferralSchema.index({ referrerId: 1, status: 1 })

@Schema({ timestamps: true, collection: "tma_share_clicks" })
export class TmaShareClick {
  @Prop({ required: true, index: true })
  telegramId: string

  @Prop({ required: true, enum: ["copy", "share"] })
  method: "copy" | "share"
}

export const TmaShareClickSchema = SchemaFactory.createForClass(TmaShareClick)
