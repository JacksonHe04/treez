import { createHash, createHmac } from "node:crypto";

const apiUrl =
  process.env.TREEZ_LOCAL_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8791";
const signingSecret =
  process.env.TREEZ_LOCAL_WRITE_SECRET ?? "treez-local-closure-secret";
const parsedApiUrl = new URL(apiUrl);

if (!["localhost", "127.0.0.1", "::1"].includes(parsedApiUrl.hostname)) {
  throw new Error(
    "Write closure verification only runs against loopback URLs.",
  );
}

const run = Date.now().toString(36);
const user = {
  id: `closure-user-${run}`,
  username: `closure-verifier-${run}`,
};

type CreatedEntity = { id: string };
type EntityDetail = {
  rating_count: number;
  average_score: number;
  ratings: Array<{
    rated_at: string;
    commented_at: string;
    tags: Array<{ name: string }>;
  }>;
  relations: Array<{ relation_type: string; direction: string }>;
};

async function read<T>(pathname: string): Promise<T> {
  const response = await fetch(`${apiUrl}${pathname}`, {
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json()) as { data?: T; error?: unknown };
  if (!response.ok || payload.data === undefined) {
    throw new Error(
      `GET ${pathname} returned ${response.status}: ${JSON.stringify(payload)}`,
    );
  }
  return payload.data;
}

async function signed<T>(
  pathname: string,
  method: "POST" | "PUT",
  value: unknown,
): Promise<T> {
  const body = JSON.stringify(value);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const encodedUser = Buffer.from(JSON.stringify(user)).toString("base64url");
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", signingSecret)
    .update([timestamp, method, pathname, bodyHash, encodedUser].join("\n"))
    .digest("base64url");
  const response = await fetch(`${apiUrl}${pathname}`, {
    method,
    body,
    headers: {
      "Content-Type": "application/json",
      "x-treez-timestamp": timestamp,
      "x-treez-user": encodedUser,
      "x-treez-signature": signature,
    },
  });
  const payload = (await response.json()) as { data?: T; error?: unknown };
  if (!response.ok || payload.data === undefined) {
    throw new Error(
      `${method} ${pathname} returned ${response.status}: ${JSON.stringify(payload)}`,
    );
  }
  return payload.data;
}

async function create(
  domain: string,
  kind: string,
  label: string,
  relations: Array<{
    entityId: string;
    type: "created_by" | "track_of";
    position: number;
  }> = [],
): Promise<CreatedEntity> {
  return signed("/v1/entities", "POST", {
    domain,
    kind,
    name: `${label} ${run}`,
    description: `Isolated closure verification for ${domain}/${kind}.`,
    releaseDate: "2026-07-26",
    aliases: [`${label} alias ${run}`],
    metadata: [
      {
        key: "verification",
        value: "local-only",
        valueType: "text",
        position: 0,
      },
    ],
    relations,
  });
}

async function main(): Promise<void> {
  const artist = await create("music", "artist", "Artist");
  const album = await create("music", "album", "Album", [
    { entityId: artist.id, type: "created_by", position: 0 },
  ]);
  const song = await create("music", "song", "Song", [
    { entityId: artist.id, type: "created_by", position: 0 },
    { entityId: album.id, type: "track_of", position: 1 },
  ]);
  const director = await create("film", "director", "Director");
  const film = await create("film", "film", "Film", [
    { entityId: director.id, type: "created_by", position: 0 },
  ]);
  const author = await create("book", "author", "Author");
  const book = await create("book", "book", "Book", [
    { entityId: author.id, type: "created_by", position: 0 },
  ]);
  const studio = await create("game", "studio", "Studio");
  const game = await create("game", "game", "Game", [
    { entityId: studio.id, type: "created_by", position: 0 },
  ]);
  const created = {
    artist,
    album,
    song,
    director,
    film,
    author,
    book,
    studio,
    game,
  };

  for (const [index, [kind, entity]] of Object.entries(created).entries()) {
    await signed(`/v1/entities/${entity.id}/rating`, "PUT", {
      score: 6.5 + (index % 7) * 0.5,
      comment: `Local ${kind} appreciation`,
      commentedAt: "2026-07-20",
      tags: kind === "album" ? ["🌲", "🎵", "Heritage Green"] : [`${kind}-tag`],
    });
  }

  const before = await read<EntityDetail>(`/v1/entities/${album.id}`);
  await new Promise((resolve) => setTimeout(resolve, 20));
  await signed(`/v1/entities/${album.id}/rating`, "PUT", {
    score: 7.5,
    comment: "Updated local album appreciation",
    commentedAt: "2026-07-21",
    tags: ["🌲", "🎵", "Heritage Green"],
  });
  const after = await read<EntityDetail>(`/v1/entities/${album.id}`);
  const songDetail = await read<EntityDetail>(`/v1/entities/${song.id}`);
  const profile = await read<{
    ratings: unknown[];
    domains: Array<{ domain: string }>;
  }>(`/v1/profiles/${user.username}`);
  const totals: Record<string, number> = {};

  for (const domain of ["music", "film", "book", "game"]) {
    const response = await fetch(
      `${apiUrl}/v1/entities?${new URLSearchParams({
        domain,
        q: run,
        limit: "100",
      })}`,
    );
    const payload = (await response.json()) as { meta: { total: number } };
    totals[domain] = payload.meta.total;
  }

  const tagNames = after.ratings[0].tags.map((tag) => tag.name);
  const songRelations = songDetail.relations.map(
    (relation) => `${relation.relation_type}:${relation.direction}`,
  );
  const checks = {
    kinds: Object.keys(created).length === 9,
    domains:
      totals.music === 3 &&
      totals.film === 2 &&
      totals.book === 2 &&
      totals.game === 2,
    profile:
      profile.ratings.length === 9 &&
      new Set(profile.domains.map((item) => item.domain)).size === 4,
    upsert:
      before.ratings.length === 1 &&
      after.ratings.length === 1 &&
      after.rating_count === 1 &&
      after.average_score === 7.5,
    ratedAt: before.ratings[0].rated_at !== after.ratings[0].rated_at,
    commentedAt: after.ratings[0].commented_at.startsWith("2026-07-21"),
    tags:
      tagNames.length === 3 &&
      new Set(tagNames).size === 3 &&
      tagNames.includes("🌲") &&
      tagNames.includes("🎵"),
    relations:
      songRelations.includes("created_by:outgoing") &&
      songRelations.includes("track_of:outgoing"),
  };

  if (Object.values(checks).some((passed) => !passed)) {
    throw new Error(`Local write closure failed: ${JSON.stringify(checks)}`);
  }

  console.log(
    JSON.stringify(
      {
        status: "LOCAL_WRITE_CLOSURE_OK",
        run,
        totals,
        profileRatings: profile.ratings.length,
        albumAggregate: {
          ratingCount: after.rating_count,
          averageScore: after.average_score,
        },
        tagNames,
        checks,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
