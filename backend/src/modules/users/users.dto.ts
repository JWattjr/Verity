import { body, param } from "express-validator";

export const walletParamDto = [
  param("walletAddress").isString().trim().isLength({ min: 6 }).withMessage("Wallet address is required."),
];

export const updateUserDto = [
  param("id").isMongoId().withMessage("A valid user id is required."),
  body("username").isString().trim().isLength({ min: 3, max: 32 }).withMessage("Username must be 3-32 characters."),
  body("display_name").optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
  body("avatar_url").optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
  body("bio").optional({ nullable: true }).isString().trim().isLength({ max: 280 }),
];
