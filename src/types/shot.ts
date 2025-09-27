export type Shot = {
  jugador: string; // "Á. Moreno"
  minuto: string; // "90+2"
  xG: number; // 0.03
  xGOT: number; // 0.00
  resultado: "Gol" | "Fallado" | "Parado" | "Bloqueado";
  situacion: "Juego abierto" | "Balón parado" | "Contraataque" | "Penalty" | "Falta";
  tipo_disparo: "Diestro" | "Zurdo" | "Cabeza" | "Otro";
  zona_gol: "Izquierda" | "Centro" | "Derecha";
};

export type MatchMeta = {
  idPartido: string; // único (por ahora string)
  fechaISO?: string; // opcional
  local: string;
  visitante: string;
  marcadorFinal: { local: number; visitante: number };
};

export type ShotsPayload = {
  match: MatchMeta;
  shots: Shot[];
};
