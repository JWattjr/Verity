import { Router } from "express";
import { validationMiddleware } from "../../middlewares/error.middleware";
import { getDevUser, getOrCreateWalletUser, getUserDailyVotes, updateUser } from "./users.controller";
import { updateUserDto, walletParamDto } from "./users.dto";

const router = Router();

router.get("/dev", getDevUser);
router.get("/wallet/:walletAddress", walletParamDto, validationMiddleware, getOrCreateWalletUser);
router.get("/:id/daily-votes", getUserDailyVotes);
router.patch("/:id", updateUserDto, validationMiddleware, updateUser);

export default router;
