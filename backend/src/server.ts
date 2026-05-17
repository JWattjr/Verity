import app from "./app";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import { ensureDevUser } from "./modules/users/users.service";
import { logger } from "./utils/logger";

async function bootstrap(): Promise<void> {
  try {
    await connectDb();
    await ensureDevUser();
    app.listen(env.port, () => {
      logger.info(`API listening on http://localhost:${env.port}`);
    });
  } catch (error) {
    logger.error("Failed to start API", error);
    process.exit(1);
  }
}

void bootstrap();
