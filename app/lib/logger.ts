import pino, { Logger } from "pino";
import PinoPretty from "pino-pretty";

const stream = PinoPretty({
  levelFirst: true,
  colorize: true,
});

export const logger: Logger =
  // process.env["NODE_ENV"] === "production"
  //   ? // JSON in production
  //     pino({ level: "warn" })
  //   : // Pretty print in development
  pino(
    {
      level: "debug",
    },
    stream,
  );
