import { existsSync, readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

import type { ShotsPayload } from "./types/shot.js";
import { createLogger, type LogLevel } from "./lib/logging/index.js";
import { createSupabaseRestClient } from "./infrastructure/supabase/rest-client.js";
import { SupabaseMatchIndexRepository } from "./infrastructure/supabase/match-index.repository.js";
import { SupabaseMatchStorage } from "./infrastructure/supabase/match-storage.js";
import { DefaultSimulationRunner } from "./infrastructure/sim/default-runner.js";
import { SimulateMatchByIdUseCase } from "./application/simulate-match-by-id.usecase.js";
import { createSimulateByIdController } from "./http/simulate-by-id.controller.js";
import { startHttpServer } from "./http/server.js";

export function validatePayload(payload: unknown): payload is ShotsPayload {
  // Validador mínimo para que el repo tenga algo comprobable en tests
  if (!payload || typeof payload !== "object") return false;
  const p = payload as ShotsPayload;
  return (
    !!p.match &&
    typeof p.match.local === "string" &&
    typeof p.match.visitante === "string" &&
    Array.isArray(p.shots)
  );
}

type AppConfig = {
  port: number;
  host?: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  supabaseStorageBucket: string;
  supabaseSchema?: string;
  logLevel?: LogLevel;
};

loadEnvFile();

async function bootstrap(): Promise<void> {
  const config = resolveConfig();
  const logger = createLogger({
    service: "shots-service",
    level: config.logLevel,
  });

  const supabaseClient = createSupabaseRestClient({
    baseUrl: config.supabaseUrl,
    serviceKey: config.supabaseServiceKey,
    schema: config.supabaseSchema,
  });

  const matchIndexRepository = new SupabaseMatchIndexRepository(supabaseClient);
  const matchStorage = new SupabaseMatchStorage({
    baseUrl: config.supabaseUrl,
    bucket: config.supabaseStorageBucket,
    serviceKey: config.supabaseServiceKey,
  });
  const simulationRunner = new DefaultSimulationRunner();

  const simulateMatchById = new SimulateMatchByIdUseCase({
    matchIndexRepository,
    matchStorage,
    simulationRunner,
  });

  const simulateByIdController = createSimulateByIdController(simulateMatchById);

  await startHttpServer({
    port: config.port,
    host: config.host,
    logger,
    controllers: {
      simulateById: simulateByIdController,
    },
  });
}

function loadEnvFile(): void {
  const envPath = resolvePath(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const raw = readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key || key.startsWith("#")) {
      continue;
    }

    const valueSegment = trimmed.slice(eqIndex + 1);
    const value = parseEnvValue(valueSegment);
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseEnvValue(segment: string): string {
  const trimmed = segment.trim();
  if (!trimmed) {
    return "";
  }

  const isQuoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  if (isQuoted) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function resolveConfig(): AppConfig {
  const port = parsePort(process.env.PORT ?? "3000");
  const host = process.env.HOST ?? process.env.BIND_ADDRESS ?? undefined;
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const supabaseServiceKey = requiredEnv("SUPABASE_SERVICE_KEY");
  const supabaseStorageBucket = requiredEnv("SUPABASE_STORAGE_BUCKET");
  const supabaseSchema = process.env.SUPABASE_SCHEMA;
  const logLevel = process.env.LOG_LEVEL as LogLevel | undefined;

  return {
    port,
    host,
    supabaseUrl,
    supabaseServiceKey,
    supabaseStorageBucket,
    supabaseSchema,
    logLevel,
  };
}

function parsePort(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }
  return parsed;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value.trim();
}

const isMain = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  const entryUrl = new URL(`file://${entry}`).href;
  return import.meta.url === entryUrl;
})();

if (isMain) {
  bootstrap().catch((error: unknown) => {
    const logger = createLogger({ service: "shots-service" });
    logger.error("failed to start service", {
      evt: "bootstrap.error",
      err: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  });
}
