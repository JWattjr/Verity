import { model, Schema, Types, type HydratedDocument } from "mongoose";

export type VoteSide = "YES" | "NO";
export type VoteType = "free" | "usdc";
export type MarketTradeAction = "BUY" | "SELL";
export type MarketStatus =
  | "draft"
  | "open_for_votes"
  | "qualified"
  | "tradable"
  | "closed"
  | "resolving"
  | "resolved"
  | "voided";

export interface IMarket {
  postId: Types.ObjectId;
  authorId: Types.ObjectId;
  question: string;
  category: string;
  deadline: Date;
  resolutionSource: string;
  yesCondition: string;
  noCondition: string;
  status: MarketStatus;
  freeYesVotes: number;
  freeNoVotes: number;
  totalFreeVotes: number;
  uniqueVotersCount: number;
  qualificationThreshold: number;
  uniqueVoterThreshold: number;
  marketCreationFeeUsdc: number;
  creationFeeTxHash: string | null;
  feeCollectorAddress: string | null;
  usdcYesAmount: number;
  usdcNoAmount: number;
  liquidity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVote {
  marketId: Types.ObjectId;
  userId: Types.ObjectId;
  side: VoteSide;
  voteType: VoteType;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDailyVoteUsage {
  userId: Types.ObjectId;
  date: string;
  votesUsed: number;
  votesLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMarketPosition {
  marketId: Types.ObjectId;
  userId: Types.ObjectId;
  side: VoteSide;
  shares: number;
  avgPrice: number;
  investedUsdc: number;
  realizedPnl: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMarketTrade {
  marketId: Types.ObjectId;
  userId: Types.ObjectId;
  side: VoteSide;
  action: MarketTradeAction;
  shares: number;
  price: number;
  amountUsdc: number;
  feeUsdc: number;
  grossUsdc: number;
  txHash: string | null;
  createdAt: Date;
}

export type MarketDocument = HydratedDocument<IMarket>;
export type VoteDocument = HydratedDocument<IVote>;
export type DailyVoteUsageDocument = HydratedDocument<IDailyVoteUsage>;
export type MarketPositionDocument = HydratedDocument<IMarketPosition>;
export type MarketTradeDocument = HydratedDocument<IMarketTrade>;

const marketSchema = new Schema<IMarket>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, unique: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    question: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    deadline: { type: Date, required: true, index: true },
    resolutionSource: { type: String, required: true, trim: true },
    yesCondition: { type: String, required: true, trim: true },
    noCondition: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["draft", "open_for_votes", "qualified", "tradable", "closed", "resolving", "resolved", "voided"],
      default: "open_for_votes",
      index: true,
    },
    freeYesVotes: { type: Number, default: 0 },
    freeNoVotes: { type: Number, default: 0 },
    totalFreeVotes: { type: Number, default: 0 },
    uniqueVotersCount: { type: Number, default: 0 },
    qualificationThreshold: { type: Number, default: 50 },
    uniqueVoterThreshold: { type: Number, default: 30 },
    marketCreationFeeUsdc: { type: Number, default: 1 },
    creationFeeTxHash: { type: String, default: null, trim: true },
    feeCollectorAddress: { type: String, default: null, trim: true },
    usdcYesAmount: { type: Number, default: 0 },
    usdcNoAmount: { type: Number, default: 0 },
    liquidity: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

marketSchema.index(
  { creationFeeTxHash: 1 },
  { unique: true, partialFilterExpression: { creationFeeTxHash: { $type: "string" } } },
);

const voteSchema = new Schema<IVote>(
  {
    marketId: { type: Schema.Types.ObjectId, ref: "Market", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    side: { type: String, enum: ["YES", "NO"], required: true },
    voteType: { type: String, enum: ["free", "usdc"], default: "free" },
    amount: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

voteSchema.index({ marketId: 1, userId: 1, voteType: 1 }, { unique: true });

const dailyVoteUsageSchema = new Schema<IDailyVoteUsage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true },
    votesUsed: { type: Number, default: 0, min: 0, max: 10 },
    votesLimit: { type: Number, default: 10 },
  },
  { timestamps: true, versionKey: false },
);

dailyVoteUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

const marketPositionSchema = new Schema<IMarketPosition>(
  {
    marketId: { type: Schema.Types.ObjectId, ref: "Market", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    side: { type: String, enum: ["YES", "NO"], required: true },
    shares: { type: Number, default: 0 },
    avgPrice: { type: Number, default: 0 },
    investedUsdc: { type: Number, default: 0 },
    realizedPnl: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

marketPositionSchema.index({ marketId: 1, userId: 1, side: 1 }, { unique: true });

const marketTradeSchema = new Schema<IMarketTrade>(
  {
    marketId: { type: Schema.Types.ObjectId, ref: "Market", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    side: { type: String, enum: ["YES", "NO"], required: true },
    action: { type: String, enum: ["BUY", "SELL"], required: true },
    shares: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    amountUsdc: { type: Number, default: 0 },
    feeUsdc: { type: Number, default: 0 },
    grossUsdc: { type: Number, default: 0 },
    txHash: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

export const MarketModel = model<IMarket>("Market", marketSchema);
export const VoteModel = model<IVote>("Vote", voteSchema);
export const DailyVoteUsageModel = model<IDailyVoteUsage>("DailyVoteUsage", dailyVoteUsageSchema);
export const MarketPositionModel = model<IMarketPosition>("MarketPosition", marketPositionSchema);
export const MarketTradeModel = model<IMarketTrade>("MarketTrade", marketTradeSchema);
