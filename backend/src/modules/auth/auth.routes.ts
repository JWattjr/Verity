import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validationMiddleware } from "../../middlewares/error.middleware";
import { login, me, register } from "./auth.controller";
import { loginDto, registerDto } from "./auth.dto";

const router = Router();

router.post("/register", registerDto, validationMiddleware, register);
router.post("/login", loginDto, validationMiddleware, login);
router.get("/me", authMiddleware, me);

export default router;
