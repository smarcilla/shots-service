import { createSimulationContext, runSimulationBatch } from "../../sim/simulator.js";
import type {
  SimulationRunner,
  SimulationSummaryDto,
} from "../../application/simulate-match-by-id.usecase.js";

export class DefaultSimulationRunner implements SimulationRunner {
  run(
    payload: Parameters<SimulationRunner["run"]>[0],
    runs: number,
    seed?: number,
  ): SimulationSummaryDto {
    const context = createSimulationContext(payload);
    return runSimulationBatch(context, runs, seed);
  }
}
