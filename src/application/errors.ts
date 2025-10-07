export class MatchNotFoundError extends Error {
  constructor(public readonly matchId: string) {
    super(`Match with id ${matchId} was not found`);
    this.name = "MatchNotFoundError";
  }
}

export class MalformedMatchJsonError extends Error {
  constructor(message = "Match JSON payload is malformed") {
    super(message);
    this.name = "MalformedMatchJsonError";
  }
}

export class MatchIndexRepositoryError extends Error {
  constructor(message = "Failed to query match index") {
    super(message);
    this.name = "MatchIndexRepositoryError";
  }
}

export class MatchStorageError extends Error {
  constructor(message = "Failed to fetch match JSON from storage") {
    super(message);
    this.name = "MatchStorageError";
  }
}
