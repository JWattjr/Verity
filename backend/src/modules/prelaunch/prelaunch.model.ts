import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument } from "mongoose"

export type PrelaunchUserDocument = HydratedDocument<PrelaunchUser>
export type PrelaunchReferralDocument = HydratedDocument<PrelaunchReferral>
export type PrelaunchShareClickDocument = HydratedDocument<PrelaunchShareClick>

@Schema({ collection: "prelaunch_users", versionKey: false })
export class PrelaunchUser {
  @Prop({ type: String, required: true, unique: true, index: true, trim: true })
  telegramId: string

  @Prop({ type: String, default: null, trim: true })
  username: string | null

  @Prop({ type: String, default: null, trim: true, index: true })
  club: string | null

  @Prop({ type: Date, default: Date.now, required: true, index: true })
  joinedAt: Date

  @Prop({ type: String, default: null, trim: true, index: true })
  referredBy: string | null

  @Prop({ type: Number, default: 0, min: 0 })
  postLaunchDuels: number
}

export const PrelaunchUserSchema = SchemaFactory.createForClass(PrelaunchUser)

@Schema({ collection: "prelaunch_referrals", versionKey: false })
export class PrelaunchReferral {
  @Prop({ type: String, required: true, index: true, trim: true })
  referrerId: string

  @Prop({ type: String, required: true, unique: true, index: true, trim: true })
  referredId: string

  @Prop({ type: Date, default: Date.now, required: true, index: true })
  createdAt: Date

  @Prop({
    type: String,
    enum: ["pending", "activated"],
    default: "pending",
    required: true,
    index: true,
  })
  status: "pending" | "activated"

  @Prop({ type: Date, default: null })
  activatedAt: Date | null

  @Prop({ type: Number, default: null, min: 1, max: 25 })
  ticketSlot: number | null
}

export const PrelaunchReferralSchema =
  SchemaFactory.createForClass(PrelaunchReferral)

PrelaunchReferralSchema.index({ referrerId: 1, status: 1 })
PrelaunchReferralSchema.index(
  { referrerId: 1, ticketSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { ticketSlot: { $type: "number" } },
  },
)

@Schema({ collection: "prelaunch_share_clicks", versionKey: false })
export class PrelaunchShareClick {
  @Prop({ type: String, required: true, index: true, trim: true })
  telegramId: string

  @Prop({ type: String, enum: ["copy", "share"], required: true })
  method: "copy" | "share"

  @Prop({ type: Date, default: Date.now, required: true, index: true })
  createdAt: Date
}

export const PrelaunchShareClickSchema =
  SchemaFactory.createForClass(PrelaunchShareClick)
