# Treez 生产评分写入前置快照

时间：2026-07-26 17:03:42 +08  
查询：Cloudflare D1 `treez-production` 远端只读查询  
写入：0 行

## 目标

在用户明确确认后，用现有 iNon SSO 身份更新《Hibernation》的既有评分，
验证“评分更新而非重复创建”的完整生产闭环。

## 写入前基线

| 字段 | 值 |
| --- | --- |
| entity | `ent_20fa90d90b978113909ec82f4a03c38f` / Hibernation |
| profile | `8pqFCzEJpyYdXWAObnzmq8337FIVrzmZ` |
| slug / display name | `yingyingdontkill` / 小缨缨 |
| rating | `rating_31a3230a89b7c0690e4d92cb4422fb1e` |
| score | 75 tenths / 7.5 |
| commentedAt | `2025-04-24T12:00:00.000Z` |
| ratedAt | `2025-12-28T16:07:00.000Z` |
| rating events | 1 |
| aggregate | 1 人 / 7.5 |

## 用户确认后应保持或变化的字段

- 保持：entity、profile、rating ID、7.5 分、现有评论、`commentedAt`、聚合
  1 人 / 7.5、display name“小缨缨”。
- 变化：`ratedAt` 更新为 Worker 接收本次请求的服务端时间；该 rating 的
  `rating_events` 从 1 增至 2，新增事件类型为 `updated`。
- 禁止：新增第二条当前评分、由客户端指定 `ratedAt`、覆盖 profile 显示名、
  改变聚合人数或产生 Worker/Vercel 运行错误。

本快照不构成写入授权；只有用户明确回复“确认提交”后才能执行公开更新。

