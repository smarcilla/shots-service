// src/index.ts
import { readFile } from "node:fs/promises";
import { adaptExternalJson, runSimulations } from "./simulator.js";
import type { ExternalJson } from "../types/shot.js";

function formatTop(top: ReturnType<typeof runSimulations>["top5"]) {
  return top
    .map(
      (t) =>
        `${t.score.local}-${t.score.visitante}: ${t.count} veces (${t.pct.toFixed(2)}%)`,
    )
    .join("\n");
}

async function main() {
  const jsonPath = process.argv[2];
  const seedArg = process.argv[3]; // opcional: --seed=1234
  if (!jsonPath) {
    console.error("Uso: tsx src/index.ts <ruta-json> [--seed=1234]");
    process.exit(1);
  }
  const seed = seedArg?.startsWith("--seed=") ? Number(seedArg.slice(7)) : undefined;

  const raw = await readFile(jsonPath, "utf8");
  const ext = JSON.parse(raw) as ExternalJson;
  const payload = adaptExternalJson(ext);

  const sizes = [100, 1000, 10000] as const;
  for (const n of sizes) {
    const res = runSimulations(payload, n, seed);
    console.log(`\n--- Simulación de ${n} partidos ---`);
    console.log(formatTop(res.top5));
    console.log(
      `Marcador real ${payload.match.marcadorFinal.local}-${payload.match.marcadorFinal.visitante}: ` +
        `${res.marcadorFinalCount} veces (${res.marcadorFinalPct.toFixed(2)}%)`,
    );
  }
}


  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
