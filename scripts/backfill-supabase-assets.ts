import { createHash, createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type AssetRow = {
  id: string;
  entity_id: string | null;
  kind: "cover" | "avatar" | "attachment";
  source_url: string;
  name: string | null;
};

type BackfillResult = {
  id: string;
  name: string | null;
  sourceUrl: string;
  status: "uploaded" | "failed";
  byteSize?: number;
  contentType?: string;
  error?: string;
};

const apply = process.argv.includes("--apply");
const local = process.argv.includes("--local");
const limitArgument = process.argv.find((value) =>
  value.startsWith("--limit="),
);
const limit = limitArgument
  ? Math.max(1, Number.parseInt(limitArgument.split("=")[1], 10))
  : 1_000;
const apiUrl =
  process.env.TREEZ_API_URL ??
  "https://treez-api-production.yingyingdontkill.workers.dev";
const secret = process.env.TREEZ_API_SECRET;
const sourceOverrides = parseSourceOverrides(
  process.env.TREEZ_ASSET_SOURCE_OVERRIDES,
);

async function main() {
  if (apply && !secret) {
    throw new Error("TREEZ_API_SECRET is required when --apply is used.");
  }

  const assets = queryAssets().slice(0, limit);
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          target: local ? "local" : "remote",
          candidates: assets.length,
          resolvable: assets.filter((asset) => assetSourceUrl(asset) !== null)
            .length,
          assets,
        },
        null,
        2,
      ),
    );
    return;
  }

  const results = await concurrentMap(assets, 4, backfillAsset);
  const report = {
    generatedAt: new Date().toISOString(),
    target: local ? "local" : "remote",
    candidates: assets.length,
    uploaded: results.filter((result) => result.status === "uploaded").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
  const reportPath = resolve(
    process.cwd(),
    ".agents/docs/260726/supabase-asset-backfill.json",
  );
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify({ ...report, results: undefined, reportPath }, null, 2),
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function queryAssets(): AssetRow[] {
  const wrangler = resolve(process.cwd(), "node_modules/.bin/wrangler");
  const command = [
    "d1",
    "execute",
    "treez-production",
    local ? "--local" : "--remote",
    ...(local ? [] : ["--env", "production"]),
    "--command",
    `SELECT a.id, a.entity_id, a.kind, a.source_url, e.name
       FROM assets a
       LEFT JOIN entities e ON e.id = a.entity_id
      WHERE a.source_url IS NOT NULL
        AND (a.content_type IS NULL OR a.byte_size IS NULL)
      ORDER BY a.id`,
    "--json",
  ];
  const output = execFileSync(wrangler, command, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const payload = JSON.parse(output) as Array<{ results?: AssetRow[] }>;
  return payload[0]?.results ?? [];
}

async function backfillAsset(asset: AssetRow): Promise<BackfillResult> {
  try {
    const sourceUrl = assetSourceUrl(asset);
    if (!sourceUrl) {
      throw new Error(
        "source is a Notion attachment reference without a downloadable URL",
      );
    }
    const source = await fetch(sourceUrl, {
      redirect: "follow",
      headers: sourceRequestHeaders(sourceUrl),
    });
    if (!source.ok) {
      throw new Error(`source returned HTTP ${source.status}`);
    }
    const body = new Uint8Array(await source.arrayBuffer());
    if (body.byteLength === 0 || body.byteLength > 10 * 1024 * 1024) {
      throw new Error(`source size ${body.byteLength} is outside 1 byte–10 MB`);
    }
    const contentType =
      source.headers.get("content-type")?.split(";")[0] ??
      "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      throw new Error(`source content type ${contentType} is not an image`);
    }

    const pathname = `/v1/assets/${encodeURIComponent(asset.id)}/content`;
    const timestamp = String(Math.floor(Date.now() / 1_000));
    const encodedUser = Buffer.from(
      JSON.stringify({
        id: "treez-notion-import",
        username: "Treez Notion Import",
      }),
    ).toString("base64url");
    const bodyHash = createHash("sha256").update(body).digest("hex");
    const message = [timestamp, "PUT", pathname, bodyHash, encodedUser].join(
      "\n",
    );
    const signature = createHmac("sha256", secret as string)
      .update(message)
      .digest("base64url");
    const upload = await fetch(`${apiUrl}${pathname}`, {
      method: "PUT",
      body,
      headers: {
        "Content-Type": contentType,
        "x-treez-timestamp": timestamp,
        "x-treez-user": encodedUser,
        "x-treez-signature": signature,
      },
    });
    if (!upload.ok) {
      const message = await upload.text();
      throw new Error(`upload returned HTTP ${upload.status}: ${message}`);
    }
    return {
      id: asset.id,
      name: asset.name,
      sourceUrl: asset.source_url,
      status: "uploaded",
      byteSize: body.byteLength,
      contentType,
    };
  } catch (error) {
    return {
      id: asset.id,
      name: asset.name,
      sourceUrl: asset.source_url,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function sourceRequestHeaders(sourceUrl: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/140.0.0.0 Safari/537.36",
  };
  const hostname = new URL(sourceUrl).hostname;
  if (hostname.endsWith(".doubanio.com")) {
    headers.Referer = "https://movie.douban.com/";
  }
  return headers;
}

function assetSourceUrl(asset: AssetRow): string | null {
  const candidate = sourceOverrides[asset.id] ?? asset.source_url;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function parseSourceOverrides(
  value: string | undefined,
): Record<string, string> {
  if (!value) return {};
  const parsed = JSON.parse(value) as unknown;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    Object.values(parsed).some((item) => typeof item !== "string")
  ) {
    throw new Error(
      "TREEZ_ASSET_SOURCE_OVERRIDES must be a JSON object of asset IDs to URLs.",
    );
  }
  return parsed as Record<string, string>;
}

async function concurrentMap<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () =>
      worker(),
    ),
  );
  return results;
}
