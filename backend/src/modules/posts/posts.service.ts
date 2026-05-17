import { Types } from "mongoose";
import { HttpError } from "../../utils/http-error";
import { CommentModel } from "../comments/comments.model";
import { LikeModel, ReshareModel } from "../interactions/interactions.model";
import { MarketModel, VoteModel, type MarketDocument, type VoteSide } from "../markets/markets.model";
import { UserModel } from "../users/users.model";
import { serializeUser, type UserResponse } from "../users/users.service";
import { PostModel, type PostDocument, type PostType } from "./posts.model";

export interface MarketResponse {
  id: string;
  postId: string;
  post_id: string;
  authorId: string;
  author_id: string;
  question: string;
  category: string;
  deadline: string;
  resolutionSource: string;
  resolution_source: string;
  yesCondition: string;
  yes_condition: string;
  noCondition: string;
  no_condition: string;
  status: string;
  freeYesVotes: number;
  free_yes_votes: number;
  freeNoVotes: number;
  free_no_votes: number;
  totalFreeVotes: number;
  uniqueVotersCount: number;
  qualificationThreshold: number;
  uniqueVoterThreshold: number;
  marketCreationFeeUsdc: number;
  market_creation_fee_usdc: number;
  creationFeeTxHash: string | null;
  creation_fee_tx_hash: string | null;
  feeCollectorAddress: string | null;
  fee_collector_address: string | null;
  usdcYesAmount: number;
  usdc_yes_amount: number;
  usdcNoAmount: number;
  usdc_no_amount: number;
  liquidity: number;
  createdAt: string;
  created_at: string;
  updatedAt: string;
}

export interface FeedPostResponse {
  id: string;
  authorId: string;
  author_id: string;
  type: PostType;
  content: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  resharesCount: number;
  sharesCount: number;
  author: UserResponse;
  market: MarketResponse | null;
  viewerLiked: boolean;
  viewerReshared: boolean;
  viewerVote: VoteSide | null;
}

const VAGUE_WORDS = ["popular", "successful", "viral", "big", "famous", "good", "better", "important"];
export const MARKET_OUTCOME_WARNING =
  "Market posts need measurable outcomes. Define this with a number, deadline, and resolution source.";

export function getMarketWarning(question: string): string | null {
  const normalized = question.toLowerCase();
  return VAGUE_WORDS.some((word) => normalized.includes(word)) ? MARKET_OUTCOME_WARNING : null;
}

export function serializeMarket(market: MarketDocument): MarketResponse {
  const postId = market.postId.toString();
  const authorId = market.authorId.toString();
  const createdAt = market.createdAt.toISOString();

  return {
    id: market.id,
    postId,
    post_id: postId,
    authorId,
    author_id: authorId,
    question: market.question,
    category: market.category,
    deadline: market.deadline.toISOString(),
    resolutionSource: market.resolutionSource,
    resolution_source: market.resolutionSource,
    yesCondition: market.yesCondition,
    yes_condition: market.yesCondition,
    noCondition: market.noCondition,
    no_condition: market.noCondition,
    status: market.status,
    freeYesVotes: market.freeYesVotes,
    free_yes_votes: market.freeYesVotes,
    freeNoVotes: market.freeNoVotes,
    free_no_votes: market.freeNoVotes,
    totalFreeVotes: market.totalFreeVotes,
    uniqueVotersCount: market.uniqueVotersCount,
    qualificationThreshold: market.qualificationThreshold,
    uniqueVoterThreshold: market.uniqueVoterThreshold,
    marketCreationFeeUsdc: market.marketCreationFeeUsdc,
    market_creation_fee_usdc: market.marketCreationFeeUsdc,
    creationFeeTxHash: market.creationFeeTxHash,
    creation_fee_tx_hash: market.creationFeeTxHash,
    feeCollectorAddress: market.feeCollectorAddress,
    fee_collector_address: market.feeCollectorAddress,
    usdcYesAmount: market.usdcYesAmount,
    usdc_yes_amount: market.usdcYesAmount,
    usdcNoAmount: market.usdcNoAmount,
    usdc_no_amount: market.usdcNoAmount,
    liquidity: market.liquidity,
    createdAt,
    created_at: createdAt,
    updatedAt: market.updatedAt.toISOString(),
  };
}

function serializePost(post: PostDocument): Pick<
  FeedPostResponse,
  | "id"
  | "authorId"
  | "author_id"
  | "type"
  | "content"
  | "createdAt"
  | "created_at"
  | "updatedAt"
  | "likesCount"
  | "commentsCount"
  | "resharesCount"
  | "sharesCount"
> {
  const authorId = post.authorId.toString();
  const createdAt = post.createdAt.toISOString();

  return {
    id: post.id,
    authorId,
    author_id: authorId,
    type: post.type,
    content: post.content,
    createdAt,
    created_at: createdAt,
    updatedAt: post.updatedAt.toISOString(),
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    resharesCount: post.resharesCount,
    sharesCount: post.sharesCount,
  };
}

function fallbackProfile(authorId: string): UserResponse {
  const now = new Date().toISOString();
  return {
    id: authorId,
    wallet_address: null,
    walletAddress: null,
    username: "unknown",
    display_name: "Unknown",
    displayName: "Unknown",
    avatar_url: null,
    avatarUrl: null,
    bio: null,
    followersCount: 0,
    followingCount: 0,
    signalPoints: 0,
    freeVotesCorrect: 0,
    freeVotesWrong: 0,
    freeVotesTotal: 0,
    created_at: now,
    createdAt: now,
    updatedAt: now,
  };
}

export async function fetchFeed(viewerProfileId?: string, onlyMarkets = false): Promise<FeedPostResponse[]> {
  const posts = await PostModel.find(onlyMarkets ? { type: "market" } : {})
    .sort({ createdAt: -1 })
    .limit(50);

  const postIds = posts.map((post) => post._id);
  const authorIds = posts.map((post) => post.authorId);
  const [authors, markets] = await Promise.all([
    UserModel.find({ _id: { $in: authorIds } }),
    MarketModel.find({ postId: { $in: postIds } }),
  ]);

  const authorMap = new Map(authors.map((author) => [author.id, serializeUser(author)]));
  const marketMap = new Map(markets.map((market) => [market.postId.toString(), market]));
  const marketIds = markets.map((market) => market._id);

  const [likedIds, resharedIds, votes] = await Promise.all([
    viewerProfileId
      ? LikeModel.find({ userId: viewerProfileId, postId: { $in: postIds } }).select("postId")
      : Promise.resolve([]),
    viewerProfileId
      ? ReshareModel.find({ userId: viewerProfileId, postId: { $in: postIds } }).select("postId")
      : Promise.resolve([]),
    viewerProfileId
      ? VoteModel.find({ userId: viewerProfileId, marketId: { $in: marketIds }, voteType: "free" }).select("marketId side")
      : Promise.resolve([]),
  ]);

  const liked = new Set(likedIds.map((item) => item.postId.toString()));
  const reshared = new Set(resharedIds.map((item) => item.postId.toString()));
  const voteMap = new Map(votes.map((vote) => [vote.marketId.toString(), vote.side]));

  return posts.map((post) => {
    const base = serializePost(post);
    const market = marketMap.get(post.id) || null;

    return {
      ...base,
      author: authorMap.get(base.authorId) || fallbackProfile(base.authorId),
      market: market ? serializeMarket(market) : null,
      viewerLiked: liked.has(post.id),
      viewerReshared: reshared.has(post.id),
      viewerVote: market ? voteMap.get(market.id) || null : null,
    };
  });
}

export async function createNormalPost(authorId: string, content: string): Promise<FeedPostResponse> {
  const author = await UserModel.exists({ _id: authorId });
  if (!author) throw new HttpError(404, "User not found.");

  const post = await PostModel.create({
    authorId,
    type: "normal",
    content: content.trim(),
  });

  return (await fetchFeed(authorId)).find((item) => item.id === post.id)!;
}

export async function createMarketPost(authorId: string, input: {
  content?: string;
  question: string;
  category: string;
  deadline: string;
  resolutionSource: string;
  yesCondition: string;
  noCondition: string;
  creationFeeTxHash?: string;
  feeCollectorAddress?: string;
}): Promise<{ post: FeedPostResponse; warning: string | null }> {
  const author = await UserModel.exists({ _id: authorId });
  if (!author) throw new HttpError(404, "User not found.");
  if (!input.creationFeeTxHash?.trim()) {
    throw new HttpError(422, "Prediction posts require a 1 USDC Arc testnet creation transaction.");
  }
  if (!input.feeCollectorAddress?.trim()) {
    throw new HttpError(422, "Prediction posts require the Arc testnet fee collector address.");
  }

  const post = await PostModel.create({
    authorId,
    type: "market",
    content: input.content?.trim() || input.question.trim(),
  });

  await MarketModel.create({
    postId: post._id,
    authorId,
    question: input.question.trim(),
    category: input.category.trim(),
    deadline: new Date(input.deadline),
    resolutionSource: input.resolutionSource.trim(),
    yesCondition: input.yesCondition.trim(),
    noCondition: input.noCondition.trim(),
    marketCreationFeeUsdc: 1,
    creationFeeTxHash: input.creationFeeTxHash.trim(),
    feeCollectorAddress: input.feeCollectorAddress.trim(),
    status: "open_for_votes",
  });

  return {
    post: (await fetchFeed(authorId)).find((item) => item.id === post.id)!,
    warning: getMarketWarning(input.question),
  };
}

export async function incrementPostComments(postId: Types.ObjectId | string): Promise<void> {
  await PostModel.updateOne({ _id: postId }, { $inc: { commentsCount: 1 } });
}

export async function refreshPostCounters(postId: Types.ObjectId | string): Promise<void> {
  const [commentsCount, likesCount, resharesCount] = await Promise.all([
    CommentModel.countDocuments({ postId }),
    LikeModel.countDocuments({ postId }),
    ReshareModel.countDocuments({ postId }),
  ]);

  await PostModel.updateOne({ _id: postId }, { commentsCount, likesCount, resharesCount });
}
