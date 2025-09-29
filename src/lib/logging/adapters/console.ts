/* eslint-disable no-console */
import type { Logger, LoggerConfig, LogLevel, LogMetadata } from "../types.js";

const levelOrder: Record<Exclude<LogLevel, "silent">, number> = {
  fatal: 10,
  error: 20,
  warn: 30,
  info: 40,
  debug: 50,
  trace: 60,
};

function normalizeLevel(input?: LogLevel): LogLevel {
  if (!input) return process.env.NODE_ENV === "production" ? "info" : "debug";
  return input;
}

function shouldLog(current: LogLevel, incoming: LogLevel): boolean {
  if (current === "silent") return false;
  const c = levelOrder[current];
  const i = levelOrder[incoming as Exclude<LogLevel, "silent">];
  // niveles no definidos (solo "silent") devolverían false arriba
  return i <= c;
}

function serialize(
  service: string | undefined,
  fixed: LogMetadata,
  level: LogLevel,
  msg: string,
  meta?: LogMetadata,
): string {
  const payload: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    msg,
    ...fixed,
    ...(service ? { service } : {}),
    ...(meta ?? {}),
  };
  return JSON.stringify(payload);
}

export function createConsoleLogger(cfg: LoggerConfig = {}): Logger {
  const level = normalizeLevel(cfg.level);
  const service = cfg.service;
  const fixed = { ...(cfg.bindings ?? {}) };

  const logAt =
    (lvl: LogLevel) =>
    (msg: string, meta?: LogMetadata): void => {
      if (!shouldLog(level, lvl)) return;
      const line = serialize(service, fixed, lvl, msg, meta);
      switch (lvl) {
        case "fatal":
        case "error":
          console.error(line);
          break;
        case "warn":
          console.warn(line);
          break;
        case "info":
          console.info(line);
          break;
        case "debug":
        case "trace":
        default:
          console.log(line);
      }
    };

  const base: Logger = {
    level,
    debug: logAt("debug"),
    info: logAt("info"),
    warn: logAt("warn"),
    error: logAt("error"),
    child(bindings: LogMetadata): Logger {
      // merge inmutable y tipos seguros (unknown en metadatos)
      const nextFixed = { ...fixed, ...bindings };
      return createConsoleLogger({
        level,
        service,
        bindings: nextFixed,
        sink: "console",
      });
    },
  };

  return base;
}
