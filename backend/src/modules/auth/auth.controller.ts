import type { NextFunction, Request, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware";
import { created, ok } from "../../utils/response";
import * as authService from "./auth.service";

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body);
    created(res, result, "Registered.");
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body);
    ok(res, result, "Logged in.");
  } catch (error) {
    next(error);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.me(req.user!.id);
    ok(res, user);
  } catch (error) {
    next(error);
  }
}
