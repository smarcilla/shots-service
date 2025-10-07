import { MatchIndexRepositoryError } from "../../application/errors.js";

export type MatchIndexRecord = {
  id: string;
  date: string;
  home: string;
  away: string;
  storagePath: string;
  sizeBytes: number | null;
  checksum: string | null;
  createdAt: string;
};

export type SupabaseFromBuilder = {
  select(query: string, options?: Record<string, unknown>): SupabaseQueryBuilder;
};

export type SupabaseQueryBuilder = {
  eq(column: string, value: string): SupabaseMaybeSingleQuery;
};

export type PostgrestErrorLike = {
  message: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

export type PostgrestSingleResponse<T> = {
  data: T | null;
  error: PostgrestErrorLike | null;
};

export type SupabaseMaybeSingleQuery = {
  maybeSingle(): Promise<PostgrestSingleResponse<MatchIndexRow>>;
};

export type MatchIndexRow = {
  id: string;
  date: string;
  home: string;
  away: string;
  storage_path: string;
  size_bytes: number | null;
  checksum: string | null;
  created_at: string;
};

export interface SupabaseClientLike {
  from(table: string): SupabaseFromBuilder;
}

export class SupabaseMatchIndexRepository {
  constructor(private readonly client: SupabaseClientLike) {}

  async findById(id: string): Promise<MatchIndexRecord | null> {
    const response = await this.client
      .from("matches_index")
      .select("id,date,home,away,storage_path,size_bytes,checksum,created_at", {
        head: false,
      })
      .eq("id", id)
      .maybeSingle();

    if (response.error) {
      throw new MatchIndexRepositoryError(response.error.message);
    }

    if (!response.data) {
      return null;
    }

    const row = response.data;

    return {
      id: row.id,
      date: row.date,
      home: row.home,
      away: row.away,
      storagePath: row.storage_path,
      sizeBytes: row.size_bytes,
      checksum: row.checksum,
      createdAt: row.created_at,
    } satisfies MatchIndexRecord;
  }
}
