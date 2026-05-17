import { model, Schema, Types } from "mongoose";

interface IInteraction {
  postId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const interactionFields = {
  postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  createdAt: { type: Date, default: Date.now },
};

const likeSchema = new Schema<IInteraction>(interactionFields, { versionKey: false });
const reshareSchema = new Schema<IInteraction>(interactionFields, { versionKey: false });

likeSchema.index({ postId: 1, userId: 1 }, { unique: true });
reshareSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const LikeModel = model<IInteraction>("Like", likeSchema);
export const ReshareModel = model<IInteraction>("Reshare", reshareSchema);
