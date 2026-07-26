import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { requireSignedUser } from "../lib/auth";
import { profileStatement } from "../lib/profile";
import { isAssetStorageConfigured, uploadAsset } from "../lib/storage";
import {
  normalizeName,
  normalizeTagName,
  slugify,
} from "../../../lib/treez/strings";
import { createEntitySchema, updateRatingSchema } from "../schemas";
import type { AppBindings } from "../types";
import { isValidDomainKind } from "../types";

const signedWrite = new Hono<AppBindings>();

signedWrite.use("*", requireSignedUser);

signedWrite.post(
  "/entities",
  zValidator("json", createEntitySchema, (result, context) => {
    if (!result.success) {
      return context.json(
        {
          error: {
            code: "INVALID_ENTITY",
            message: "The public entity data is invalid.",
            details: result.error.issues,
          },
        },
        400,
      );
    }
  }),
  async (context) => {
    const user = context.get("user");
    const input = context.req.valid("json");

    if (!isValidDomainKind(input.domain, input.kind)) {
      return context.json(
        {
          error: {
            code: "INVALID_ENTITY_KIND",
            message: "The entity kind does not belong to the selected domain.",
          },
        },
        400,
      );
    }

    if (input.relations.length > 0) {
      const placeholders = input.relations.map(() => "?").join(", ");
      const related = await context.env.DB.prepare(
        `SELECT id, domain, kind
           FROM entities
          WHERE id IN (${placeholders}) AND is_public = 1`,
      )
        .bind(...input.relations.map((relation) => relation.entityId))
        .all<{ id: string; domain: string; kind: string }>();
      const found = new Set(related.results.map((row) => row.id));
      const missing = input.relations
        .map((relation) => relation.entityId)
        .filter((id) => !found.has(id));
      if (missing.length > 0) {
        return context.json(
          {
            error: {
              code: "RELATED_ENTITY_NOT_FOUND",
              message: "One or more related public entities do not exist.",
              details: { ids: missing },
            },
          },
          400,
        );
      }

      const relatedById = new Map(
        related.results.map((row) => [row.id, row] as const),
      );
      const creatorKind = {
        music: "artist",
        film: "director",
        book: "author",
        game: "studio",
      }[input.domain];
      const invalid = input.relations.filter((relation) => {
        const target = relatedById.get(relation.entityId);
        if (!target || target.domain !== input.domain) return true;
        if (relation.type === "track_of") {
          return input.kind !== "song" || target.kind !== "album";
        }
        if (
          relation.type === "created_by" ||
          relation.type === "contributed_by"
        ) {
          return target.kind !== creatorKind;
        }
        return relation.type !== "related_to";
      });
      if (invalid.length > 0) {
        return context.json(
          {
            error: {
              code: "INVALID_ENTITY_RELATION",
              message:
                "One or more relations do not match the selected domain and entity kinds.",
              details: {
                relations: invalid.map((relation) => ({
                  entityId: relation.entityId,
                  type: relation.type,
                })),
              },
            },
          },
          400,
        );
      }
    }

    const id = crypto.randomUUID();
    const statements: D1PreparedStatement[] = [
      profileStatement(context.env.DB, user),
      context.env.DB.prepare(
        `INSERT INTO entities (
             id, domain, kind, name, normalized_name, description,
             release_date, created_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id,
        input.domain,
        input.kind,
        input.name,
        normalizeName(input.name),
        input.description ?? null,
        input.releaseDate ?? null,
        user.id,
      ),
      context.env.DB.prepare(
        `INSERT INTO source_records (
             id, record_type, record_id, source, source_id, checksum,
             verification_status
           ) VALUES (?, 'entity', ?, 'user', ?, ?, 'verified')`,
      ).bind(crypto.randomUUID(), id, id, await contentChecksum(input)),
    ];

    for (const alias of input.aliases) {
      statements.push(
        context.env.DB.prepare(
          `INSERT OR IGNORE INTO entity_aliases (
               id, entity_id, alias, normalized_alias
             ) VALUES (?, ?, ?, ?)`,
        ).bind(crypto.randomUUID(), id, alias, normalizeName(alias)),
      );
    }
    for (const item of input.metadata) {
      statements.push(
        context.env.DB.prepare(
          `INSERT INTO entity_metadata (
               entity_id, key, value, value_type, position
             ) VALUES (?, ?, ?, ?, ?)`,
        ).bind(id, item.key, item.value, item.valueType, item.position),
      );
    }
    for (const relation of input.relations) {
      statements.push(
        context.env.DB.prepare(
          `INSERT INTO entity_relations (
               id, from_entity_id, to_entity_id, relation_type, position, note
             ) VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(),
          id,
          relation.entityId,
          relation.type,
          relation.position,
          relation.note ?? null,
        ),
      );
    }

    await context.env.DB.batch(statements);
    return context.json({ data: { id } }, 201);
  },
);

signedWrite.put(
  "/entities/:id/rating",
  zValidator("json", updateRatingSchema, (result, context) => {
    if (!result.success) {
      return context.json(
        {
          error: {
            code: "INVALID_RATING",
            message: "The rating data is invalid.",
            details: result.error.issues,
          },
        },
        400,
      );
    }
  }),
  async (context) => {
    const user = context.get("user");
    const entityId = context.req.param("id");
    const input = context.req.valid("json");
    const entity = await context.env.DB.prepare(
      "SELECT id FROM entities WHERE id = ? AND is_public = 1",
    )
      .bind(entityId)
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

    const existing = await context.env.DB.prepare(
      "SELECT id FROM ratings WHERE user_id = ? AND entity_id = ?",
    )
      .bind(user.id, entityId)
      .first<{ id: string }>();
    const ratingId = existing?.id ?? crypto.randomUUID();
    const ratedAt = new Date().toISOString();
    const commentedAt = input.commentedAt
      ? new Date(input.commentedAt).toISOString()
      : ratedAt;
    const scoreTenths = Math.round(input.score * 10);
    const eventType = existing ? "updated" : "created";
    const statements: D1PreparedStatement[] = [
      profileStatement(context.env.DB, user),
      context.env.DB.prepare(
        `INSERT INTO ratings (
             id, user_id, entity_id, score_tenths, comment,
             commented_at, rated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id, entity_id) DO UPDATE SET
             score_tenths = excluded.score_tenths,
             comment = excluded.comment,
             commented_at = excluded.commented_at,
             rated_at = excluded.rated_at,
             updated_at = excluded.rated_at`,
      ).bind(
        ratingId,
        user.id,
        entityId,
        scoreTenths,
        input.comment ?? null,
        commentedAt,
        ratedAt,
      ),
      context.env.DB.prepare(
        `INSERT INTO rating_events (
             id, rating_id, user_id, entity_id, score_tenths, comment,
             commented_at, rated_at, event_type
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        ratingId,
        user.id,
        entityId,
        scoreTenths,
        input.comment ?? null,
        commentedAt,
        ratedAt,
        eventType,
      ),
      context.env.DB.prepare(
        "DELETE FROM rating_tags WHERE rating_id = ?",
      ).bind(ratingId),
    ];

    for (const [position, name] of input.tags.entries()) {
      const normalized = normalizeTagName(name);
      const tagHash = await hashText(normalized);
      const tagId = `tag_${tagHash}`;
      const tagSlug = `${slugify(name)}-${tagHash.slice(0, 10)}`;
      statements.push(
        context.env.DB.prepare(
          `INSERT INTO tags (
               id, slug, name, normalized_name, created_by
             ) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(normalized_name) DO UPDATE SET name = excluded.name`,
        ).bind(tagId, tagSlug, name, normalized, user.id),
        context.env.DB.prepare(
          `INSERT INTO rating_tags (rating_id, tag_id, position)
             SELECT ?, id, ? FROM tags WHERE normalized_name = ?`,
        ).bind(ratingId, position, normalized),
      );
    }

    await context.env.DB.batch(statements);
    const summary = await context.env.DB.prepare(
      `SELECT rating_count, average_score
       FROM entity_rating_summary WHERE entity_id = ?`,
    )
      .bind(entityId)
      .first();

    return context.json({
      data: {
        id: ratingId,
        score: input.score,
        comment: input.comment ?? null,
        commentedAt,
        ratedAt,
        tags: input.tags,
        aggregate: summary,
      },
    });
  },
);

signedWrite.put("/assets/:id/content", async (context) => {
  if (!isAssetStorageConfigured(context.env)) {
    return context.json(
      {
        error: {
          code: "ASSET_STORAGE_UNAVAILABLE",
          message: "Treez asset storage is not enabled yet.",
        },
      },
      503,
    );
  }

  const asset = await context.env.DB.prepare(
    "SELECT id, entity_id, kind FROM assets WHERE id = ?",
  )
    .bind(context.req.param("id"))
    .first<{ id: string; entity_id: string | null; kind: string }>();
  if (!asset) {
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

  const image = await readImageAsset(context.req.raw);
  if (!image.ok) {
    return context.json(
      {
        error: {
          code: image.code,
          message: image.message,
        },
      },
      400,
    );
  }

  const { body, contentType } = image;
  const checksum = await hashHex(body);
  const key = `${asset.kind}/${checksum}`;
  await uploadAsset(context.env, key, body, contentType);
  await context.env.DB.prepare(
    `UPDATE assets
        SET object_key = ?, content_type = ?, byte_size = ?, checksum = ?
      WHERE id = ?`,
  )
    .bind(key, contentType, body.byteLength, checksum, asset.id)
    .run();

  return context.json(
    {
      data: {
        id: asset.id,
        key,
        checksum,
        byteSize: body.byteLength,
      },
    },
    200,
  );
});

signedWrite.post("/assets", async (context) => {
  if (!isAssetStorageConfigured(context.env)) {
    return context.json(
      {
        error: {
          code: "ASSET_STORAGE_UNAVAILABLE",
          message: "Treez asset storage is not enabled yet.",
        },
      },
      503,
    );
  }

  const entityId = context.req.query("entityId");
  const kind = context.req.query("kind") ?? "attachment";
  if (!entityId || !["cover", "avatar", "attachment"].includes(kind)) {
    return context.json(
      {
        error: {
          code: "INVALID_ASSET",
          message: "A valid entityId and asset kind are required.",
        },
      },
      400,
    );
  }

  const entity = await context.env.DB.prepare(
    "SELECT id FROM entities WHERE id = ?",
  )
    .bind(entityId)
    .first();
  if (!entity) {
    return context.json(
      {
        error: {
          code: "ENTITY_NOT_FOUND",
          message: "The asset target does not exist.",
        },
      },
      404,
    );
  }

  const image = await readImageAsset(context.req.raw);
  if (!image.ok) {
    return context.json(
      {
        error: {
          code: image.code,
          message: image.message,
        },
      },
      400,
    );
  }

  const { body, contentType } = image;
  const checksum = await hashHex(body);
  const key = `${kind}/${checksum}`;
  await uploadAsset(context.env, key, body, contentType);

  const existingAsset = await context.env.DB.prepare(
    `SELECT id FROM assets
      WHERE entity_id = ? AND kind = ? AND checksum = ?
      LIMIT 1`,
  )
    .bind(entityId, kind, checksum)
    .first<{ id: string }>();
  const assetId = existingAsset?.id ?? crypto.randomUUID();
  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO assets (
           id, entity_id, kind, object_key, content_type, byte_size, checksum
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           object_key = excluded.object_key,
           content_type = excluded.content_type,
           byte_size = excluded.byte_size,
           checksum = excluded.checksum`,
    ).bind(
      assetId,
      entityId,
      kind,
      key,
      contentType,
      body.byteLength,
      checksum,
    ),
    context.env.DB.prepare(
      `UPDATE entities SET cover_asset_id = ?
         WHERE id = ? AND ? = 'cover'`,
    ).bind(assetId, entityId, kind),
  ]);

  return context.json({ data: { id: assetId, key } }, 201);
});

async function contentChecksum(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  return hashHex(encoded.buffer as ArrayBuffer);
}

async function hashText(value: string): Promise<string> {
  return hashHex(new TextEncoder().encode(value).buffer as ArrayBuffer);
}

type ImageAssetResult =
  | { ok: true; body: ArrayBuffer; contentType: string }
  | { ok: false; code: string; message: string };

async function readImageAsset(request: Request): Promise<ImageAssetResult> {
  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > 10 * 1024 * 1024) {
    return {
      ok: false,
      code: "INVALID_ASSET_SIZE",
      message: "Images must be between 1 byte and 10 MB.",
    };
  }

  const contentType =
    request.headers.get("content-type")?.split(";")[0]?.trim() ??
    "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    return {
      ok: false,
      code: "INVALID_ASSET_TYPE",
      message: "Treez asset storage only accepts images.",
    };
  }

  return { ok: true, body, contentType };
}

async function hashHex(
  value: ArrayBuffer | Uint8Array<ArrayBuffer>,
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export { signedWrite };
