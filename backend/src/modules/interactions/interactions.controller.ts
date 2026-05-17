import type { NextFunction, Request, Response } from "express";
import { ok } from "../../utils/response";
import * as interactionsService from "./interactions.service";

export async function toggleLike(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await interactionsService.toggleLike(req.body.postId, req.body.profileId, req.body.currentlyActive);
    ok(res, null, "Like updated.");
  } catch (error) {
    next(error);
  }
}

export async function toggleReshare(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await interactionsService.toggleReshare(req.body.postId, req.body.profileId, req.body.currentlyActive);
    ok(res, null, "Reshare updated.");
  } catch (error) {
    next(error);
  }
}
