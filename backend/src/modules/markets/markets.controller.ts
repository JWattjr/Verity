import type { NextFunction, Request, Response } from "express";
import { ok } from "../../utils/response";
import * as marketsService from "./markets.service";

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || "";
}

export async function castFreeVote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await marketsService.castFreeVote(readParam(req.params.marketId), req.body.userId || req.body.profileId, req.body.side);
    ok(res, result, "Vote recorded.");
  } catch (error) {
    next(error);
  }
}

export async function fetchMarkets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const markets = await marketsService.fetchMarkets({
      status: typeof req.query.status === "string" ? req.query.status as never : undefined,
      category: typeof req.query.category === "string" ? req.query.category : undefined,
      trending: req.query.trending === "true",
      newest: req.query.newest !== "false",
      qualified: req.query.qualified === "true",
      open_for_votes: req.query.open_for_votes === "true",
    });
    ok(res, markets);
  } catch (error) {
    next(error);
  }
}

export async function fetchMarketDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const detail = await marketsService.fetchMarketDetail(
      readParam(req.params.marketId),
      typeof req.query.userId === "string" ? req.query.userId : undefined,
    );
    ok(res, detail);
  } catch (error) {
    next(error);
  }
}

export async function fetchDailyVotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dailyVotes = await marketsService.getDailyVotes(String(req.query.userId || req.body.userId || ""));
    ok(res, dailyVotes);
  } catch (error) {
    next(error);
  }
}

export async function fetchMarketPositions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const positions = await marketsService.fetchMarketPositions(readParam(req.params.marketId), String(req.query.profileId));
    ok(res, positions);
  } catch (error) {
    next(error);
  }
}

export async function fetchMarketTrades(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const trades = await marketsService.fetchMarketTrades(readParam(req.params.marketId));
    ok(res, trades);
  } catch (error) {
    next(error);
  }
}

export async function approveMarketForTrading(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const market = await marketsService.approveMarketForTrading(readParam(req.params.marketId));
    ok(res, market, "Market approved for USDC trading.");
  } catch (error) {
    next(error);
  }
}

export async function executeMarketTrade(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await marketsService.executeMarketTrade({
      marketId: readParam(req.params.marketId),
      profileId: req.body.profileId,
      side: req.body.side,
      action: req.body.action,
      amount: req.body.amount,
      feeAmount: req.body.feeAmount,
      grossAmount: req.body.grossAmount,
      txHash: req.body.txHash,
    });
    ok(res, null, "Trade recorded.");
  } catch (error) {
    next(error);
  }
}
