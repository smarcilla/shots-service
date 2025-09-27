// src/types/shot.ts
export type TeamSide = "local" | "visitante";

export type Shot = {
  minuto: number | string;
  equipo: TeamSide;           // <- requerido para simular
  xG: number;                 // probabilidad de gol en [0,1]
  // Metadatos opcionales (no usados por la simulación pero útiles para trazas)
  jugador?: string;
  xGOT?: number;
  situacion?: string;
  resultado?: "Gol" | "Fallado" | "Parada" | "Bloqueo" | "Bloqueado";
  tipo_disparo?: "Diestro" | "Zurdo" | "Cabeza" | "Otro";
};

export type MatchMeta = {
  idPartido: string;
  fechaISO?: string;
  local: string;
  visitante: string;
  marcadorFinal: { local: number; visitante: number };
};

export type ShotsPayload = {
  match: MatchMeta;
  shots: Shot[];
};

// ------- Tipos para adaptar tu JSON externo (opcional) -------
export type ExternalShot = {
  minuto: number | string;
  equipo: string;  // nombre equipo
  jugador?: string;
  xG: number;
  xGOT?: number;
  situacion?: string;
  resultado?: string;
  tipo_disparo?: string;
};

export type ExternalJson = {
  partido: {
    idPartido: string;
    fechaISO?: string;
    local: string;
    visitante: string;
    marcadorFinal: { local: number; visitante: number };
  };
  disparos: ExternalShot[];
};
