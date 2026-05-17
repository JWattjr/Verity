import { body, param, query } from "express-validator";

export const marketParamDto = [
  param("marketId").isMongoId().withMessage("A valid market id is required."),
];

export const positionsQueryDto = [
  ...marketParamDto,
  query("profileId").isMongoId().withMessage("A valid profile id is required."),
];

export const freeVoteDto = [
  ...marketParamDto,
  body("userId").optional().isMongoId(),
  body("profileId").optional().isMongoId(),
  body("side").isIn(["YES", "NO"]).withMessage("Vote side must be YES or NO."),
];

export const tradeDto = [
  ...marketParamDto,
  body("profileId").isMongoId().withMessage("A valid profile id is required."),
  body("side").isIn(["YES", "NO"]).withMessage("Trade side must be YES or NO."),
  body("action").isIn(["BUY", "SELL"]).withMessage("Trade action must be BUY or SELL."),
  body("amount").isFloat({ gt: 0 }).toFloat().withMessage("Amount must be greater than 0."),
  body("feeAmount").optional({ nullable: true }).isFloat({ min: 0 }).toFloat(),
  body("grossAmount").optional({ nullable: true }).isFloat({ min: 0 }).toFloat(),
  body("txHash").optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
];
