import type {
  MatchIndexRow,
  PostgrestErrorLike,
  PostgrestSingleResponse,
  SupabaseClientLike,
  SupabaseFromBuilder,
  SupabaseQueryBuilder,
} from "./match-index.repository.js";

type FetchLike = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => ReturnType<typeof fetch>;

export interface SupabaseRestClientConfig {
  baseUrl: string;
  serviceKey: string;
  schema?: string;
  fetchImpl?: FetchLike;
}

export function createSupabaseRestClient(config: SupabaseRestClientConfig): SupabaseClientLike {
  const baseUrl = stripTrailingSlash(config.baseUrl);
  const fetchImpl = config.fetchImpl ?? fetch;

  const from: SupabaseClientLike["from"] = (table: string): SupabaseFromBuilder => {
    return {
      select: (query: string): SupabaseQueryBuilder => {
        return {
          eq: (column: string, value: string) => ({
            maybeSingle: () =>
              requestSingle({
                baseUrl,
                table,
                query,
                column,
                value,
                schema: config.schema,
                fetchImpl,
                serviceKey: config.serviceKey,
              }),
          }),
        };
      },
    };
  };

  return {
    from,
  };
}

interface RequestParams {
  baseUrl: string;
  table: string;
  query: string;
  column: string;
  value: string;
  schema: string | undefined;
  fetchImpl: FetchLike;
  serviceKey: string;
}

async function requestSingle(
  params: RequestParams,
): Promise<PostgrestSingleResponse<MatchIndexRow>> {
  const url = buildRestUrl(params.baseUrl, params.table, params.query, params.column, params.value);
  try {
    const response = await params.fetchImpl(url, {
      method: "GET",
      headers: buildHeaders(params.serviceKey, params.schema),
    });

    const text = await safeReadText(response);
    if (!response.ok) {
      return {
        data: null,
        error: buildError(text || response.statusText, String(response.status)),
      } satisfies PostgrestSingleResponse<MatchIndexRow>;
    }

    if (!text) {
      return { data: null, error: null } satisfies PostgrestSingleResponse<MatchIndexRow>;
    }

    const parsed = parseJson(text);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return { data: null, error: null } satisfies PostgrestSingleResponse<MatchIndexRow>;
      }
      return {
        data: parsed[0] as MatchIndexRow,
        error: null,
      } satisfies PostgrestSingleResponse<MatchIndexRow>;
    }

    if (parsed && typeof parsed === "object") {
      return {
        data: parsed as MatchIndexRow,
        error: null,
      } satisfies PostgrestSingleResponse<MatchIndexRow>;
    }

    return { data: null, error: null } satisfies PostgrestSingleResponse<MatchIndexRow>;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request Supabase";
    return {
      data: null,
      error: buildError(message),
    } satisfies PostgrestSingleResponse<MatchIndexRow>;
  }
}

function buildHeaders(serviceKey: string, schema: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: "application/json",
    Prefer: "count=none",
  };
  if (schema) {
    headers["Accept-Profile"] = schema;
    headers["Content-Profile"] = schema;
  }
  return headers;
}

function buildRestUrl(
  baseUrl: string,
  table: string,
  query: string,
  column: string,
  value: string,
): string {
  const search = new URLSearchParams();
  search.set("select", query);
  search.set(column, `eq.${value}`);
  search.set("limit", "1");
  const sanitizedBase = stripTrailingSlash(baseUrl);
  return `${sanitizedBase}/rest/v1/${table}?${search.toString()}`;
}

function stripTrailingSlash(url: string): string {
  if (url.endsWith("/")) return url.slice(0, -1);
  return url;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch (error) {
    return error instanceof Error ? error.message : "";
  }
}

function buildError(message: string, code?: string): PostgrestErrorLike {
  return {
    message,
    details: null,
    hint: null,
    code: code ?? null,
  };
}
