import type { SortOrder } from "mongoose";
import { HttpError } from "../../utils/http-error";
import { PostModel } from "../posts/posts.model";
import { fetchFeed, serializeMarket, type MarketResponse } from "../posts/posts.service";
import { UserModel } from "../users/users.model";
import {
  DailyVoteUsageModel,
  MarketModel,
  MarketPositionModel,
  MarketTradeModel,
  VoteModel,
  type DailyVoteUsageDocument,
  type MarketPositionDocument,
  type MarketTradeAction,
  type MarketTradeDocument,
  type MarketStatus,
  type VoteSide,
} from "./markets.model";

export interface DailyVotesResponse {
  votesLimit: number;
  votesUsed: number;
  votesRemaining: number;
  date: string;
}

export interface VoteResponse {
  market: MarketResponse;
  dailyVotes: DailyVotesResponse;
}

export interface MarketPositionResponse {
  id: string;
  market_id: string;
  user_id: string;
  side: VoteSide;
  shares: number;
  avg_price: number;
  invested_usdc: number;
  realized_pnl: number;
  created_at: string;
  updated_at: string;
}

export interface MarketTradeResponse {
  id: string;
  market_id: string;
  user_id: string;
  side: VoteSide;
  action: MarketTradeAction;
  shares: number;
  price: number;
  amount_usdc: number;
  fee_usdc: number;
  gross_usdc: number;
  tx_hash: string | null;
  created_at: string;
}

function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function serializeDailyUsage(usage: DailyVoteUsageDocument | null, date = todayKey()): DailyVotesResponse {
  const votesLimit = usage?.votesLimit ?? 10;
  const votesUsed = usage?.votesUsed ?? 0;
  return {
    votesLimit,
    votesUsed,
    votesRemaining: Math.max(0, votesLimit - votesUsed),
    date,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function getDailyVotes(userId: string, date = todayKey()): Promise<DailyVotesResponse> {
  const usage = await DailyVoteUsageModel.findOne({ userId, date });
  return serializeDailyUsage(usage, date);
}

async function getOrCreateDailyUsage(userId: string, date = todayKey()): Promise<DailyVoteUsageDocument> {
  return DailyVoteUsageModel.findOneAndUpdate(
    { userId, date },
    { $setOnInsert: { userId, date, votesUsed: 0, votesLimit: 10 } },
    { upsert: true, new: true, runValidators: true },
  );
}

async function reserveDailyVote(userId: string, date = todayKey()): Promise<DailyVoteUsageDocument> {
  await getOrCreateDailyUsage(userId, date);

  const usage = await DailyVoteUsageModel.findOneAndUpdate(
    {
      userId,
      date,
      $expr: { $lt: ["$votesUsed", "$votesLimit"] },
    },
    { $inc: { votesUsed: 1 } },
    { new: true, runValidators: true },
  );

  if (!usage) {
    throw new HttpError(409, "You have used all 10 votes today. Votes reset tomorrow.");
  }

  return usage;
}

async function releaseDailyVote(userId: string, date = todayKey()): Promise<void> {
  await DailyVoteUsageModel.updateOne(
    { userId, date, votesUsed: { $gt: 0 } },
    { $inc: { votesUsed: -1 } },
  );
}

export async function castFreeVote(marketId: string, userId: string, side: VoteSide): Promise<VoteResponse> {
  const [market, user] = await Promise.all([
    MarketModel.findById(marketId),
    UserModel.exists({ _id: userId }),
  ]);

  if (!market) throw new HttpError(404, "Market not found.");
  if (!user) throw new HttpError(404, "User not found.");
  if (!["open_for_votes", "qualified"].includes(market.status)) {
    throw new HttpError(409, "This market is not open for free voting.");
  }

  const existingVote = await VoteModel.exists({ marketId, userId, voteType: "free" });
  if (existingVote) throw new HttpError(409, "You have already voted on this market.");

  const usageDate = todayKey();
  const usage = await reserveDailyVote(userId, usageDate);
  try {
    await VoteModel.create({
      marketId,
      userId,
      side,
      voteType: "free",
    });
  } catch (error) {
    await releaseDailyVote(userId, usageDate);
    if (isDuplicateKeyError(error)) {
      throw new HttpError(409, "You have already voted on this market.");
    }
    throw error;
  }

  const [freeYesVotes, freeNoVotes, uniqueVotersCount] = await Promise.all([
    VoteModel.countDocuments({ marketId, voteType: "free", side: "YES" }),
    VoteModel.countDocuments({ marketId, voteType: "free", side: "NO" }),
    VoteModel.distinct("userId", { marketId, voteType: "free" }).then((ids) => ids.length),
  ]);
  const totalFreeVotes = freeYesVotes + freeNoVotes;
  const nextStatus =
    totalFreeVotes >= market.qualificationThreshold && uniqueVotersCount >= market.uniqueVoterThreshold
      ? "qualified"
      : market.status;

  const updatedMarket = await MarketModel.findByIdAndUpdate(
    marketId,
    {
      freeYesVotes,
      freeNoVotes,
      totalFreeVotes,
      uniqueVotersCount,
      status: nextStatus,
    },
    { new: true, runValidators: true },
  );

  return {
    market: serializeMarket(updatedMarket!),
    dailyVotes: serializeDailyUsage(usage, usageDate),
  };
}

export async function fetchMarkets(filters: {
  status?: MarketStatus;
  category?: string;
  qualified?: boolean;
  open_for_votes?: boolean;
  trending?: boolean;
  newest?: boolean;
}): Promise<MarketResponse[]> {
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.category) query.category = filters.category;
  if (filters.qualified) query.status = "qualified";
  if (filters.open_for_votes) query.status = "open_for_votes";

  const sort: Record<string, SortOrder> = filters.trending
    ? { totalFreeVotes: -1, uniqueVotersCount: -1, createdAt: -1 }
    : { createdAt: filters.newest === false ? 1 : -1 };

  const markets = await MarketModel.find(query).sort(sort).limit(100);
  return markets.map(serializeMarket);
}

export async function fetchMarketDetail(marketId: string, viewerProfileId?: string) {
  const market = await MarketModel.findById(marketId);
  if (!market) throw new HttpError(404, "Market not found.");

  const feed = await fetchFeed(viewerProfileId, true);
  const feedItem = feed.find((item) => item.market?.id === market.id);
  if (feedItem) return feedItem;

  const post = await PostModel.findById(market.postId);
  if (!post) throw new HttpError(404, "Market post not found.");
  return {
    id: post.id,
    authorId: market.authorId.toString(),
    author_id: market.authorId.toString(),
    type: "market",
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    created_at: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    likesCount: 0,
    commentsCount: post.commentsCount,
    resharesCount: post.resharesCount,
    sharesCount: post.sharesCount,
    author: null,
    market: serializeMarket(market),
    viewerLiked: false,
    viewerReshared: false,
    viewerVote: null,
  };
}

export async function approveMarketForTrading(marketId: string): Promise<MarketResponse> {
  const market = await MarketModel.findById(marketId);
  if (!market) throw new HttpError(404, "Market not found.");
  if (market.status === "tradable") return serializeMarket(market);
  if (market.status !== "qualified") {
    throw new HttpError(409, "Only qualified markets can be approved for USDC trading.");
  }

  const updatedMarket = await MarketModel.findByIdAndUpdate(
    marketId,
    { status: "tradable" },
    { new: true, runValidators: true },
  );

  return serializeMarket(updatedMarket!);
}

function serializePosition(position: MarketPositionDocument): MarketPositionResponse {
  return {
    id: position.id,
    market_id: position.marketId.toString(),
    user_id: position.userId.toString(),
    side: position.side,
    shares: position.shares,
    avg_price: position.avgPrice,
    invested_usdc: position.investedUsdc,
    realized_pnl: position.realizedPnl,
    created_at: position.createdAt.toISOString(),
    updated_at: position.updatedAt.toISOString(),
  };
}

function serializeTrade(trade: MarketTradeDocument): MarketTradeResponse {
  return {
    id: trade.id,
    market_id: trade.marketId.toString(),
    user_id: trade.userId.toString(),
    side: trade.side,
    action: trade.action,
    shares: trade.shares,
    price: trade.price,
    amount_usdc: trade.amountUsdc,
    fee_usdc: trade.feeUsdc,
    gross_usdc: trade.grossUsdc,
    tx_hash: trade.txHash,
    created_at: trade.createdAt.toISOString(),
  };
}

export async function fetchMarketPositions(marketId: string, profileId: string): Promise<MarketPositionResponse[]> {
  const positions = await MarketPositionModel.find({
    marketId,
    userId: profileId,
    shares: { $gt: 0 },
  }).sort({ updatedAt: -1 });

  return positions.map(serializePosition);
}

export async function fetchMarketTrades(marketId: string): Promise<MarketTradeResponse[]> {
  const trades = await MarketTradeModel.find({ marketId })
    .sort({ createdAt: -1 })
    .limit(25);

  return trades.map(serializeTrade);
}

export async function executeMarketTrade(_input?: unknown): Promise<void> {
  void _input;
  throw new HttpError(501, "USDC trading is not implemented in this phase.");
}
