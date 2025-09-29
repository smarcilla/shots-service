// src/index.ts
import { readFile } from "node:fs/promises";
import { adaptExternalJson, runSimulations } from "./simulator.js";
import type { ExternalJson } from "../types/shot.js";
import type { LogLevel } from "../lib/logging/index.js";
import { createLogger } from "../lib/logging/index.js";

const level =
  (process.env.LOG_LEVEL as LogLevel) || process.env.NODE_ENV === "production" ? "info" : "debug";
const logger = createLogger({ level, bindings: { module: "sim" }, service: "shots-service" });

function formatTop(top: ReturnType<typeof runSimulations>["top5"]) {
  return top.map((t) => ({
    score: `${t.score.local}-${t.score.visitante}`,
    count: t.count,
    pct: Number(t.pct.toFixed(2)),
  }));
}

async function main() {
  const jsonPath = process.argv[2];
  const seedArg = process.argv[3]; // opcional: --seed=1234
  if (!jsonPath) {
    logger.error("invalid usage", {
      evt: "cli.usage",
      expected: "tsx src/index.ts <ruta-json> [--seed=1234]",
    });
    process.exit(1);
  }
  const seed = seedArg?.startsWith("--seed=") ? Number(seedArg.slice(7)) : undefined;

  const raw = await readFile(jsonPath, "utf8");
  const ext = JSON.parse(raw) as ExternalJson;
  const payload = adaptExternalJson(ext);

  const sizes = [100, 1000, 10000] as const;
  for (const runs of sizes) {
    const res = runSimulations(payload, runs, seed);
    logger.info("simulation started", {
      evt: "sim.start",
      runs,
      seed,
      home: payload.match.local,
      away: payload.match.visitante,
    });
    logger.info("simulation summary", {
      evt: "sim.summary",
      stats: {
        runs,
        realScore: {
          home: payload.match.marcadorFinal.local,
          away: payload.match.marcadorFinal.visitante,
        },
        simulatedScore: res.marcadorFinalCount,
        simulatedPct: res.marcadorFinalPct,
      },
      top5: formatTop(res.top5),
    });
    logger.info("simulation finished", {
      evt: "sim.end",
      runs,
    });
  }
}

main().catch((e: Error) => {
  logger.error("simulation failed", { evt: "sim.error", err: e });
  process.exit(1);
});
