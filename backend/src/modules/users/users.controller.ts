import type { NextFunction, Request, Response } from "express";
import { ok } from "../../utils/response";
import { getDailyVotes } from "../markets/markets.service";
import * as usersService from "./users.service";

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || "";
}

export async function getOrCreateWalletUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getOrCreateByWallet(readParam(req.params.walletAddress));
    ok(res, user);
  } catch (error) {
    next(error);
  }
}

export async function getDevUser(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getDevUser();
    ok(res, user);
  } catch (error) {
    next(error);
  }
}

export async function getUserDailyVotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dailyVotes = await getDailyVotes(readParam(req.params.id));
    ok(res, dailyVotes);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.updateUser(readParam(req.params.id), req.body);
    ok(res, user, "Profile updated.");
  } catch (error) {
    next(error);
  }
}
