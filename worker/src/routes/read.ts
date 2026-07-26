import { Hono, type Context } from "hono";
import { z } from "zod";

import { escapeLike, normalizeName } from "../../../lib/treez/strings";
import { publicAssetUrl } from "../lib/storage";
import { domainSchema, entityKindSchema } from "../schemas";
import type { AppBindings } from "../types";

const listQuerySchema = z.object({
  domain: domainSchema.optional(),
  kind: entityKindSchema.optional(),
  q: z.string().trim().max(240).optional(),
  sort: z.enum(["recent", "name", "score", "popular"]).default("recent"),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

type EntityRow = {
  id: string;
  domain: string;
  kind: string;
  name: string;
  description: string | null;
  release_date: string | null;
  published_at: string;
  cover_url: string | null;
  rating_count: number;
  average_score: number | null;
};

type CoverRow = Record<string, unknown> & {
  asset_id?: string | null;
  cover_content_type?: string | null;
  cover_object_key?: string | null;
  cover_url?: string | null;
};

const publicRead = new Hono<AppBindings>();

function withResolvedCover<T extends CoverRow>(
  context: Context<AppBindings>,
  row: T,
): Omit<T, "asset_id" | "cover_content_type" | "cover_object_key"> & {
  cover_url: string | null;
} {
  const {
    asset_id: assetId,
    cover_content_type: contentType,
    cover_object_key: objectKey,
    cover_url: sourceUrl,
    ...rest
  } = row;
  const coverUrl =
    assetId && objectKey && contentType
      ? publicAssetUrl(context.env, objectKey)
      : (sourceUrl ?? null);
  return { ...rest, cover_url: coverUrl } as Omit<
    T,
    "asset_id" | "cover_content_type" | "cover_object_key"
  > & { cover_url: string | null };
}

publicRead.get("/health", async (context) => {
  const result = await context.env.DB.prepare("SELECT 1 AS ok").first<{
    ok: number;
  }>();
  return context.json({
    data: {
      status: result?.ok === 1 ? "ok" : "degraded",
      service: "treez-api",
      environment: context.env.ENVIRONMENT,
    },
  });
});

publicRead.get("/assets/:id", async (context) => {
  const asset = await context.env.DB.prepare(
    "SELECT object_key, content_type FROM assets WHERE id = ?",
  )
    .bind(context.req.param("id"))
    .first<{ object_key: string | null; content_type: string | null }>();
  if (!asset?.object_key || !asset.content_type) {
    return context.json(
      {
        error: {
          code: "ASSET_NOT_FOUND",
          message: "The requested Treez asset does not exist.",
        },
      },
      404,
    );
  }

  return new Response(null, {
    status: 302,
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      Location: publicAssetUrl(context.env, asset.object_key),
    },
  });
});

publicRead.get("/entities", async (context) => {
  const parsed = listQuerySchema.safeParse(context.req.query());
  if (!parsed.success) {
    return context.json(
      {
        error: {
          code: "INVALID_QUERY",
          message: "The entity filters are invalid.",
          details: parsed.error.flatten(),
        },
      },
      400,
    );
  }

  const { domain, kind, q, sort, limit, offset } = parsed.data;
  const where: string[] = ["e.is_public = 1"];
  const bindings: unknown[] = [];

  if (domain) {
    where.push("e.domain = ?");
    bindings.push(domain);
  }
  if (kind) {
    where.push("e.kind = ?");
    bindings.push(kind);
  }
  if (q) {
    const query = `%${escapeLike(normalizeName(q))}%`;
    where.push(
      `(e.normalized_name LIKE ? ESCAPE '\\' OR EXISTS (
        SELECT 1 FROM entity_aliases ea
        WHERE ea.entity_id = e.id AND ea.normalized_alias LIKE ? ESCAPE '\\'
      ))`,
    );
    bindings.push(query, query);
  }

  const orderBy = {
    recent: "e.published_at DESC, e.id",
    name: "e.normalized_name ASC, e.id",
    score: "average_score DESC NULLS LAST, rating_count DESC, e.id",
    popular: "rating_count DESC, average_score DESC NULLS LAST, e.id",
  }[sort];

  const from = `
    FROM entities e
    LEFT JOIN entity_rating_summary ers ON ers.entity_id = e.id
    LEFT JOIN assets a ON a.id = e.cover_asset_id
    WHERE ${where.join(" AND ")}`;

  const [itemsResult, countRow] = await context.env.DB.batch([
    context.env.DB.prepare(
      `SELECT e.id, e.domain, e.kind, e.name, e.description, e.release_date,
                e.published_at, a.id AS asset_id,
                a.object_key AS cover_object_key,
                a.content_type AS cover_content_type,
                a.source_url AS cover_url,
                COALESCE(ers.rating_count, 0) AS rating_count,
                ers.average_score
         ${from}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`,
    ).bind(...bindings, limit, offset),
    context.env.DB.prepare(`SELECT COUNT(*) AS total ${from}`).bind(
      ...bindings,
    ),
  ]);

  const count =
    (countRow.results[0] as { total: number } | undefined)?.total ?? 0;
  return context.json({
    data: (itemsResult.results as CoverRow[]).map((row) =>
      withResolvedCover(context, row),
    ) as EntityRow[],
    meta: { total: count, limit, offset },
  });
});

publicRead.get("/entities/:id", async (context) => {
  const id = context.req.param("id");
  const entity = await context.env.DB.prepare(
    `SELECT e.*, a.id AS asset_id, a.object_key AS cover_object_key,
            a.content_type AS cover_content_type,
            a.source_url AS cover_url,
            COALESCE(ers.rating_count, 0) AS rating_count,
            ers.average_score
     FROM entities e
     LEFT JOIN assets a ON a.id = e.cover_asset_id
     LEFT JOIN entity_rating_summary ers ON ers.entity_id = e.id
     WHERE e.id = ? AND e.is_public = 1`,
  )
    .bind(id)
    .first();

  if (!entity) {
    return context.json(
      {
        error: {
          code: "ENTITY_NOT_FOUND",
          message: "The requested public entity does not exist.",
        },
      },
      404,
    );
  }

  const [metadata, aliases, relations, ratings] = await context.env.DB.batch([
    context.env.DB.prepare(
      `SELECT key, value, value_type, position
         FROM entity_metadata WHERE entity_id = ?
         ORDER BY key, position`,
    ).bind(id),
    context.env.DB.prepare(
      `SELECT alias, locale FROM entity_aliases
         WHERE entity_id = ? ORDER BY normalized_alias`,
    ).bind(id),
    context.env.DB.prepare(
      `SELECT er.id, er.relation_type, er.position, er.note,
                related.id AS entity_id, related.domain, related.kind, related.name,
                CASE WHEN er.from_entity_id = ? THEN 'outgoing' ELSE 'incoming' END AS direction
         FROM entity_relations er
         JOIN entities related ON related.id =
           CASE WHEN er.from_entity_id = ? THEN er.to_entity_id ELSE er.from_entity_id END
         WHERE (er.from_entity_id = ? OR er.to_entity_id = ?)
           AND related.is_public = 1
         ORDER BY er.relation_type, er.position, related.normalized_name`,
    ).bind(id, id, id, id),
    context.env.DB.prepare(
      `SELECT r.id, r.score_tenths / 10.0 AS score, r.comment,
                r.commented_at, r.rated_at,
                p.slug AS profile_slug, p.display_name, p.avatar_url,
                COALESCE((
                  SELECT json_group_array(json_object('slug', t.slug, 'name', t.name))
                  FROM rating_tags rt JOIN tags t ON t.id = rt.tag_id
                  WHERE rt.rating_id = r.id
                  ORDER BY rt.position
                ), '[]') AS tags_json
         FROM ratings r
         JOIN profiles p ON p.id = r.user_id
         WHERE r.entity_id = ?
         ORDER BY r.rated_at DESC`,
    ).bind(id),
  ]);

  return context.json({
    data: {
      ...withResolvedCover(context, entity as CoverRow),
      metadata: metadata.results,
      aliases: aliases.results,
      relations: relations.results,
      ratings: ratings.results.map((rating) => {
        const row = rating as Record<string, unknown> & { tags_json: string };
        const { tags_json: tagsJson, ...rest } = row;
        return { ...rest, tags: JSON.parse(tagsJson) };
      }),
    },
  });
});

publicRead.get("/search", async (context) => {
  const q = context.req.query("q")?.trim();
  if (!q) return context.json({ data: [], meta: { total: 0 } });

  const result = await context.env.DB.prepare(
    `SELECT e.id, e.domain, e.kind, e.name, e.release_date,
            a.id AS asset_id, a.object_key AS cover_object_key,
            a.content_type AS cover_content_type,
            a.source_url AS cover_url,
            COALESCE(ers.rating_count, 0) AS rating_count,
            ers.average_score
     FROM entities e
     LEFT JOIN assets a ON a.id = e.cover_asset_id
     LEFT JOIN entity_rating_summary ers ON ers.entity_id = e.id
     WHERE e.is_public = 1
       AND (
         e.normalized_name LIKE ? ESCAPE '\\'
         OR EXISTS (
           SELECT 1 FROM entity_aliases ea
           WHERE ea.entity_id = e.id AND ea.normalized_alias LIKE ? ESCAPE '\\'
         )
       )
     ORDER BY
       CASE WHEN e.normalized_name = ? THEN 0
            WHEN e.normalized_name LIKE ? ESCAPE '\\' THEN 1
            ELSE 2 END,
       rating_count DESC,
       e.normalized_name
     LIMIT 50`,
  )
    .bind(
      `%${escapeLike(normalizeName(q))}%`,
      `%${escapeLike(normalizeName(q))}%`,
      normalizeName(q),
      `${escapeLike(normalizeName(q))}%`,
    )
    .all();

  return context.json({
    data: (result.results as CoverRow[]).map((row) =>
      withResolvedCover(context, row),
    ),
    meta: { total: result.results.length },
  });
});

async function profileResponse(
  context: Context<AppBindings>,
  column: "id" | "slug",
  value: string,
) {
  const profile = await context.env.DB.prepare(
    `SELECT id, slug, display_name, avatar_url, bio, joined_at
     FROM profiles WHERE ${column} = ?`,
  )
    .bind(value)
    .first<{ id: string } & Record<string, unknown>>();

  if (!profile) {
    return context.json(
      {
        error: {
          code: "PROFILE_NOT_FOUND",
          message: "The requested public profile does not exist.",
        },
      },
      404,
    );
  }

  const [ratings, domains, tags] = await context.env.DB.batch([
    context.env.DB.prepare(
      `SELECT r.id, r.score_tenths / 10.0 AS score, r.comment,
                r.commented_at, r.rated_at,
                e.id AS entity_id, e.name, e.domain, e.kind,
                a.id AS asset_id, a.object_key AS cover_object_key,
                a.content_type AS cover_content_type,
                a.source_url AS cover_url,
                COALESCE((
                  SELECT json_group_array(json_object('slug', t.slug, 'name', t.name))
                  FROM rating_tags rt JOIN tags t ON t.id = rt.tag_id
                  WHERE rt.rating_id = r.id
                  ORDER BY rt.position
                ), '[]') AS tags_json
         FROM ratings r
         JOIN entities e ON e.id = r.entity_id
         LEFT JOIN assets a ON a.id = e.cover_asset_id
         WHERE r.user_id = ? AND e.is_public = 1
         ORDER BY r.rated_at DESC`,
    ).bind(profile.id),
    context.env.DB.prepare(
      `SELECT e.domain, COUNT(*) AS rating_count,
                ROUND(AVG(r.score_tenths) / 10.0, 2) AS average_score
         FROM ratings r JOIN entities e ON e.id = r.entity_id
         WHERE r.user_id = ?
         GROUP BY e.domain ORDER BY rating_count DESC`,
    ).bind(profile.id),
    context.env.DB.prepare(
      `SELECT t.slug, t.name, COUNT(*) AS usage_count
         FROM rating_tags rt
         JOIN tags t ON t.id = rt.tag_id
         JOIN ratings r ON r.id = rt.rating_id
         WHERE r.user_id = ?
         GROUP BY t.id
         ORDER BY usage_count DESC, t.normalized_name
         LIMIT 30`,
    ).bind(profile.id),
  ]);

  return context.json({
    data: {
      profile,
      ratings: ratings.results.map((rating) => {
        const row = rating as CoverRow & { tags_json: string };
        const { tags_json: tagsJson, ...rest } = row;
        return {
          ...withResolvedCover(context, rest),
          tags: JSON.parse(tagsJson),
        };
      }),
      domains: domains.results,
      tags: tags.results,
    },
  });
}

publicRead.get("/profiles/by-id/:id", (context) =>
  profileResponse(context, "id", context.req.param("id")),
);

publicRead.get("/profiles/:slug", (context) =>
  profileResponse(context, "slug", context.req.param("slug")),
);

publicRead.get("/home", async (context) => {
  const profileSlug = context.req.query("profile");
  if (profileSlug) {
    const url = new URL(context.req.url);
    url.pathname = `/v1/profiles/${encodeURIComponent(profileSlug)}`;
    return publicRead.request(url, context.req.raw, context.env);
  }

  const [recent, acclaimed, domains] = await context.env.DB.batch([
    context.env.DB.prepare(
      `SELECT e.id, e.name, e.domain, e.kind, e.published_at,
              a.id AS asset_id, a.object_key AS cover_object_key,
              a.content_type AS cover_content_type,
              a.source_url AS cover_url,
              COALESCE(ers.rating_count, 0) AS rating_count,
              ers.average_score
       FROM entities e
       LEFT JOIN assets a ON a.id = e.cover_asset_id
       LEFT JOIN entity_rating_summary ers ON ers.entity_id = e.id
       WHERE e.is_public = 1
       ORDER BY e.published_at DESC LIMIT 12`,
    ),
    context.env.DB.prepare(
      `SELECT e.id, e.name, e.domain, e.kind,
              a.id AS asset_id, a.object_key AS cover_object_key,
              a.content_type AS cover_content_type,
              a.source_url AS cover_url,
              ers.rating_count, ers.average_score
       FROM entities e
       JOIN entity_rating_summary ers ON ers.entity_id = e.id
       LEFT JOIN assets a ON a.id = e.cover_asset_id
       WHERE e.is_public = 1 AND ers.rating_count > 0
       ORDER BY ers.average_score DESC, ers.rating_count DESC
       LIMIT 12`,
    ),
    context.env.DB.prepare(
      `SELECT domain, COUNT(*) AS entity_count
       FROM entities WHERE is_public = 1
       GROUP BY domain ORDER BY domain`,
    ),
  ]);

  return context.json({
    data: {
      recent: (recent.results as CoverRow[]).map((row) =>
        withResolvedCover(context, row),
      ),
      acclaimed: (acclaimed.results as CoverRow[]).map((row) =>
        withResolvedCover(context, row),
      ),
      domains: domains.results,
    },
  });
});

publicRead.get("/tags", async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT t.slug, t.name, COUNT(rt.rating_id) AS usage_count
     FROM tags t LEFT JOIN rating_tags rt ON rt.tag_id = t.id
     GROUP BY t.id
     ORDER BY usage_count DESC, t.normalized_name
     LIMIT 100`,
  ).all();

  return context.json({ data: result.results });
});

export { publicRead };
