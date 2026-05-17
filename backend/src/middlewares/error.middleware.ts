import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { HttpError } from "../utils/http-error";
import { logger } from "../utils/logger";

export function validationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: result.array(),
    });
    return;
  }

  next();
}

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next;

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  logger.error("Unhandled request error", error);
  res.status(500).json({ success: false, message: "Internal server error." });
};
