import type { NextFunction, Request, Response } from "express";
import { created, ok } from "../../utils/response";
import * as commentsService from "../comments/comments.service";
import * as interactionsService from "../interactions/interactions.service";
import * as postsService from "./posts.service";

interface FeedQuery {
  viewerProfileId?: string;
  userId?: string;
  onlyMarkets?: string;
}

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || "";
}

export async function fetchFeed(req: Request<unknown, unknown, unknown, FeedQuery>, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await postsService.fetchFeed(
      req.query.viewerProfileId || req.query.userId,
      req.query.onlyMarkets === "true",
    );
    ok(res, items);
  } catch (error) {
    next(error);
  }
}

export async function createNormalPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const post = await postsService.createNormalPost(req.body.authorId || req.body.profileId, req.body.content);
    created(res, post, "Post created.");
  } catch (error) {
    next(error);
  }
}

export async function createMarketPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await postsService.createMarketPost(req.body.authorId || req.body.profileId, req.body);
    created(res, result, result.warning || "Market created.");
  } catch (error) {
    next(error);
  }
}

export async function addPostComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await commentsService.addComment(readParam(req.params.postId), req.body.authorId || req.body.profileId, req.body.content);
    created(res, null, "Comment added.");
  } catch (error) {
    next(error);
  }
}

export async function likePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await interactionsService.toggleLike(readParam(req.params.postId), req.body.userId || req.body.profileId, Boolean(req.body.currentlyActive));
    ok(res, null, "Like updated.");
  } catch (error) {
    next(error);
  }
}

export async function resharePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await interactionsService.toggleReshare(readParam(req.params.postId), req.body.userId || req.body.profileId, Boolean(req.body.currentlyActive));
    ok(res, null, "Reshare updated.");
  } catch (error) {
    next(error);
  }
}
