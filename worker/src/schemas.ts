import { z } from "zod";

export const domainSchema = z.enum(["music", "film", "book", "game"]);
export const entityKindSchema = z.enum([
  "album",
  "song",
  "artist",
  "film",
  "director",
  "book",
  "author",
  "game",
  "studio",
]);

export const relationSchema = z.object({
  entityId: z.string().min(1).max(128),
  type: z.enum(["created_by", "track_of", "contributed_by", "related_to"]),
  position: z.number().int().min(0).max(10_000).default(0),
  note: z.string().trim().max(500).nullable().optional(),
});

export const metadataSchema = z.object({
  key: z.string().trim().min(1).max(64),
  value: z.string().trim().min(1).max(2_000),
  valueType: z
    .enum(["text", "number", "date", "boolean", "json"])
    .default("text"),
  position: z.number().int().min(0).max(10_000).default(0),
});

export const createEntitySchema = z.object({
  domain: domainSchema,
  kind: entityKindSchema,
  name: z.string().trim().min(1).max(240),
  description: z.string().trim().max(50_000).nullable().optional(),
  releaseDate: z.iso.date().nullable().optional(),
  aliases: z.array(z.string().trim().min(1).max(240)).max(30).default([]),
  metadata: z.array(metadataSchema).max(100).default([]),
  relations: z.array(relationSchema).max(100).default([]),
});

export const updateRatingSchema = z.object({
  score: z.number().min(0).max(10).multipleOf(0.1),
  comment: z.string().trim().max(20_000).nullable().optional(),
  commentedAt: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
  tags: z
    .array(z.string().trim().min(1).max(48))
    .max(20)
    .default([])
    .transform((values) => [...new Set(values)]),
});
