import type { NextFunction, Request, Response } from "express";
import { created, ok } from "../../utils/response";
import * as commentsService from "./comments.service";

export async function fetchPostComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const comments = await commentsService.fetchPostComments(String(req.query.postId));
    ok(res, comments);
  } catch (error) {
    next(error);
  }
}

export async function addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await commentsService.addComment(req.body.postId, req.body.profileId, req.body.content);
    created(res, null, "Comment added.");
  } catch (error) {
    next(error);
  }
}
