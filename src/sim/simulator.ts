// src/sim/simulator.ts
import type {
  ShotsPayload,
  Shot,
  TeamSide,
  ExternalJson,
  ShotsPayload as SP,
} from "../types/shot.js";
import { hashStringToSeed, mulberry32 } from "./random.js";

export type Score = { local: number; visitante: number };

export type TopLine = {
  score: Score;
  count: number;
  pct: number; // porcentaje respecto a iterations
};

export type SimulationSummary = {
  iterations: number;
  top5: TopLine[];
  marcadorFinalCount: number;
  marcadorFinalPct: number;
};

// ---- Utilidades internas ----
function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x <= 0) return 0;
  return x >= 1 ? 1 : x;
}

function keyFromScore(s: Score): string {
  return `${s.local}-${s.visitante}`;
}

function scoreFromKey(k: string): Score {
  const [l, v] = k.split("-").map((n) => parseInt(n, 10));
  return { local: l || 0, visitante: v || 0 };
}

function splitProbabilities(shots: Shot[]): { localPs: number[]; visitantePs: number[] } {
  const localPs: number[] = [];
  const visitantePs: number[] = [];
  for (let i = 0; i < shots.length; i++) {
    const sh = shots[i];
    const p = clamp01(sh!.xG);
    if (sh!.equipo === "local") localPs.push(p);
    else visitantePs.push(p);
  }
  return { localPs, visitantePs };
}

function sampleGoals(probs: number[], rng: () => number): number {
  // suma de Bernoullis independientes
  let g = 0;
  for (let i = 0; i < probs.length; i++) {
    if (rng() < probs[i]!) g++;
  }
  return g;
}

// ---- Núcleo de simulación ----
export function simulateOnce(payload: ShotsPayload, rng: () => number): Score {
  const { localPs, visitantePs } = splitProbabilities(payload.shots);
  return {
    local: sampleGoals(localPs, rng),
    visitante: sampleGoals(visitantePs, rng),
  };
}

/**
 * Ejecuta N simulaciones y devuelve top-5 marcadores + frecuencia del marcador real
 * - Precomputa probs por equipo para eficiencia
 * - Usa Map para conteo O(1)
 * - Empata por orden lexicográfico del marcador si hay igualdad
 */
export function runSimulations(
  payload: ShotsPayload,
  iterations: number,
  seed?: number,
): SimulationSummary {
  const s = seed ?? hashStringToSeed(payload.match.idPartido + "|" + iterations.toString());
  const rng = mulberry32(s);

  // pre-split para no recalcular en cada iteración
  const { localPs, visitantePs } = splitProbabilities(payload.shots);

  const counts = new Map<string, number>();
  for (let i = 0; i < iterations; i++) {
    const l = sampleGoals(localPs, rng);
    const v = sampleGoals(visitantePs, rng);
    const k = `${l}-${v}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  // top-5
  const entries = Array.from(counts.entries());
  entries.sort((a, b) => {
    // primero por frecuencia desc
    if (b[1] !== a[1]) return b[1] - a[1];
    // luego lexicográfico para estabilidad
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
  const top5: TopLine[] = entries.slice(0, 5).map(([k, c]) => ({
    score: scoreFromKey(k),
    count: c,
    pct: (c / iterations) * 100,
  }));

  const realKey = keyFromScore(payload.match.marcadorFinal);
  const realCount = counts.get(realKey) ?? 0;

  return {
    iterations,
    top5,
    marcadorFinalCount: realCount,
    marcadorFinalPct: (realCount / iterations) * 100,
  };
}

// ---- Adaptador desde tu JSON externo (partido/disparos) ----
export function adaptExternalJson(ext: ExternalJson): ShotsPayload {
  const { partido, disparos } = ext;
  const mapSide = (teamName: string): TeamSide => {
    if (teamName === partido.local) return "local";
    if (teamName === partido.visitante) return "visitante";
    // fallback: si no coincide, asumimos visitante para no sesgar al local
    return "visitante";
  };

  const shots: Shot[] = disparos.map((d) => ({
    minuto: d.minuto,
    equipo: mapSide(d.equipo),
    xG: clamp01(d.xG),
    jugador: d.jugador,
    xGOT: d.xGOT,
    situacion: d.situacion,
    resultado: d.resultado as Shot["resultado"],
    tipo_disparo: d.tipo_disparo as Shot["tipo_disparo"],
  }));

  return {
    match: {
      idPartido: partido.idPartido,
      fechaISO: partido.fechaISO,
      local: partido.local,
      visitante: partido.visitante,
      marcadorFinal: partido.marcadorFinal,
    },
    shots,
  } as SP;
}
