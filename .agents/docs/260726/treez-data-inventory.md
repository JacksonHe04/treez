# Treez 数据源盘点与交叉验证

日期：2026-07-26

## 结论

Treez 首次生产导入以音乐数据为主。本地 Notion 导出与当前连接的云端
Notion 在四个音乐数据库上的记录总数和全部 472 个源页面 ID 完全一致，
没有缺失或重复。影视、书籍、游戏在当前数据源中没有同等成熟、结构化的数据库，
因此首轮会导入真实音乐数据，同时让四个领域都具备完整的公共新增、关联、
评分和浏览能力。

Notion 只作为只读来源。首次导入完成后，Cloudflare D1 是 Treez 的业务真源。

## 已核验的云端工作区

- Workspace ID：`1593dd14-d688-4cb5-9aba-5d45b40ffecf`
- Workspace 名称：`缨缨的反杀从来不是错觉`
- 本地导出根目录：`/Users/jackson/iNon/WiKi`
- 音乐根目录：
  `/Users/jackson/iNon/WiKi/notion/All About Myself/Dimensions/Hobbies/Music`

## 音乐数据库

| 数据库 | 云端数据库页面 | 云端数据源 | 云端记录 | 本地数据记录 |
| --- | --- | --- | ---: | ---: |
| Album Database | `20fa90d9-0b97-8146-bbad-eeaae26248d7` | `collection://20fa90d9-0b97-810a-881c-000ba5794f51` | 98 | 98 |
| Artists Database | `20fa90d9-0b97-81c8-ad19-d067d7db6802` | `collection://20fa90d9-0b97-8118-a741-000b661a0454` | 117 | 117 |
| Songs Database | `21fa90d9-0b97-8077-af95-ee44f30ffd3d` | `collection://21fa90d9-0b97-809d-a536-000b7981a109` | 236 | 236 |
| Score Database | `21fa90d9-0b97-80ca-af32-f69de082c59f` | `collection://21fa90d9-0b97-80ea-81e9-000b4a47c91b` | 21 | 21 |

本地每个数据库另有一个 `index.md` 包装页，不计作业务记录。专辑目录存在嵌套
页面，因此统计必须递归进行，不能依赖固定深度。

## 源字段

### 专辑

- 标题：`Album Name`
- 关系：`Artists`、`Disc`
- 日期：`Release Date`、`Appreciation Date`
- 展示：`Cover`、`Genre`
- 评分：`Star`、`Score Database`
- 正文：专辑笔记、曲目鉴赏等长文本

本地非空字段覆盖：Release Date 97、Genre 97、Appreciation Date 92、
Artists 66、Cover 61、Star 59、Score Database 59、Disc 55。

### 艺术家

- 标题：`Artist Name`
- 关系：`Albums`、`Songs`
- 属性：`Birth`、`Country`、`Region`、`Form`、`Genre`、`Label`
- 个人记录：`Grade`、`Number`、`Score`

本地非空字段覆盖：Country 93、Songs 82、Region 66、Albums 55、Form 52、
Birth 36、Number 28、Grade 22、Label 17。

### 单曲

- 标题：`Song Name`
- 关系：`Album`、`Artist`
- 属性：`Track`
- 评分与记录：`Score`、`Score Database`、`Short Comment`
- 旧字段：`Liked`、`Playlists`

本地非空字段覆盖：Liked 236、Artist 212、Album 209、Track 163、
Score Database 163、Score 163、Short Comment 123、Playlists 66。

`Liked` 和 `Playlists` 不进入本轮产品模型，因为本轮明确不做喜欢、收藏或
播放列表。它们可保留在来源原始数据中，但不得变成假功能。

### 评分说明

- 标题：`Score`
- 关系：`Songs`、`Album`
- 内容：`Description`

共 21 条；Songs 关系 12、Album 关系 11、Description 9。该库承载部分作品
评分说明，应映射为导入用户的评分评论，而不是单独的公共作品。

## 统一映射

| 来源 | Treez 实体/记录 |
| --- | --- |
| Album Database | `entities(domain=music, kind=album)` |
| Artists Database | `entities(domain=music, kind=artist)` |
| Songs Database | `entities(domain=music, kind=song)` |
| Album ↔ Artists | `entity_relations(type=created_by)` |
| Song ↔ Artist | `entity_relations(type=created_by)` |
| Song ↔ Album | `entity_relations(type=track_of)` |
| Star / Score | `ratings.score_tenths` |
| Appreciation Date | `ratings.commented_at`，若无评论也保留为鉴赏日期 |
| Short Comment / Description / 正文鉴赏 | `ratings.comment` 或实体 `description` |
| Cover | `assets`，最终写入 Supabase Storage，并保留原始 URL |
| Genre / Country / Region 等 | `entity_metadata` 与可检索规范字段 |
| notion_id / 页面 ID | `source_records.source_id` |
| inon_id | `source_records.external_id` |

评分底层存为十分之一分，即 `score_tenths` 的 0–100 整数。这样可无损保存
Notion 的一位小数精度，同时界面可映射为十分制或五星半星制。

## 唯一性与冲突规则

1. 同一来源的页面 ID 是最强唯一键。
2. 跨来源先匹配相同 Notion 页面 ID。
3. 没有相同源 ID 时，使用规范化标题、实体类型、创作者关系、发布日期组合匹配。
4. 仅标题相同但创作者或日期冲突时不自动合并，写入 `import_conflicts`。
5. 关系两端不存在时不得静默丢弃，记为孤立关系。
6. 每次导入以 checksum 判断是否变化；未变化记录不重复写入。
7. 用户创建的公共条目与导入条目疑似重复时，只报告冲突，本轮不做社区合并。

## 交叉验证结果

- 云端与本地四库数量一致。
- 2026-07-26 08:08（Asia/Singapore）通过只读 Notion 连接重新获取四个数据源。
- 98 个专辑、117 个艺术家、236 个单曲和 21 个评分页面均已完成完整源 ID
  集合对照，共 472 个页面。
- 每个数据库的云端 ID 数、本地 ID 数和唯一 ID 数均相等；四库均无云端缺失、
  本地缺失或重复 ID。
- 本地额外的数据库 `index.md` 只是包装页，不计作业务记录。

## 导入验收指标

- 实体：专辑 98、艺术家 117、单曲 236，除非 dry-run 报告有明确去重合并。
- 评分说明来源记录：21。
- 每个导入实体都至少有一个 `source_records`。
- 无重复来源 ID，无悬空外键，无静默冲突。
- 报告必须列出读取数、创建数、更新数、未变化数、冲突数、失败数和孤立关系数。
- 重跑相同输入后，创建数应为 0，实体、关系、评分和标签总数不增长。

## 冲突处置

- `intro` 的三个页面在云端分别关联“疼痛部 / v是兔子wishtoday”、
  “Pax / Loro’s”和“Life After Small Town / 艾志恒Asen”，是三个不同作品，
  保留为独立公共条目。
- `Under Your Wings I'll Hide` 一条是带 Immanu El、专辑与评分的完整记录，
  另一条是稍后创建、仅关联播放列表的来源页。当前证据不足以安全合并；按照
  不做破坏性推断的规则保留两条，待未来有公共合并机制时再处理。
- 两组均已人工复核并在 D1 标记为 `ignored`；没有仍为 `open` 的导入冲突。
