import { Router } from "express";
import { validationMiddleware } from "../../middlewares/error.middleware";
import {
  approveMarketForTrading,
  castFreeVote,
  executeMarketTrade,
  fetchMarketDetail,
  fetchMarkets,
  fetchMarketPositions,
  fetchMarketTrades,
} from "./markets.controller";
import { freeVoteDto, marketParamDto, positionsQueryDto, tradeDto } from "./markets.dto";

const router = Router();

router.get("/", fetchMarkets);
router.get("/:marketId", marketParamDto, validationMiddleware, fetchMarketDetail);
router.get("/:marketId/positions", positionsQueryDto, validationMiddleware, fetchMarketPositions);
router.get("/:marketId/trades", marketParamDto, validationMiddleware, fetchMarketTrades);
router.post("/:marketId/vote", freeVoteDto, validationMiddleware, castFreeVote);
router.post("/:marketId/free-vote", freeVoteDto, validationMiddleware, castFreeVote);
router.post("/:marketId/approve-trading", marketParamDto, validationMiddleware, approveMarketForTrading);
router.post("/:marketId/trade", tradeDto, validationMiddleware, executeMarketTrade);

export default router;
