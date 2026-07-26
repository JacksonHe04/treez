import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseDocument } from "yaml";

import { normalizeName } from "../lib/treez/strings";

const DEFAULT_ROOT =
  "/Users/jackson/iNon/WiKi/notion/All About Myself/Dimensions/Hobbies/Music/Albums & Artists";
const DEFAULT_OUTPUT = path.resolve(".agents/docs/260726/import");
const IMPORT_USER = {
  id: "8pqFCzEJpyYdXWAObnzmq8337FIVrzmZ",
  slug: "yingyingdontkill",
  displayName: "小缨缨",
};

type CloudDatabaseKind = "album" | "artist" | "song" | "score";
type EntityKind = Exclude<CloudDatabaseKind, "score">;
type VerificationStatus = "pending" | "verified";

type CloudManifest = {
  workspace: { id: string; name: string };
  verifiedAt: string;
  databases: Record<
    CloudDatabaseKind,
    {
      pageId: string;
      dataSourceId: string;
      count: number;
      idVerification: "complete" | "partial";
    }
  >;
  limitations: string[];
};

type NotionPage = {
  filePath: string;
  relativePath: string;
  title: string;
  notionId: string;
  inonId?: string;
  resource?: string;
  createdTime?: string;
  lastEditedTime?: string;
  parentId: string;
  properties: Record<string, unknown>;
  body: string;
  checksum: string;
  raw: Record<string, unknown>;
};

type EntityMetadata = {
  key: string;
  value: string;
  valueType: "text" | "number" | "date" | "boolean" | "json";
};

type Entity = {
  id: string;
  kind: EntityKind;
  page: NotionPage;
  description: string | null;
  releaseDate: string | null;
  metadata: EntityMetadata[];
  coverUrl: string | null;
};

type Relation = {
  id: string;
  fromId: string;
  toId: string;
  type: "created_by" | "track_of";
  position: number;
  sourcePage: NotionPage;
};

type Rating = {
  id: string;
  entityId: string;
  scoreTenths: number;
  comment: string | null;
  commentedAt: string;
  ratedAt: string;
  sourcePage: NotionPage;
};

type Conflict = {
  type: "duplicate-candidate" | "orphan-relation" | "invalid-score";
  message: string;
  sourceIds: string[];
};

type ImportPlan = {
  generatedAt: string;
  batchId: string;
  cloudManifest: CloudManifest;
  pages: Record<CloudDatabaseKind, NotionPage[]>;
  entities: Entity[];
  relations: Relation[];
  ratings: Rating[];
  conflicts: Conflict[];
};

async function main(): Promise<void> {
  const argumentsMap = parseArguments(process.argv.slice(2));
  const sourceRoot = path.resolve(
    String(argumentsMap.get("--source-root") ?? DEFAULT_ROOT),
  );
  const outputDirectory = path.resolve(
    String(argumentsMap.get("--output-dir") ?? DEFAULT_OUTPUT),
  );
  const manifestPath = path.resolve(
    String(
      argumentsMap.get("--cloud-manifest") ??
        "scripts/notion/cloud-manifest.json",
    ),
  );

  const cloudManifest = JSON.parse(
    await readFile(manifestPath, "utf8"),
  ) as CloudManifest;
  const plan = await createPlan(sourceRoot, cloudManifest);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, "dry-run.json"),
    `${JSON.stringify(toSerializablePlan(plan), null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDirectory, "dry-run.md"),
    renderReport(plan, sourceRoot),
    "utf8",
  );
  await writeFile(
    path.join(outputDirectory, "apply.sql"),
    renderSql(plan, sourceRoot),
    "utf8",
  );

  console.log(renderConsoleSummary(plan, outputDirectory));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

function parseArguments(values: string[]): Map<string, string | true> {
  const result = new Map<string, string | true>();
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (!argument.startsWith("--")) continue;
    const next = values[index + 1];
    if (next && !next.startsWith("--")) {
      result.set(argument, next);
      index += 1;
    } else {
      result.set(argument, true);
    }
  }
  return result;
}

async function createPlan(
  root: string,
  manifest: CloudManifest,
): Promise<ImportPlan> {
  const files = await markdownFiles(root);
  const parsed = (
    await Promise.all(files.map((file) => parseNotionPage(file, root)))
  ).filter((page): page is NotionPage => page !== null);
  const pages = {
    album: parsed.filter(
      (page) => page.parentId === manifest.databases.album.pageId,
    ),
    artist: parsed.filter(
      (page) => page.parentId === manifest.databases.artist.pageId,
    ),
    song: parsed.filter(
      (page) => page.parentId === manifest.databases.song.pageId,
    ),
    score: parsed.filter(
      (page) => page.parentId === manifest.databases.score.pageId,
    ),
  };
  const scoreById = new Map(
    pages.score.map((page) => [page.notionId, Number(page.title)]),
  );
  const entities = [
    ...pages.album.map((page) => entityFromPage("album", page)),
    ...pages.artist.map((page) => entityFromPage("artist", page)),
    ...pages.song.map((page) => entityFromPage("song", page)),
  ];
  const entityIdByNotionId = new Map(
    entities.map((entity) => [entity.page.notionId, entity.id]),
  );
  const conflicts: Conflict[] = [];
  const relations = createRelations(entities, entityIdByNotionId, conflicts);
  const ratings = entities
    .map((entity) => ratingFromEntity(entity, scoreById, conflicts))
    .filter((rating): rating is Rating => rating !== null);

  for (const [key, group] of groupBy(
    entities,
    (entity) => `${entity.kind}:${normalizeName(entity.page.title)}`,
  )) {
    if (group.length < 2) continue;
    conflicts.push({
      type: "duplicate-candidate",
      message: `Multiple ${key} records share the same normalized title; creator relations must disambiguate them.`,
      sourceIds: group.map((entity) => entity.page.notionId),
    });
  }

  const snapshotChecksum = checksum(
    JSON.stringify({
      source: entities.map((entity) => entity.page.checksum).sort(),
      manifest: manifest.verifiedAt,
    }),
  );

  return {
    generatedAt: new Date().toISOString(),
    batchId: `import_${snapshotChecksum.slice(0, 24)}`,
    cloudManifest: manifest,
    pages,
    entities,
    relations,
    ratings,
    conflicts,
  };
}

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) return markdownFiles(target);
        return entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
      }),
  );
  return nested.flat();
}

async function parseNotionPage(
  filePath: string,
  root: string,
): Promise<NotionPage | null> {
  const source = (await readFile(filePath, "utf8")).replace(/\r\n/g, "\n");
  if (!source.startsWith("---\n")) return null;
  const boundary = source.indexOf("\n---\n", 4);
  if (boundary < 0) return null;

  const document = parseDocument(source.slice(4, boundary), {
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    throw new Error(
      `Invalid YAML frontmatter in ${filePath}: ${document.errors[0].message}`,
    );
  }

  const raw = document.toJS() as Record<string, unknown>;
  if (
    raw.type !== "Notion Page" ||
    typeof raw.notion_id !== "string" ||
    typeof raw.notion_parent_id !== "string" ||
    typeof raw.title !== "string"
  ) {
    return null;
  }

  return {
    filePath,
    relativePath: path.relative(root, filePath),
    title: raw.title,
    notionId: raw.notion_id,
    inonId: stringValue(raw.inon_id),
    resource: stringValue(raw.resource),
    createdTime: stringValue(raw.created_time),
    lastEditedTime: stringValue(raw.last_edited_time),
    parentId: raw.notion_parent_id,
    properties: isRecord(raw.properties) ? raw.properties : {},
    body: cleanBody(source.slice(boundary + 5), raw.title),
    checksum: checksum(source),
    raw,
  };
}

function entityFromPage(kind: EntityKind, page: NotionPage): Entity {
  const metadataKeys: Record<EntityKind, string[]> = {
    album: ["Genre"],
    artist: ["Country", "Region", "Form", "Birth", "Label", "Grade", "Number"],
    song: ["Track"],
  };
  const metadata = metadataKeys[kind].flatMap((key) => {
    const value = page.properties[key];
    if (value === undefined || value === null || value === "") return [];
    return [
      {
        key: normalizeMetadataKey(key),
        value: metadataValue(value),
        valueType: metadataValueType(value),
      },
    ];
  });

  return {
    id: entityId(page.notionId),
    kind,
    page,
    description: null,
    releaseDate:
      kind === "album" ? nullableString(page.properties["Release Date"]) : null,
    metadata,
    coverUrl: kind === "album" ? firstString(page.properties.Cover) : null,
  };
}

function metadataValueType(value: unknown): EntityMetadata["valueType"] {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value) || isRecord(value)) return "json";
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return "date";
  return "text";
}

function metadataValue(value: unknown): string {
  return Array.isArray(value) || isRecord(value)
    ? JSON.stringify(value)
    : String(value).trim();
}

function createRelations(
  entities: Entity[],
  entityIdByNotionId: Map<string, string>,
  conflicts: Conflict[],
): Relation[] {
  const relations: Relation[] = [];

  for (const entity of entities) {
    const definitions =
      entity.kind === "album"
        ? [{ property: "Artists", type: "created_by" as const }]
        : entity.kind === "song"
          ? [
              { property: "Artist", type: "created_by" as const },
              { property: "Album", type: "track_of" as const },
            ]
          : [];

    for (const definition of definitions) {
      for (const [position, notionId] of relationIds(
        entity.page.properties[definition.property],
      ).entries()) {
        const toId = entityIdByNotionId.get(notionId);
        if (!toId) {
          conflicts.push({
            type: "orphan-relation",
            message: `${entity.page.title} references a missing ${definition.property} page.`,
            sourceIds: [entity.page.notionId, notionId],
          });
          continue;
        }
        relations.push({
          id: stableId("rel", `${entity.id}:${toId}:${definition.type}`),
          fromId: entity.id,
          toId,
          type: definition.type,
          position,
          sourcePage: entity.page,
        });
      }
    }
  }

  return uniqueBy(relations, (relation) => relation.id);
}

function ratingFromEntity(
  entity: Entity,
  scoreById: Map<string, number>,
  conflicts: Conflict[],
): Rating | null {
  let score: number | undefined;
  if (entity.kind === "song" || entity.kind === "artist") {
    const direct = entity.page.properties.Score;
    if (typeof direct === "number") score = direct;
    if (typeof direct === "string" && direct.trim()) score = Number(direct);
  }
  if (score === undefined && entity.kind === "album") {
    const scoreId = relationIds(entity.page.properties["Score Database"])[0];
    if (scoreId) score = scoreById.get(scoreId);
    if (score === undefined) {
      const stars = stringValue(entity.page.properties.Star);
      if (stars) score = (stars.match(/⭐/g)?.length ?? 0) * 2;
    }
  }
  if (score === undefined || Number.isNaN(score)) return null;
  if (score < 0 || score > 10 || Math.round(score * 10) !== score * 10) {
    conflicts.push({
      type: "invalid-score",
      message: `${entity.page.title} has an invalid score: ${score}.`,
      sourceIds: [entity.page.notionId],
    });
    return null;
  }

  const comment =
    entity.kind === "song"
      ? (nullableString(entity.page.properties["Short Comment"]) ??
        nullableString(entity.page.body))
      : nullableString(entity.page.body);
  const commentedAt =
    entity.kind === "album"
      ? (dateTime(entity.page.properties["Appreciation Date"]) ??
        entity.page.lastEditedTime ??
        entity.page.createdTime)
      : (entity.page.lastEditedTime ?? entity.page.createdTime);
  const ratedAt =
    entity.page.lastEditedTime ??
    entity.page.createdTime ??
    new Date(0).toISOString();

  return {
    id: stableId("rating", `${IMPORT_USER.id}:${entity.id}`),
    entityId: entity.id,
    scoreTenths: Math.round(score * 10),
    comment,
    commentedAt: commentedAt ?? ratedAt,
    ratedAt,
    sourcePage: entity.page,
  };
}

function renderSql(plan: ImportPlan, sourceRootPath: string): string {
  const statements: string[] = [
    "-- Generated by scripts/import-notion.ts. Review dry-run.md before applying.",
    `-- Batch: ${plan.batchId}`,
    "PRAGMA foreign_keys = ON;",
    sql`
      INSERT INTO profiles (id, slug, display_name)
      VALUES (${IMPORT_USER.id}, ${IMPORT_USER.slug}, ${IMPORT_USER.displayName})
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        display_name = excluded.display_name,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
    `,
    sql`
      INSERT INTO import_batches (
        id, mode, status, source, started_at, completed_at, summary_json
      ) VALUES (
        ${plan.batchId}, 'apply', 'running', 'cross-validated',
        ${plan.generatedAt}, NULL, '{}'
      )
      ON CONFLICT(id) DO UPDATE SET
        status = 'running',
        completed_at = NULL,
        error_message = NULL;
    `,
  ];

  for (const entity of plan.entities) {
    statements.push(sql`
      INSERT INTO entities (
        id, domain, kind, name, normalized_name, description, release_date,
        created_by, created_at, updated_at, published_at
      ) VALUES (
        ${entity.id}, 'music', ${entity.kind}, ${entity.page.title},
        ${normalizeName(entity.page.title)}, ${entity.description},
        ${entity.releaseDate}, ${IMPORT_USER.id},
        ${entity.page.createdTime ?? plan.generatedAt},
        ${entity.page.lastEditedTime ?? plan.generatedAt},
        ${entity.page.createdTime ?? plan.generatedAt}
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        normalized_name = excluded.normalized_name,
        description = excluded.description,
        release_date = excluded.release_date,
        updated_at = excluded.updated_at;
    `);

    entity.metadata.forEach((item, position) => {
      statements.push(sql`
        INSERT INTO entity_metadata (
          entity_id, key, value, value_type, position
        ) VALUES (
          ${entity.id}, ${item.key}, ${item.value}, ${item.valueType}, ${position}
        )
        ON CONFLICT(entity_id, key, position) DO UPDATE SET
          value = excluded.value,
          value_type = excluded.value_type;
      `);
    });

    if (entity.coverUrl) {
      const assetId = stableId("asset", entity.id);
      const coverChecksum = checksum(entity.coverUrl);
      statements.push(
        sql`
          INSERT INTO assets (
            id, entity_id, kind, object_key, source_url, checksum, alt_text
          ) VALUES (
            ${assetId}, ${entity.id}, 'cover',
            ${`pending/notion/${coverChecksum}`}, ${entity.coverUrl},
            ${coverChecksum}, ${`${entity.page.title} 封面`}
          )
          ON CONFLICT(id) DO UPDATE SET
            entity_id = excluded.entity_id,
            object_key = excluded.object_key,
            source_url = excluded.source_url,
            checksum = excluded.checksum,
            alt_text = excluded.alt_text;
        `,
        sql`
          UPDATE entities SET cover_asset_id = ${assetId}
          WHERE id = ${entity.id};
        `,
      );
    }

    statements.push(
      sourceRecordSql({
        id: stableId("source", `entity:${entity.page.notionId}`),
        recordType: "entity",
        recordId: entity.id,
        page: entity.page,
        batchId: plan.batchId,
        verificationStatus: verificationStatusForPage(plan, entity.page),
        sourceRootPath,
      }),
    );
  }

  for (const relation of plan.relations) {
    statements.push(
      sql`
        INSERT INTO entity_relations (
          id, from_entity_id, to_entity_id, relation_type, position
        ) VALUES (
          ${relation.id}, ${relation.fromId}, ${relation.toId},
          ${relation.type}, ${relation.position}
        )
        ON CONFLICT(id) DO UPDATE SET
          position = excluded.position;
      `,
      sourceRecordSql({
        id: stableId("source", `relation:${relation.id}`),
        recordType: "relation",
        recordId: relation.id,
        page: relation.sourcePage,
        sourceIdSuffix: `relation:${relation.type}:${relation.toId}`,
        batchId: plan.batchId,
        verificationStatus: verificationStatusForPage(
          plan,
          relation.sourcePage,
        ),
        sourceRootPath,
      }),
    );
  }

  for (const rating of plan.ratings) {
    statements.push(
      sql`
        INSERT INTO ratings (
          id, user_id, entity_id, score_tenths, comment, commented_at,
          rated_at, created_at, updated_at
        ) VALUES (
          ${rating.id}, ${IMPORT_USER.id}, ${rating.entityId},
          ${rating.scoreTenths}, ${rating.comment}, ${rating.commentedAt},
          ${rating.ratedAt}, ${rating.ratedAt}, ${rating.ratedAt}
        )
        ON CONFLICT(user_id, entity_id) DO UPDATE SET
          score_tenths = excluded.score_tenths,
          comment = excluded.comment,
          commented_at = excluded.commented_at,
          rated_at = excluded.rated_at,
          updated_at = excluded.updated_at;
      `,
      sql`
        INSERT OR IGNORE INTO rating_events (
          id, rating_id, user_id, entity_id, score_tenths, comment,
          commented_at, rated_at, event_type
        ) VALUES (
          ${stableId("event", rating.id)}, ${rating.id}, ${IMPORT_USER.id},
          ${rating.entityId}, ${rating.scoreTenths}, ${rating.comment},
          ${rating.commentedAt}, ${rating.ratedAt}, 'imported'
        );
      `,
      sourceRecordSql({
        id: stableId("source", `rating:${rating.sourcePage.notionId}`),
        recordType: "rating",
        recordId: rating.id,
        page: rating.sourcePage,
        sourceIdSuffix: "rating",
        batchId: plan.batchId,
        verificationStatus: verificationStatusForPage(plan, rating.sourcePage),
        sourceRootPath,
      }),
    );
  }

  for (const conflict of plan.conflicts) {
    const id = stableId(
      "conflict",
      `${conflict.type}:${conflict.sourceIds.join(":")}`,
    );
    statements.push(sql`
      INSERT INTO import_conflicts (
        id, import_batch_id, conflict_type, source_record_id,
        candidate_record_id, details_json, status
      ) VALUES (
        ${id}, ${plan.batchId}, ${conflict.type},
        ${conflict.sourceIds[0] ?? null}, ${conflict.sourceIds[1] ?? null},
        ${JSON.stringify(conflict)}, 'open'
      )
      ON CONFLICT(id) DO UPDATE SET
        details_json = excluded.details_json;
    `);
  }

  const summary = summaryData(plan);
  statements.push(sql`
    UPDATE import_batches SET
      status = 'completed',
      completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
      summary_json = ${JSON.stringify(summary)}
    WHERE id = ${plan.batchId};
  `);

  return `${statements.map(compactSql).join("\n\n")}\n`;
}

function sourceRecordSql(input: {
  id: string;
  recordType: "entity" | "relation" | "rating";
  recordId: string;
  page: NotionPage;
  sourceIdSuffix?: string;
  batchId: string;
  verificationStatus: VerificationStatus;
  sourceRootPath: string;
}): string {
  const sourceId = input.sourceIdSuffix
    ? `${input.page.notionId}#${input.sourceIdSuffix}`
    : input.page.notionId;
  return sql`
    INSERT INTO source_records (
      id, record_type, record_id, source, source_id, external_id,
      source_path, source_url, checksum, verification_status,
      import_batch_id, source_updated_at, raw_json
    ) VALUES (
      ${input.id}, ${input.recordType}, ${input.recordId}, 'local-notion',
      ${sourceId}, ${input.page.inonId ?? null},
      ${path.join(input.sourceRootPath, input.page.relativePath)},
      ${input.page.resource ?? null}, ${input.page.checksum},
      ${input.verificationStatus}, ${input.batchId},
      ${input.page.lastEditedTime ?? null},
      ${JSON.stringify({
        frontmatter: input.page.raw,
        body: input.page.body,
      })}
    )
    ON CONFLICT(source, source_id, record_type) DO UPDATE SET
      record_id = excluded.record_id,
      external_id = excluded.external_id,
      source_path = excluded.source_path,
      source_url = excluded.source_url,
      checksum = excluded.checksum,
      verification_status = excluded.verification_status,
      import_batch_id = excluded.import_batch_id,
      source_updated_at = excluded.source_updated_at,
      imported_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
      raw_json = excluded.raw_json;
  `;
}

function renderReport(plan: ImportPlan, sourceRootPath: string): string {
  const summary = summaryData(plan);
  const databaseRows = (Object.keys(plan.pages) as CloudDatabaseKind[]).map(
    (kind) => {
      const cloud = plan.cloudManifest.databases[kind];
      const local = plan.pages[kind].length;
      const result = cloud.count === local ? "一致" : "不一致";
      return `| ${kind} | ${local} | ${cloud.count} | ${cloud.idVerification} | ${result} |`;
    },
  );
  const conflicts =
    plan.conflicts.length === 0
      ? "- 无。"
      : plan.conflicts
          .map(
            (conflict) =>
              `- **${conflict.type}**：${conflict.message}（${conflict.sourceIds.join(", ")}）`,
          )
          .join("\n");
  const verificationNotes =
    plan.cloudManifest.limitations.length === 0
      ? `- 四个来源数据库均已完成数量、唯一性和完整页面 ID 集合对照。
- 本批次的实体、关系和评分来源记录均可标记为 \`verified\`。`
      : `${plan.cloudManifest.limitations.map((item) => `- ${item}`).join("\n")}

仅完整通过云端 ID 对照的数据源会标记为 \`verified\`；其余来源保持
\`pending\`，不会把数量一致误报成完整核验。`;

  return `# Treez Notion 导入 Dry-run

生成时间：${plan.generatedAt}

批次：\`${plan.batchId}\`

## 来源

- 本地：\`${sourceRootPath}\`
- 云端 Workspace：${plan.cloudManifest.workspace.name}（\`${plan.cloudManifest.workspace.id}\`）
- 云端核验时间：${plan.cloudManifest.verifiedAt}
- 写入目标：Cloudflare D1 \`treez-production\`

## 交叉验证

| 类型 | 本地 | 云端 | 云端 ID 核验 | 数量 |
| --- | ---: | ---: | --- | --- |
${databaseRows.join("\n")}

## 计划写入

- 公共实体：${summary.entities}（专辑 ${summary.byKind.album}、艺术家 ${summary.byKind.artist}、单曲 ${summary.byKind.song}）
- 关系：${summary.relations}
- 当前评分：${summary.ratings}
- 封面来源：${summary.covers}
- 来源记录：${summary.sourceRecords}
- 冲突/人工复核项：${summary.conflicts}

## 冲突与孤立记录

${conflicts}

同名条目不会自动合并。它们以 Notion 页面 ID 保持独立，并保留创作者关系供
后续判断；本轮没有社区合并机制。

## 核验状态

${verificationNotes}

## 幂等策略

- 实体、关系、评分、评分事件、资产和来源记录均使用稳定 ID。
- 同一用户/实体评分使用 upsert；同一输入重跑不会增加当前评分。
- 来源以 \`source + source_id + record_type\` 唯一。
- 同一快照产生固定批次 ID：\`${plan.batchId}\`。
- 封面先保留原 URL 和内容摘要 key；Supabase Storage 回填时以相同摘要下载去重。

## 应用前检查

1. 数量不一致时禁止应用。
2. 先查看本报告及 \`dry-run.json\` 的全部冲突。
3. 应用 \`apply.sql\` 后核对实体、关系、评分、孤立外键和批次摘要。
4. 使用相同输入重跑并确认所有业务总数不增长。
`;
}

function verificationStatusForPage(
  plan: ImportPlan,
  page: NotionPage,
): VerificationStatus {
  const kind = (
    Object.keys(plan.cloudManifest.databases) as CloudDatabaseKind[]
  ).find(
    (candidate) =>
      plan.cloudManifest.databases[candidate].pageId === page.parentId,
  );

  return kind &&
    plan.cloudManifest.databases[kind].idVerification === "complete"
    ? "verified"
    : "pending";
}

function summaryData(plan: ImportPlan) {
  const byKind = {
    album: plan.entities.filter((entity) => entity.kind === "album").length,
    artist: plan.entities.filter((entity) => entity.kind === "artist").length,
    song: plan.entities.filter((entity) => entity.kind === "song").length,
  };
  return {
    entities: plan.entities.length,
    byKind,
    relations: plan.relations.length,
    ratings: plan.ratings.length,
    covers: plan.entities.filter((entity) => entity.coverUrl).length,
    sourceRecords:
      plan.entities.length + plan.relations.length + plan.ratings.length,
    conflicts: plan.conflicts.length,
  };
}

function toSerializablePlan(plan: ImportPlan) {
  return {
    generatedAt: plan.generatedAt,
    batchId: plan.batchId,
    cloudManifest: plan.cloudManifest,
    summary: summaryData(plan),
    records: {
      entities: plan.entities.map((entity) => ({
        id: entity.id,
        kind: entity.kind,
        title: entity.page.title,
        notionId: entity.page.notionId,
        sourcePath: entity.page.relativePath,
        releaseDate: entity.releaseDate,
        metadata: entity.metadata,
        coverUrl: entity.coverUrl,
      })),
      relations: plan.relations.map((relation) => ({
        id: relation.id,
        fromId: relation.fromId,
        toId: relation.toId,
        type: relation.type,
        position: relation.position,
        sourcePage: relation.sourcePage.notionId,
      })),
      ratings: plan.ratings.map((rating) => ({
        id: rating.id,
        entityId: rating.entityId,
        scoreTenths: rating.scoreTenths,
        comment: rating.comment,
        commentedAt: rating.commentedAt,
        ratedAt: rating.ratedAt,
        sourcePage: rating.sourcePage.notionId,
      })),
    },
    conflicts: plan.conflicts,
  };
}

function renderConsoleSummary(plan: ImportPlan, output: string): string {
  const summary = summaryData(plan);
  return [
    "Treez Notion dry-run complete.",
    `Entities: ${summary.entities}`,
    `Relations: ${summary.relations}`,
    `Ratings: ${summary.ratings}`,
    `Covers: ${summary.covers}`,
    `Conflicts: ${summary.conflicts}`,
    `Artifacts: ${output}`,
  ].join("\n");
}

function cleanBody(body: string, title: string): string {
  const lines = body.trim().split("\n");
  const heading = `# ${title}`.trim();
  if (lines[0]?.trim() === heading) lines.shift();
  while (lines[0]?.trim() === "") lines.shift();
  if (lines[0]?.trim() === "Untitled") lines.shift();
  return lines.join("\n").trim();
}

function dateTime(value: unknown): string | undefined {
  const text = nullableString(value);
  if (!text) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T12:00:00.000Z`;
  const date = new Date(text);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

function relationIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return typeof value === "string" && value ? [value] : [];
}

function firstString(value: unknown): string | null {
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string");
    return typeof first === "string" ? first : null;
  }
  return nullableString(value);
}

function nullableString(value: unknown): string | null {
  const result = stringValue(value)?.trim();
  return result ? result : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMetadataKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/\s+/g, "_")
    .toLocaleLowerCase();
}

function entityId(notionId: string): string {
  return `ent_${notionId.replaceAll("-", "")}`;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${checksum(value).slice(0, 32)}`;
}

function checksum(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  return [...new Map(values.map((value) => [key(value), value])).values()];
}

function groupBy<T>(values: T[], key: (value: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const groupKey = key(value);
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), value]);
  }
  return groups;
}

function compactSql(statement: string): string {
  return statement
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function sql(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce(
    (result, chunk, index) =>
      `${result}${chunk}${index < values.length ? sqlValue(values[index]) : ""}`,
    "",
  );
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid SQL number.");
    return String(value);
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}
