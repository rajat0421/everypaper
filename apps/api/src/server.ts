import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createSocketServer } from "./sockets/index.js";
import { connectMongo, disconnectMongo } from "./infrastructure/mongo.js";
import { logger } from "./infrastructure/logger.js";
import { env } from "./config/env.js";

async function main(): Promise<void> {
  await connectMongo();

  const app = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer);

  httpServer.listen(env.PORT, "0.0.0.0", () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "everypaper api listening");
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");

    httpServer.close(() => {
      logger.info("http server closed");
    });

    io.close(() => {
      logger.info("socket.io server closed");
    });

    try {
      await disconnectMongo();
      logger.info("mongo disconnected");
    } catch (err) {
      logger.error({ err }, "error disconnecting mongo");
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error({ err }, "fatal error during startup");
  process.exit(1);
});
