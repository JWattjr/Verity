import { body, query } from "express-validator";

export const feedQueryDto = [
  query("viewerProfileId").optional().isMongoId(),
  query("userId").optional().isMongoId(),
  query("onlyMarkets").optional().isBoolean().toBoolean(),
];

export const createPostDto = [
  body("authorId").optional().isMongoId(),
  body("profileId").optional().isMongoId(),
  body("content").isString().trim().isLength({ min: 1, max: 1000 }).withMessage("Post content is required."),
];

export const createMarketPostDto = [
  body("authorId").optional().isMongoId(),
  body("profileId").optional().isMongoId(),
  body("content").optional({ nullable: true }).isString().trim().isLength({ max: 1000 }),
  body("question").isString().trim().isLength({ min: 1, max: 240 }).withMessage("Market question is required."),
  body("category").isString().trim().isLength({ min: 1, max: 60 }),
  body("deadline").isISO8601().withMessage("A valid deadline is required."),
  body("resolutionSource").isString().trim().isLength({ min: 1, max: 240 }),
  body("yesCondition").isString().trim().isLength({ min: 1, max: 500 }),
  body("noCondition").isString().trim().isLength({ min: 1, max: 500 }),
  body("creationFeeTxHash")
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage("Prediction posts require a 1 USDC Arc testnet creation transaction."),
  body("feeCollectorAddress")
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage("Prediction posts require the Arc testnet fee collector address."),
];
