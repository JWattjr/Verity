import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/verity",
  jwtSecret: process.env.JWT_SECRET || "replace-with-a-long-random-secret-before-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
