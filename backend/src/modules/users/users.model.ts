import { model, Schema, type HydratedDocument } from "mongoose";

export interface IUser {
  walletAddress: string | null;
  email: string | null;
  passwordHash: string | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  signalPoints: number;
  freeVotesCorrect: number;
  freeVotesWrong: number;
  freeVotesTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    walletAddress: { type: String, trim: true, lowercase: true },
    email: { type: String, trim: true, lowercase: true },
    passwordHash: { type: String, default: null },
    username: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, default: null, trim: true },
    avatarUrl: { type: String, default: null, trim: true },
    bio: { type: String, default: null, trim: true },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    signalPoints: { type: Number, default: 0 },
    freeVotesCorrect: { type: Number, default: 0 },
    freeVotesWrong: { type: Number, default: 0 },
    freeVotesTotal: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

userSchema.index(
  { walletAddress: 1 },
  { unique: true, partialFilterExpression: { walletAddress: { $type: "string" } } },
);
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } },
);

export const UserModel = model<IUser>("User", userSchema);
