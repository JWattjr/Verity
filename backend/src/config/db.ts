import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

export async function connectDb(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  logger.info(`MongoDB connected: ${mongoose.connection.name}`);
}
