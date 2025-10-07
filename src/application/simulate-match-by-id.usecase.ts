import type { ExternalJson, ShotsPayload } from "../types/shot.js";
import { adaptExternalJson } from "../sim/simulator.js";
import { hashStringToSeed } from "../sim/random.js";
import { MalformedMatchJsonError, MatchNotFoundError } from "./errors.js";

export interface MatchIndexMetadata {
  id: string;
  storagePath: string;
  checksum: string | null;
  sizeBytes: number | null;
  home: string;
  away: string;
  date: string;
}

export interface MatchIndexRepository {
  findById(id: string): Promise<MatchIndexMetadata | null>;
}

export interface MatchStorage {
  fetchJson(path: string): Promise<string>;
}

export interface SimulationSummaryDto {
  iterations: number;
  top5: Array<{ score: { local: number; visitante: number }; count: number; pct: number }>;
  marcadorFinalCount: number;
  marcadorFinalPct: number;
}

export interface SimulationRunner {
  run(payload: ShotsPayload, runs: number, seed?: number): SimulationSummaryDto;
}

export interface SimulationRequest {
  id: string;
  runs?: number;
  seed?: number;
}

export interface SimulateMatchByIdResponse {
  id: string;
  runs: number;
  summary: SimulationSummaryDto;
}

export class SimulateMatchByIdUseCase {
  constructor(
    private readonly dependencies: {
      matchIndexRepository: MatchIndexRepository;
      matchStorage: MatchStorage;
      simulationRunner: SimulationRunner;
    },
  ) {}

  async execute(request: SimulationRequest): Promise<SimulateMatchByIdResponse> {
    const { matchIndexRepository, matchStorage, simulationRunner } = this.dependencies;

    const metadata = await matchIndexRepository.findById(request.id);
    if (!metadata) {
      throw new MatchNotFoundError(request.id);
    }

    const rawJson = await matchStorage.fetchJson(metadata.storagePath);

    const externalJson = this.safeParseExternalJson(rawJson);
    const payload = adaptExternalJson(externalJson);

    const runs = request.runs ?? 1000;
    const seed = request.seed ?? hashStringToSeed(`${request.id}|${runs}`);

    const summary = simulationRunner.run(payload, runs, seed);

    return {
      id: metadata.id,
      runs,
      summary,
    };
  }

  private safeParseExternalJson(raw: string): ExternalJson {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!this.isExternalJson(parsed)) {
        throw new MalformedMatchJsonError();
      }
      return parsed;
    } catch (error) {
      if (error instanceof MalformedMatchJsonError) {
        throw error;
      }
      throw new MalformedMatchJsonError();
    }
  }

  private isExternalJson(input: unknown): input is ExternalJson {
    if (!input || typeof input !== "object") {
      return false;
    }

    const maybe = input as Partial<ExternalJson>;
    if (!maybe.partido || typeof maybe.partido !== "object") {
      return false;
    }

    const partido = maybe.partido as Partial<ExternalJson["partido"]>;
    if (
      typeof partido.idPartido !== "string" ||
      typeof partido.local !== "string" ||
      typeof partido.visitante !== "string"
    ) {
      return false;
    }

    if (!Array.isArray(maybe.disparos)) {
      return false;
    }

    return true;
  }
}
