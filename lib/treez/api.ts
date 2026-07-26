import type { Domain, EntityKind } from "./config";
import type {
  EntityDetail,
  EntitySummary,
  ListResponse,
  PublicHome,
  PublicProfile,
} from "./types";

export const TREEZ_API_URL =
  process.env.TREEZ_API_URL ??
  "https://treez-api-production.yingyingdontkill.workers.dev";

type ApiErrorPayload = {
  error?: { code?: string; message?: string };
};

export class TreezApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "TreezApiError";
  }
}

export function isTreezApiNotFound(error: unknown): boolean {
  return error instanceof TreezApiError && error.status === 404;
}

async function treezFetch<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${TREEZ_API_URL}${pathname}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    cache: init?.cache ?? "no-store",
  });
  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => null)) as ApiErrorPayload | null;
    throw new TreezApiError(
      payload?.error?.message ??
        `Treez API request failed with ${response.status}.`,
      response.status,
      payload?.error?.code,
    );
  }
  return (await response.json()) as T;
}

export async function listEntities(input: {
  domain?: Domain;
  kind?: EntityKind;
  q?: string;
  sort?: "recent" | "name" | "score" | "popular";
  limit?: number;
  offset?: number;
}): Promise<ListResponse<EntitySummary[]>> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return treezFetch(`/v1/entities?${search}`);
}

export async function searchEntities(
  query: string,
): Promise<ListResponse<EntitySummary[]>> {
  return treezFetch(`/v1/search?${new URLSearchParams({ q: query })}`);
}

export async function getEntity(id: string): Promise<EntityDetail> {
  const response = await treezFetch<{ data: EntityDetail }>(
    `/v1/entities/${encodeURIComponent(id)}`,
  );
  return response.data;
}

export async function getPublicHome(): Promise<PublicHome> {
  const response = await treezFetch<{ data: PublicHome }>("/v1/home");
  return response.data;
}

export async function getProfile(slug: string): Promise<PublicProfile> {
  const response = await treezFetch<{ data: PublicProfile }>(
    `/v1/profiles/${encodeURIComponent(slug)}`,
  );
  return response.data;
}

export async function getProfileById(id: string): Promise<PublicProfile> {
  const response = await treezFetch<{ data: PublicProfile }>(
    `/v1/profiles/by-id/${encodeURIComponent(id)}`,
  );
  return response.data;
}
