import { HttpError } from "../../utils/http-error";
import { PostModel } from "../posts/posts.model";
import { incrementPostComments } from "../posts/posts.service";
import { UserModel, type UserDocument } from "../users/users.model";
import { serializeUser, type UserResponse } from "../users/users.service";
import { CommentModel, type CommentDocument } from "./comments.model";

export interface CommentResponse {
  id: string;
  post_id: string;
  postId: string;
  author_id: string;
  authorId: string;
  content: string;
  likesCount: number;
  created_at: string;
  createdAt: string;
  updatedAt: string;
  author: UserResponse;
}

function fallbackProfile(authorId: string): UserResponse {
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
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function serializeComment(comment: CommentDocument, author?: UserDocument | null): CommentResponse {
  const authorId = comment.authorId.toString();
  const createdAt = comment.createdAt.toISOString();
  return {
    id: comment.id,
    post_id: comment.postId.toString(),
    postId: comment.postId.toString(),
    author_id: authorId,
    authorId,
    content: comment.content,
    likesCount: comment.likesCount,
    created_at: createdAt,
    createdAt,
    updatedAt: comment.updatedAt.toISOString(),
    author: author ? serializeUser(author) : fallbackProfile(authorId),
  };
}

export async function fetchPostComments(postId: string): Promise<CommentResponse[]> {
  const comments = await CommentModel.find({ postId }).sort({ createdAt: -1 }).limit(50);
  const authors = await UserModel.find({ _id: { $in: comments.map((comment) => comment.authorId) } });
  const authorMap = new Map(authors.map((author) => [author.id, author]));

  return comments.map((comment) => serializeComment(comment, authorMap.get(comment.authorId.toString())));
}

export async function addComment(postId: string, profileId: string, content: string): Promise<void> {
  const [post, author] = await Promise.all([
    PostModel.exists({ _id: postId }),
    UserModel.exists({ _id: profileId }),
  ]);

  if (!post) throw new HttpError(404, "Post not found.");
  if (!author) throw new HttpError(404, "Profile not found.");

  await CommentModel.create({
    postId,
    authorId: profileId,
    content: content.trim(),
  });
  await incrementPostComments(postId);
}
