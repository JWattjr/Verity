import { body } from "express-validator";

export const toggleInteractionDto = [
  body("postId").isMongoId().withMessage("A valid post id is required."),
  body("profileId").isMongoId().withMessage("A valid profile id is required."),
  body("currentlyActive").isBoolean().withMessage("Current interaction state is required."),
];
