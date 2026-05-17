import { Router } from "express";
import { validationMiddleware } from "../../middlewares/error.middleware";
import { addComment, fetchPostComments } from "./comments.controller";
import { commentsQueryDto, createCommentDto } from "./comments.dto";

const router = Router();

router.get("/", commentsQueryDto, validationMiddleware, fetchPostComments);
router.post("/", createCommentDto, validationMiddleware, addComment);

export default router;
