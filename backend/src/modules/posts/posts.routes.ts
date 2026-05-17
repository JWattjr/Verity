import { Router } from "express";
import { validationMiddleware } from "../../middlewares/error.middleware";
import { addPostComment, createMarketPost, createNormalPost, fetchFeed, likePost, resharePost } from "./posts.controller";
import { createMarketPostDto, createPostDto, feedQueryDto } from "./posts.dto";

const router = Router();

router.get("/", feedQueryDto, validationMiddleware, fetchFeed);
router.post("/", createPostDto, validationMiddleware, createNormalPost);
router.post("/normal", createPostDto, validationMiddleware, createNormalPost);
router.post("/market", createMarketPostDto, validationMiddleware, createMarketPost);
router.post("/:postId/comment", addPostComment);
router.post("/:postId/like", likePost);
router.post("/:postId/reshare", resharePost);

export default router;
