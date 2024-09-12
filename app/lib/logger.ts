import pino, { Logger } from "pino";

export const logger: Logger =
  process.env["DEPLOYMENT_MODE"] === "development"
    ? // Pretty print in development
      pino({
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        },
        level: "debug",
      })
    : // JSON in production
      pino({ level: "debug" });
