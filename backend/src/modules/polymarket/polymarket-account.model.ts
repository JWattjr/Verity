import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose"
import {
  PolymarketApprovalState,
  PolymarketBridgeAddresses,
  PolymarketBridgeTransaction,
  PolymarketProvisioningStatus,
} from "./polymarket-account.types"

export type PolymarketAccountDocument = HydratedDocument<PolymarketAccount>

@Schema({ _id: false })
export class PolymarketApproval {
  @Prop({ type: String, required: true, lowercase: true })
  spender: string

  @Prop({ type: Boolean, required: true, default: false })
  collateralApproved: boolean

  @Prop({ type: Boolean, required: true, default: false })
  conditionalTokensApproved: boolean

  @Prop({ type: Date, required: true })
  checkedAt: Date
}

const PolymarketApprovalSchema =
  SchemaFactory.createForClass(PolymarketApproval)

@Schema({ _id: false })
export class PolymarketBridgeAddressSet {
  @Prop({ type: String, required: true })
  evm: string

  @Prop({ type: String, required: true })
  svm: string

  @Prop({ type: String, required: true })
  btc: string

  @Prop({ type: String, required: true })
  tron: string
}

const PolymarketBridgeAddressSetSchema = SchemaFactory.createForClass(
  PolymarketBridgeAddressSet,
)

@Schema({ timestamps: true, versionKey: false })
export class PolymarketAccount {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  })
  userId: Types.ObjectId

  @Prop({ type: Number, required: true, default: 137, immutable: true })
  chainId: number

  @Prop({ type: String, required: true, default: "MATIC", immutable: true })
  circleBlockchain: string

  @Prop({
    type: String,
    required: true,
    enum: Object.values(PolymarketProvisioningStatus),
    default: PolymarketProvisioningStatus.Uninitialized,
    index: true,
  })
  status: PolymarketProvisioningStatus

  @Prop({ type: String, required: true, immutable: true })
  circleWalletIdempotencyKey: string

  @Prop({ type: String, default: null, trim: true, index: true })
  circleWalletId: string | null

  @Prop({
    type: String,
    default: null,
    trim: true,
    lowercase: true,
  })
  circleWalletAddress: string | null

  @Prop({ type: String, default: null, select: false })
  clobCredentialsEncrypted: string | null

  @Prop({ type: Number, required: true, default: 0 })
  clobCredentialNonce: number

  @Prop({
    type: String,
    default: null,
    trim: true,
    lowercase: true,
  })
  depositWalletAddress: string | null

  @Prop({ type: String, default: null, trim: true, lowercase: true })
  deploymentTransactionHash: string | null

  @Prop({ type: String, default: null, trim: true, lowercase: true })
  approvalTransactionHash: string | null

  @Prop({ type: [PolymarketApprovalSchema], default: [] })
  approvals: PolymarketApprovalState[]

  @Prop({ type: PolymarketBridgeAddressSetSchema, default: null })
  bridgeAddresses: PolymarketBridgeAddresses | null

  @Prop({ type: String, required: true, default: "0" })
  pusdBalanceBaseUnits: string

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  fundingTransactions: PolymarketBridgeTransaction[]

  @Prop({ type: Date, default: null })
  fundingReconciledAt: Date | null

  @Prop({ type: String, default: null })
  provisioningLeaseId: string | null

  @Prop({ type: Date, default: null, index: true })
  provisioningLeaseUntil: Date | null

  @Prop({ type: Number, required: true, default: 0 })
  provisioningAttempts: number

  @Prop({ type: String, default: null })
  lastErrorCode: string | null

  @Prop({ type: String, default: null })
  lastErrorMessage: string | null

  @Prop({ type: Date, default: null })
  lastErrorAt: Date | null

  @Prop({ type: Date, default: null })
  readyAt: Date | null

  createdAt?: Date
  updatedAt?: Date
}

export const PolymarketAccountSchema =
  SchemaFactory.createForClass(PolymarketAccount)

PolymarketAccountSchema.index(
  { circleWalletAddress: 1 },
  {
    unique: true,
    partialFilterExpression: { circleWalletAddress: { $type: "string" } },
  },
)
PolymarketAccountSchema.index(
  { depositWalletAddress: 1 },
  {
    unique: true,
    partialFilterExpression: { depositWalletAddress: { $type: "string" } },
  },
)
