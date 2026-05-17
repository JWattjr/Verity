import { model, Schema, Types, type HydratedDocument } from "mongoose";

export type PostType = "normal" | "market";

export interface IPost {
  authorId: Types.ObjectId;
  type: PostType;
  content: string;
  likesCount: number;
  commentsCount: number;
  resharesCount: number;
  sharesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PostDocument = HydratedDocument<IPost>;

const postSchema = new Schema<IPost>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["normal", "market"], required: true },
    content: { type: String, required: true, trim: true },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    resharesCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

postSchema.index({ createdAt: -1 });

export const PostModel = model<IPost>("Post", postSchema);
