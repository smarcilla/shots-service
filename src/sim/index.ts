// src/sim/index.ts
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import {
  adaptExternalJson,
  createSimulationContext,
  runSimulationBatch,
  type SimulationSummary,
} from "./simulator.js";
import type { ExternalJson, ShotsPayload } from "../types/shot.js";
import { createLogger, type LogLevel } from "../lib/logging/index.js";

type ExportedTopLine = {
  score: string;
  count: number;
  pct: number;
};

type ExportedRun = {
  iterations: number;
  marcadorFinal: {
    score: string;
    count: number;
    pct: number;
  };
  top5: ExportedTopLine[];
};

type SimulationExport = {
  generatedAt: string;
  seed?: number;
  match: ShotsPayload["match"];
  source: {
    inputPath: string;
    shots: number;
  };
  runs: ExportedRun[];
};

type ParsedArgs = {
  inputPath: string;
  seed?: number;
  outputPath: string;
};

const logLevel =
  (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === "production" ? "info" : "debug");
const logger = createLogger({
  level: logLevel,
  service: "shots-service",
  bindings: { module: "sim" },
});

function parseCliArgs(argv: string[]): ParsedArgs {
  const [inputPath, ...rest] = argv;
  if (!inputPath) {
    throw new Error("Usage: tsx src/sim/index.ts <ruta-json> [--seed=1234] [--out=salida.json]");
  }

  let seed: number | undefined;
  let outputPath: string | undefined;
  for (const arg of rest) {
    if (arg.startsWith("--seed=")) {
      const parsed = Number(arg.slice(7));
      if (!Number.isNaN(parsed)) seed = parsed;
    } else if (arg.startsWith("--out=")) {
      outputPath = arg.slice(6);
    }
  }

  const finalOutput = outputPath ?? deriveDefaultOutputPath(inputPath);
  return {
    inputPath,
    seed,
    outputPath: finalOutput,
  };
}

function deriveDefaultOutputPath(input: string): string {
  const dir = dirname(input);
  const base = basename(input, extname(input));
  return join(dir, `${base}.simulation.json`);
}

function formatTop(top: SimulationSummary["top5"]): ExportedTopLine[] {
  return top.map((line) => ({
    score: `${line.score.local}-${line.score.visitante}`,
    count: line.count,
    pct: Number(line.pct.toFixed(2)),
  }));
}

function toExport(summary: SimulationSummary, match: ShotsPayload["match"]): ExportedRun {
  const scoreLabel = `${match.marcadorFinal.local}-${match.marcadorFinal.visitante}`;
  return {
    iterations: summary.iterations,
    marcadorFinal: {
      score: scoreLabel,
      count: summary.marcadorFinalCount,
      pct: Number(summary.marcadorFinalPct.toFixed(2)),
    },
    top5: formatTop(summary.top5),
  };
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const inputPath = args.inputPath;
  const raw = await readFile(inputPath, "utf8");
  const ext = JSON.parse(raw) as ExternalJson;
  const payload = adaptExternalJson(ext);
  const context = createSimulationContext(payload);

  logger.info("simulation input loaded", {
    evt: "sim.input",
    seed: args.seed,
    inputPath: resolve(inputPath),
    shots: payload.shots.length,
  });

  const iterationsList = [100, 1000, 10000] as const;
  const runs: ExportedRun[] = iterationsList.map((iterations) => {
    const summary = runSimulationBatch(context, iterations, args.seed);
    logger.info("simulation batch completed", {
      evt: "sim.batch",
      iterations,
      seed: args.seed,
      marcadorFinal: summary.marcadorFinalCount,
      pct: Number(summary.marcadorFinalPct.toFixed(2)),
    });
    return toExport(summary, payload.match);
  });

  const exportPayload: SimulationExport = {
    generatedAt: new Date().toISOString(),
    seed: args.seed,
    match: payload.match,
    source: {
      inputPath: resolve(inputPath),
      shots: payload.shots.length,
    },
    runs,
  };

  const resolvedOutput = resolve(args.outputPath);
  await writeFile(resolvedOutput, JSON.stringify(exportPayload, null, 2), "utf8");
  logger.info("simulation output written", {
    evt: "sim.output",
    outputPath: resolvedOutput,
  });
}

main().catch((error: Error) => {
  logger.error("simulation failed", { evt: "sim.error", err: error });
  process.exit(1);
});
