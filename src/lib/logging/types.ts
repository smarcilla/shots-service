// Tipos de nivel compatibles con futuros adapters (Pino, Winston, etc.)
export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export type LogMetadata = Record<string, unknown>;

export interface Logger {
  level: LogLevel;
  debug(msg: string, meta?: LogMetadata): void;
  info(msg: string, meta?: LogMetadata): void;
  warn(msg: string, meta?: LogMetadata): void;
  error(msg: string, meta?: LogMetadata): void;
  // Crea un logger hijo con bindings fijos (p.ej. { module: 'sim' })
  child(bindings: LogMetadata): Logger;
}

export interface LoggerConfig {
  level?: LogLevel; // default: "info" (o "debug" en dev)
  service?: string; // nombre del servicio: "shots-service"
  bindings?: LogMetadata; // claves que se añaden siempre (p.ej. requestId)
  sink?: "console"; // futura extensión: "pino"
}
