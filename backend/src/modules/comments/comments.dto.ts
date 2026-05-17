import { body, query } from "express-validator";

export const commentsQueryDto = [
  query("postId").isMongoId().withMessage("A valid post id is required."),
];

export const createCommentDto = [
  body("postId").isMongoId().withMessage("A valid post id is required."),
  body("profileId").isMongoId().withMessage("A valid profile id is required."),
  body("content").isString().trim().isLength({ min: 1, max: 500 }).withMessage("Comment content is required."),
];
