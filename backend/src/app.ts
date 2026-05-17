import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import commentsRoutes from "./modules/comments/comments.routes";
import interactionsRoutes from "./modules/interactions/interactions.routes";
import marketsRoutes from "./modules/markets/markets.routes";
import postsRoutes from "./modules/posts/posts.routes";
import usersRoutes from "./modules/users/users.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Verity API is healthy." });
});

app.use("/api/feed", postsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/interactions", interactionsRoutes);
app.use("/api/markets", marketsRoutes);

app.use(errorMiddleware);

export default app;
