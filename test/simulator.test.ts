import { describe, expect, it } from "vitest";
import {
  createSimulationContext,
  runSimulationBatch,
  runSimulations,
  type SimulationSummary,
} from "../src/sim/simulator.js";
import type { ShotsPayload } from "../src/types/shot.js";

const deterministicPayload: ShotsPayload = {
  match: {
    idPartido: "TEST-001",
    local: "Local FC",
    visitante: "Away FC",
    marcadorFinal: { local: 1, visitante: 0 },
  },
  shots: [
    { minuto: 1, equipo: "local", xG: 1 },
    { minuto: 15, equipo: "visitante", xG: 0 },
  ],
};

describe("simulation context", () => {
  it("splits probabilities by side", () => {
    const context = createSimulationContext(deterministicPayload);
    expect(context.localProbabilities).toEqual([1]);
    expect(context.visitanteProbabilities).toEqual([0]);
  });
});

describe("runSimulationBatch", () => {
  it("produces deterministic summary when probabilities are extreme", () => {
    const context = createSimulationContext(deterministicPayload);
    const summary: SimulationSummary = runSimulationBatch(context, 10, 123);

    expect(summary.iterations).toBe(10);
    expect(summary.top5[0]?.score).toEqual({ local: 1, visitante: 0 });
    expect(summary.top5[0]?.count).toBe(10);
    expect(summary.top5[0]?.pct).toBe(100);
    expect(summary.marcadorFinalCount).toBe(10);
    expect(summary.marcadorFinalPct).toBe(100);
  });

  it("keeps backwards compatibility with runSimulations", () => {
    const context = createSimulationContext(deterministicPayload);
    const batchSummary = runSimulationBatch(context, 5, 42);
    const legacySummary = runSimulations(deterministicPayload, 5, 42);

    expect(legacySummary).toEqual(batchSummary);
  });
});
