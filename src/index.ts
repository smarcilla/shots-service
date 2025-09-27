import type { ShotsPayload } from "./types/shot.js";

export function validatePayload(payload: unknown): payload is ShotsPayload {
  // Validador mínimo para que el repo tenga algo comprobable en tests
  if (!payload || typeof payload !== "object") return false;
  const p = payload as ShotsPayload;
  return (
    !!p.match &&
    typeof p.match.local === "string" &&
    typeof p.match.visitante === "string" &&
    Array.isArray(p.shots)
  );
}
