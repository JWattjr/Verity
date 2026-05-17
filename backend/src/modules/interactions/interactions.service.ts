import { HttpError } from "../../utils/http-error";
import { PostModel } from "../posts/posts.model";
import { UserModel } from "../users/users.model";
import { LikeModel, ReshareModel } from "./interactions.model";

async function assertTargets(postId: string, profileId: string): Promise<void> {
  const [post, profile] = await Promise.all([
    PostModel.exists({ _id: postId }),
    UserModel.exists({ _id: profileId }),
  ]);

  if (!post) throw new HttpError(404, "Post not found.");
  if (!profile) throw new HttpError(404, "Profile not found.");
}

export async function toggleLike(postId: string, profileId: string, currentlyActive: boolean): Promise<void> {
  const post = await PostModel.findById(postId);
  if (!post) throw new HttpError(404, "Post not found.");
  if (post.type === "market") throw new HttpError(409, "Market posts use upvotes/downvotes, not likes.");

  const profile = await UserModel.exists({ _id: profileId });
  if (!profile) throw new HttpError(404, "Profile not found.");

  if (currentlyActive) {
    const deleted = await LikeModel.deleteOne({ postId, userId: profileId });
    if (deleted.deletedCount > 0) await PostModel.updateOne({ _id: postId }, { $inc: { likesCount: -1 } });
    return;
  }

  const result = await LikeModel.updateOne(
    { postId, userId: profileId },
    { $setOnInsert: { postId, userId: profileId } },
    { upsert: true },
  );
  if (result.upsertedCount > 0) await PostModel.updateOne({ _id: postId }, { $inc: { likesCount: 1 } });
}

export async function toggleReshare(postId: string, profileId: string, currentlyActive: boolean): Promise<void> {
  await assertTargets(postId, profileId);

  if (currentlyActive) {
    const deleted = await ReshareModel.deleteOne({ postId, userId: profileId });
    if (deleted.deletedCount > 0) await PostModel.updateOne({ _id: postId }, { $inc: { resharesCount: -1 } });
    return;
  }

  const result = await ReshareModel.updateOne(
    { postId, userId: profileId },
    { $setOnInsert: { postId, userId: profileId } },
    { upsert: true },
  );
  if (result.upsertedCount > 0) await PostModel.updateOne({ _id: postId }, { $inc: { resharesCount: 1 } });
}
