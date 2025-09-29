import type { Logger, LoggerConfig } from "./types.js";
import { createConsoleLogger } from "./adapters/console.js";

export function createLogger(config: LoggerConfig = {}): Logger {
  const sink = config.sink ?? "console";
  switch (sink) {
    case "console":
    default:
      return createConsoleLogger(config);
  }
}
