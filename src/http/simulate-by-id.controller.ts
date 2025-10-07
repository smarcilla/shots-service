import { MalformedMatchJsonError, MatchNotFoundError } from "../application/errors.js";
import type {
  SimulateMatchByIdUseCase,
  SimulationRequest,
} from "../application/simulate-match-by-id.usecase.js";

export interface HttpRequest {
  body: unknown;
}

export interface HttpResponse<T = unknown> {
  status: number;
  body: T;
}

export function createSimulateByIdController(useCase: SimulateMatchByIdUseCase) {
  return async function handle(req: HttpRequest): Promise<HttpResponse> {
    const validation = validateBody(req.body);
    if (!validation.ok) {
      return {
        status: 400,
        body: { error: validation.error },
      } satisfies HttpResponse;
    }

    try {
      const result = await useCase.execute(validation.value);
      return { status: 200, body: result } satisfies HttpResponse;
    } catch (error) {
      if (error instanceof MatchNotFoundError) {
        return { status: 404, body: { error: error.message } } satisfies HttpResponse;
      }
      if (error instanceof MalformedMatchJsonError) {
        return { status: 422, body: { error: error.message } } satisfies HttpResponse;
      }
      throw error;
    }
  };
}

export { MatchNotFoundError, MalformedMatchJsonError };

type ValidationResult = { ok: true; value: SimulationRequest } | { ok: false; error: string };

function validateBody(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }

  const maybe = body as Partial<SimulationRequest>;
  if (typeof maybe.id !== "string" || maybe.id.trim() === "") {
    return { ok: false, error: "Field 'id' is required" };
  }

  const result: SimulationRequest = { id: maybe.id };

  if ("runs" in maybe) {
    if (!isPositiveInteger(maybe.runs)) {
      return { ok: false, error: "Field 'runs' must be a positive integer" };
    }
    result.runs = Number(maybe.runs);
  }

  if ("seed" in maybe) {
    if (typeof maybe.seed !== "number" || !Number.isFinite(maybe.seed)) {
      return { ok: false, error: "Field 'seed' must be a finite number" };
    }
    result.seed = maybe.seed;
  }

  return { ok: true, value: result };
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
