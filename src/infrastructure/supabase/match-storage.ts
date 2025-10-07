import { MatchStorageError } from "../../application/errors.js";
import type { MatchStorage } from "../../application/simulate-match-by-id.usecase.js";

type FetchLike = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => ReturnType<typeof fetch>;

export interface SupabaseMatchStorageConfig {
  baseUrl: string;
  bucket: string;
  serviceKey: string;
  fetchImpl?: FetchLike;
}

export class SupabaseMatchStorage implements MatchStorage {
  private readonly baseUrl: string;
  private readonly bucket: string;
  private readonly serviceKey: string;
  private readonly fetchImpl: FetchLike;

  constructor({ baseUrl, bucket, serviceKey, fetchImpl }: SupabaseMatchStorageConfig) {
    this.baseUrl = stripTrailingSlash(baseUrl);
    this.bucket = bucket.replace(/^\//, "");
    this.serviceKey = serviceKey;
    this.fetchImpl = fetchImpl ?? fetch;
  }

  async fetchJson(path: string): Promise<string> {
    const normalizedPath = path.replace(/^\//, "");
    const url = buildObjectUrl(this.baseUrl, this.bucket, normalizedPath);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: this.buildHeaders(),
      });
    } catch (error) {
      throw new MatchStorageError(
        error instanceof Error ? error.message : "Unexpected error fetching match JSON",
      );
    }

    if (!response.ok) {
      const reason = await safeReadText(response);
      throw new MatchStorageError(
        `Storage responded with ${response.status} ${response.statusText}${reason ? `: ${reason}` : ""}`,
      );
    }

    return response.text();
  }

  private buildHeaders(): Record<string, string> {
    return {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      Accept: "application/json",
    };
  }
}

function stripTrailingSlash(url: string): string {
  if (url.endsWith("/")) return url.slice(0, -1);
  return url;
}

function buildObjectUrl(baseUrl: string, bucket: string, objectPath: string): string {
  const encodedSegments = objectPath.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  const encodedBucket = encodeURIComponent(bucket);
  return `${baseUrl}/storage/v1/object/${encodedBucket}/${encodedSegments}`;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch (error) {
    return error instanceof Error ? error.message : "";
  }
}
