import { model, Schema, Types, type HydratedDocument } from "mongoose";

export interface IComment {
  postId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CommentDocument = HydratedDocument<IComment>;

const commentSchema = new Schema<IComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true },
    likesCount: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

export const CommentModel = model<IComment>("Comment", commentSchema);
