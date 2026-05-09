import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];
const rawHost = process.env["HOST"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);
const host =
  rawHost?.trim() ||
  (process.env["NODE_ENV"] === "production" ? "127.0.0.1" : "0.0.0.0");

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, host, () => {
  logger.info({ host, port }, "Server listening");
});

server.on("error", (err) => {
  logger.error({ err, host, port }, "Error listening on port");
  process.exit(1);
});
