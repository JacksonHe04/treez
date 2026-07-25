# Treez Notion 导入 Dry-run

生成时间：2026-07-25T23:10:47.507Z

批次：`import_65baa5d26c8d993e7d5cf30d`

## 来源

- 本地：`/Users/jackson/iNon/WiKi/notion/All About Myself/Dimensions/Hobbies/Music/Albums & Artists`
- 云端 Workspace：缨缨的反杀从来不是错觉（`1593dd14-d688-4cb5-9aba-5d45b40ffecf`）
- 云端核验时间：2026-07-26T00:00:00+08:00
- 写入目标：Cloudflare D1 `treez-production`

## 交叉验证

| 类型 | 本地 | 云端 | 云端 ID 核验 | 数量 |
| --- | ---: | ---: | --- | --- |
| album | 98 | 98 | complete | 一致 |
| artist | 117 | 117 | partial | 一致 |
| song | 236 | 236 | partial | 一致 |
| score | 21 | 21 | partial | 一致 |

## 计划写入

- 公共实体：451（专辑 98、艺术家 117、单曲 236）
- 关系：546
- 当前评分：222
- 封面来源：61
- 来源记录：1219
- 冲突/人工复核项：2

## 冲突与孤立记录

- **duplicate-candidate**：Multiple song:intro records share the same normalized title; creator relations must disambiguate them.（25ca90d9-0b97-80ae-9d35-e51b1dceb7c7, 233a90d9-0b97-8018-9c20-ee8a2386d7c0, 25fa90d9-0b97-801d-b8d9-d03a6936def9）
- **duplicate-candidate**：Multiple song:under your wings i ll hide records share the same normalized title; creator relations must disambiguate them.（234a90d9-0b97-806a-9a94-e55748972ad4, 2d7a90d9-0b97-80e4-af6a-d980cc426427）

同名条目不会自动合并。它们以 Notion 页面 ID 保持独立，并保留创作者关系供
后续判断；本轮没有社区合并机制。

## 核验限制

- Notion Plugin data-source query allowance was exhausted after live schema, count, album ID and subset verification.
- Artist, song and score source IDs must be rechecked on the next available live query before their verification status is promoted from pending to verified.

专辑的完整云端 ID 集合已核验，因此导入来源状态为 `verified`。艺术家、单曲
和评分在完成下一轮实时 ID 对照前保持 `pending`，即使本地与云端数量一致也
不会被错误标记为完整核验。

## 幂等策略

- 实体、关系、评分、评分事件、资产和来源记录均使用稳定 ID。
- 同一用户/实体评分使用 upsert；同一输入重跑不会增加当前评分。
- 来源以 `source + source_id + record_type` 唯一。
- 同一快照产生固定批次 ID：`import_65baa5d26c8d993e7d5cf30d`。
- 封面先保留原 URL 和内容摘要 key；R2 启用后以相同摘要下载去重。

## 应用前检查

1. 数量不一致时禁止应用。
2. 先查看本报告及 `dry-run.json` 的全部冲突。
3. 应用 `apply.sql` 后核对实体、关系、评分、孤立外键和批次摘要。
4. 使用相同输入重跑并确认所有业务总数不增长。
