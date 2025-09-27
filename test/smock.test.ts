import { describe, expect, it } from "vitest";
import { validatePayload } from "../src/index.js";

describe("payload validator", () => {
  it("accepts minimal valid structure", () => {
    const ok = validatePayload({
      match: {
        idPartido: "ABC",
        local: "A",
        visitante: "B",
        marcadorFinal: { local: 1, visitante: 2 },
      },
      shots: [],
    });
    expect(ok).toBe(true);
  });
});
