import { TREEZ_API_URL } from "@/lib/treez/api";

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const upstream = await fetch(
    `${TREEZ_API_URL}/v1/search?${new URLSearchParams({ q: query })}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "public, max-age=10",
    },
  });
}
