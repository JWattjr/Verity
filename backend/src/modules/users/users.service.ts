import { HttpError } from "../../utils/http-error";
import { UserModel, type UserDocument } from "./users.model";

export const DEV_USERNAME = "JudeSignal";

export interface UserResponse {
  id: string;
  wallet_address: string | null;
  walletAddress: string | null;
  username: string;
  display_name: string | null;
  displayName: string | null;
  avatar_url: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  signalPoints: number;
  freeVotesCorrect: number;
  freeVotesWrong: number;
  freeVotesTotal: number;
  created_at: string;
  createdAt: string;
  updatedAt: string;
}

function normalizeWallet(address: string): string {
  return address.trim().toLowerCase();
}

function defaultUsername(address: string): string {
  return `user_${address.slice(-4).toLowerCase()}_${Math.floor(Math.random() * 9000 + 1000)}`;
}

export function serializeUser(user: UserDocument): UserResponse {
  const createdAt = user.createdAt.toISOString();
  const updatedAt = user.updatedAt.toISOString();

  return {
    id: user.id,
    wallet_address: user.walletAddress,
    walletAddress: user.walletAddress,
    username: user.username,
    display_name: user.displayName,
    displayName: user.displayName,
    avatar_url: user.avatarUrl,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    signalPoints: user.signalPoints,
    freeVotesCorrect: user.freeVotesCorrect,
    freeVotesWrong: user.freeVotesWrong,
    freeVotesTotal: user.freeVotesTotal,
    created_at: createdAt,
    createdAt,
    updatedAt,
  };
}

export async function ensureDevUser(): Promise<UserResponse> {
  const user = await UserModel.findOneAndUpdate(
    { username: DEV_USERNAME },
    {
      $setOnInsert: {
        username: DEV_USERNAME,
        displayName: DEV_USERNAME,
        walletAddress: "dev-judesignal",
        bio: "Development user for local Verity testing.",
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  return serializeUser(user);
}

export function getDevUser(): Promise<UserResponse> {
  return ensureDevUser();
}

export async function getOrCreateByWallet(walletAddress: string): Promise<UserResponse> {
  const wallet = normalizeWallet(walletAddress);
  const existing = await UserModel.findOne({ walletAddress: wallet });
  if (existing) return serializeUser(existing);

  const created = await UserModel.create({
    walletAddress: wallet,
    username: defaultUsername(wallet),
    displayName: `User ${wallet.slice(-4).toUpperCase()}`,
  });

  return serializeUser(created);
}

export async function updateUser(
  id: string,
  input: Pick<UserResponse, "username" | "display_name" | "avatar_url" | "bio">,
): Promise<UserResponse> {
  const updated = await UserModel.findByIdAndUpdate(
    id,
    {
      username: input.username,
      displayName: input.display_name || null,
      avatarUrl: input.avatar_url || null,
      bio: input.bio || null,
    },
    { new: true, runValidators: true },
  );

  if (!updated) throw new HttpError(404, "User not found.");
  return serializeUser(updated);
}

export async function findUserById(id: string): Promise<UserDocument> {
  const user = await UserModel.findById(id);
  if (!user) throw new HttpError(404, "User not found.");
  return user;
}
