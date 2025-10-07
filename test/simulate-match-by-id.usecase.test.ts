import { describe, expect, it, vi } from "vitest";

import {
  SimulateMatchByIdUseCase,
  type MatchIndexRepository,
  type MatchStorage,
  type SimulationRunner,
  type SimulationSummaryDto,
} from "../src/application/simulate-match-by-id.usecase.js";
import { MatchNotFoundError, MalformedMatchJsonError } from "../src/application/errors.js";
import { hashStringToSeed } from "../src/sim/random.js";

describe("SimulateMatchByIdUseCase", () => {
  it("downloads match data, adapts payload, and returns simulation summary", async () => {
    const matchIndexRepository = mockMatchIndexRepository();
    matchIndexRepository.findById.mockResolvedValue({
      id: "atl-mad-20240928",
      storagePath: "matches/atl.json",
      checksum: null,
      sizeBytes: 2048,
      home: "Atletico Madrid",
      away: "Real Madrid",
      date: "2024-09-28T19:00:00.000Z",
    });

    const matchStorage = mockMatchStorage();
    matchStorage.fetchJson.mockResolvedValue(
      JSON.stringify({
        partido: {
          idPartido: "atl-mad-20240928",
          fechaISO: "2024-09-28T19:00:00.000Z",
          local: "Atletico Madrid",
          visitante: "Real Madrid",
          marcadorFinal: { local: 2, visitante: 1 },
        },
        disparos: [
          { minuto: 1, equipo: "Atletico Madrid", xG: 0.1 },
          { minuto: 5, equipo: "Real Madrid", xG: 0.15 },
        ],
      }),
    );

    const simulationSummary: SimulationSummaryDto = {
      iterations: 1000,
      marcadorFinalCount: 87,
      marcadorFinalPct: 8.7,
      top5: [
        { score: { local: 2, visitante: 1 }, count: 87, pct: 8.7 },
        { score: { local: 1, visitante: 1 }, count: 80, pct: 8 },
      ],
    };

    const simulationRunner = mockSimulationRunner();
    simulationRunner.run.mockReturnValue(simulationSummary);

    const useCase = new SimulateMatchByIdUseCase({
      matchIndexRepository,
      matchStorage,
      simulationRunner,
    });

    const result = await useCase.execute({ id: "atl-mad-20240928", runs: 1000 });

    expect(matchStorage.fetchJson).toHaveBeenCalledWith("matches/atl.json");
    expect(simulationRunner.run).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      id: "atl-mad-20240928",
      runs: 1000,
      summary: simulationSummary,
    });
  });

  it("propagates not-found errors from the index repository", async () => {
    const matchIndexRepository = mockMatchIndexRepository();
    matchIndexRepository.findById.mockResolvedValue(null);

    const useCase = new SimulateMatchByIdUseCase({
      matchIndexRepository,
      matchStorage: mockMatchStorage(),
      simulationRunner: mockSimulationRunner(),
    });

    await expect(useCase.execute({ id: "missing" })).rejects.toBeInstanceOf(MatchNotFoundError);
  });

  it("translates malformed JSON into validation errors", async () => {
    const matchIndexRepository = mockMatchIndexRepository();
    matchIndexRepository.findById.mockResolvedValue({
      id: "atl",
      storagePath: "matches/atl.json",
      checksum: null,
      sizeBytes: null,
      home: "Atletico",
      away: "Real",
      date: "2024-09-28T19:00:00.000Z",
    });

    const matchStorage = mockMatchStorage();
    matchStorage.fetchJson.mockResolvedValue("not-json");

    const useCase = new SimulateMatchByIdUseCase({
      matchIndexRepository,
      matchStorage,
      simulationRunner: mockSimulationRunner(),
    });

    await expect(useCase.execute({ id: "atl" })).rejects.toBeInstanceOf(MalformedMatchJsonError);
  });

  it("handles optional run counts and default seeds deterministically", async () => {
    const matchIndexRepository = mockMatchIndexRepository();
    matchIndexRepository.findById.mockResolvedValue({
      id: "atl",
      storagePath: "matches/atl.json",
      checksum: null,
      sizeBytes: null,
      home: "Atletico",
      away: "Real",
      date: "2024-09-28T19:00:00.000Z",
    });

    const matchStorage = mockMatchStorage();
    matchStorage.fetchJson.mockResolvedValue(
      JSON.stringify({
        partido: {
          idPartido: "atl",
          fechaISO: "2024-09-28T19:00:00.000Z",
          local: "Atletico",
          visitante: "Real",
          marcadorFinal: { local: 1, visitante: 0 },
        },
        disparos: [],
      }),
    );

    const simulationRunner = mockSimulationRunner();
    simulationRunner.run.mockReturnValue({
      iterations: 500,
      marcadorFinalCount: 0,
      marcadorFinalPct: 0,
      top5: [],
    });

    const useCase = new SimulateMatchByIdUseCase({
      matchIndexRepository,
      matchStorage,
      simulationRunner,
    });

    await useCase.execute({ id: "atl" });

    expect(simulationRunner.run).toHaveBeenCalledWith(
      expect.any(Object),
      1000,
      hashStringToSeed("atl|1000"),
    );
  });
});

function mockMatchIndexRepository() {
  return {
    findById: vi.fn(),
  } as unknown as MatchIndexRepository & { findById: ReturnType<typeof vi.fn> };
}

function mockMatchStorage() {
  return {
    fetchJson: vi.fn(),
  } as unknown as MatchStorage & { fetchJson: ReturnType<typeof vi.fn> };
}

function mockSimulationRunner() {
  return {
    run: vi.fn(),
  } as unknown as SimulationRunner & { run: ReturnType<typeof vi.fn> };
}
