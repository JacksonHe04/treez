# Treez 隔离写入闭环验收

日期：2026-07-26

## 范围

在 Wrangler 本地 D1 中验证完整签名写入路径，不向生产环境写入测试数据：

1. 创建音乐的艺术家、专辑、单曲。
2. 创建影视的导演与作品。
3. 创建书籍的作者与作品。
4. 创建游戏的工作室与作品。
5. 建立作品到创作者、单曲到专辑的关系。
6. 对九种实体分别评分、评论、设置评论日期与标签。
7. 再次评分并核对当前记录 upsert、聚合分、`ratedAt` 和公开档案。

## 可重复命令

终端一：

```bash
pnpm run db:migrate:local
pnpm exec wrangler dev --local --port 8791 \
  --var WRITE_SIGNING_SECRET:treez-local-closure-secret \
  --var SUPABASE_SECRET_KEY:local-unused-secret
```

终端二：

```bash
pnpm run verify:write:local
```

`scripts/verify-write-closure.ts` 强制只接受 loopback API URL，避免误写生产。
每次运行使用独立用户和名称后缀，可在持久化本地 D1 中幂等重复验收。

## 结果

```json
{
  "status": "LOCAL_WRITE_CLOSURE_OK",
  "totals": {
    "music": 3,
    "film": 2,
    "book": 2,
    "game": 2
  },
  "profileRatings": 9,
  "albumAggregate": {
    "ratingCount": 1,
    "averageScore": 7.5
  },
  "tagNames": ["🌲", "🎵", "Heritage Green"]
}
```

全部断言通过：

- 九种实体均可创建、公开读取和评分。
- 四个领域均进入个人公开档案。
- 同一用户再次评分仍只有一条当前记录。
- 更新后聚合为 1 人、7.5 分，`ratedAt` 发生变化。
- 用户指定的评论日期保持为 `2026-07-21`。
- 纯 Emoji 与文本标签保持三个独立身份。
- `created_by` 与 `track_of` 关系方向正确。
- 既有档案再次写入时保留其导入展示名，不被 SSO 账号名覆盖。

生产 D1 在验收后仍为 451 个实体、222 条当前评分，无测试数据增长。
