import { describe, expect, it, vi } from "vitest";

import {
  SupabaseMatchIndexRepository,
  type SupabaseClientLike,
} from "../src/infrastructure/supabase/match-index.repository.js";
import { MatchIndexRepositoryError } from "../src/application/errors.js";

type PostgrestErrorLike = {
  message: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

type MaybeSingleResult<T> = { data: T | null; error: PostgrestErrorLike | null };

describe("SupabaseMatchIndexRepository", () => {
  it("returns metadata when the match id is present in the index", async () => {
    const matchRow = {
      id: "atl-mad-20240928",
      date: "2024-09-28T19:00:00.000Z",
      home: "Atletico Madrid",
      away: "Real Madrid",
      storage_path: "matches/atl-mad-20240928.json",
      size_bytes: 2048,
      checksum: "sha256:abc",
      created_at: "2024-09-29T09:10:11.000Z",
    } satisfies MaybeSingleResult<unknown>["data"];

    const repo = buildRepositoryWithResponse({ data: matchRow, error: null });

    const result = await repo.findById("atl-mad-20240928");

    expect(result).toEqual({
      id: "atl-mad-20240928",
      date: "2024-09-28T19:00:00.000Z",
      home: "Atletico Madrid",
      away: "Real Madrid",
      storagePath: "matches/atl-mad-20240928.json",
      sizeBytes: 2048,
      checksum: "sha256:abc",
      createdAt: "2024-09-29T09:10:11.000Z",
    });
  });

  it("returns null when the match id is missing", async () => {
    const repo = buildRepositoryWithResponse({ data: null, error: null });

    const result = await repo.findById("non-existent");

    expect(result).toBeNull();
  });

  it("maps Supabase client errors to domain failures", async () => {
    const repo = buildRepositoryWithResponse({
      data: null,
      error: { message: "permission denied", details: "", hint: "", code: "42501" },
    });

    await expect(repo.findById("atl-mad-20240928")).rejects.toBeInstanceOf(
      MatchIndexRepositoryError,
    );
  });
});

function buildRepositoryWithResponse(response: MaybeSingleResult<unknown>) {
  const maybeSingle = vi.fn().mockResolvedValue(response);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  const client: SupabaseClientLike = {
    from,
  } as SupabaseClientLike;

  const repository = new SupabaseMatchIndexRepository(client);

  return repository;
}
