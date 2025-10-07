import { describe, expect, it, vi } from "vitest";

import {
  createSimulateByIdController,
  MatchNotFoundError,
  MalformedMatchJsonError,
  type HttpRequest,
} from "../src/http/simulate-by-id.controller.js";

const useCaseResult = {
  id: "atl",
  runs: 1000,
  summary: {
    iterations: 1000,
    marcadorFinalCount: 30,
    marcadorFinalPct: 3,
    top5: [],
  },
};

describe("POST /simulate/by-id controller", () => {
  it("responds with 200 and simulation payload for valid requests", async () => {
    const useCase = { execute: vi.fn().mockResolvedValue(useCaseResult) };
    const controller = createSimulateByIdController(useCase as never);

    const response = await controller({ body: { id: "atl", runs: 1000 } } satisfies HttpRequest);

    expect(useCase.execute).toHaveBeenCalledWith({ id: "atl", runs: 1000 });
    expect(response).toEqual({ status: 200, body: useCaseResult });
  });

  it("responds with 404 when the match is not indexed", async () => {
    const useCase = {
      execute: vi.fn().mockRejectedValue(new MatchNotFoundError("atl")),
    };
    const controller = createSimulateByIdController(useCase as never);

    const response = await controller({ body: { id: "atl" } });

    expect(response.status).toBe(404);
  });

  it("responds with 422 when the downloaded JSON fails validation", async () => {
    const useCase = {
      execute: vi.fn().mockRejectedValue(new MalformedMatchJsonError()),
    };
    const controller = createSimulateByIdController(useCase as never);

    const response = await controller({ body: { id: "atl" } });

    expect(response.status).toBe(422);
  });

  it("validates request body schema before invoking the use case", async () => {
    const useCase = { execute: vi.fn() };
    const controller = createSimulateByIdController(useCase as never);

    const response = await controller({ body: { runs: 1000 } });

    expect(useCase.execute).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });
});
