import { body } from "express-validator";

export const registerDto = [
  body("email").isEmail().normalizeEmail().withMessage("A valid email is required."),
  body("password").isString().isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  body("username").isString().trim().isLength({ min: 3, max: 32 }).withMessage("Username must be 3-32 characters."),
  body("display_name").optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
];

export const loginDto = [
  body("email").isEmail().normalizeEmail().withMessage("A valid email is required."),
  body("password").isString().notEmpty().withMessage("Password is required."),
];
