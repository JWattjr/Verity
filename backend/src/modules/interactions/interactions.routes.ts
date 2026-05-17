import { Router } from "express";
import { validationMiddleware } from "../../middlewares/error.middleware";
import { toggleLike, toggleReshare } from "./interactions.controller";
import { toggleInteractionDto } from "./interactions.dto";

const router = Router();

router.post("/like", toggleInteractionDto, validationMiddleware, toggleLike);
router.post("/reshare", toggleInteractionDto, validationMiddleware, toggleReshare);

export default router;
