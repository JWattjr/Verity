import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    next(new HttpError(401, "Missing bearer token."));
    return;
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret) as AuthUser;
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token."));
  }
}
