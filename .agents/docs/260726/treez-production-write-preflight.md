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

## 执行与闭环验证

用户于 2026-07-26 明确授权执行并在验收后恢复。内置浏览器通过 iNon SSO
自动回跳，使用表单中的既有 7.5 分、原评论、2025-04-24 和空标签提交更新。

写入后证据：

- 页面 toast：`鉴赏记录已更新`。
- rating ID 保持不变，当前评分数仍为 1。
- `ratedAt`：`2026-07-26T09:06:15.811Z`，由 Worker 写入。
- 新事件：`722c9e6e-33b7-464c-9e1d-67a102572bb7` / `updated`。
- 聚合：1 人 / 7.5；profile display name：小缨缨。
- 登录首页：222 条，最新记录 Hibernation。
- 公开档案：2025.04.24、7.5 和原评论均可见。
- Vercel 运行错误：0。

## 精确恢复结果

验收完成后恢复 rating 的 `commentedAt`、`ratedAt`、`updatedAt`，恢复 profile
完整基线时间戳，并只删除本次 `updated` 事件。恢复后再次远端查询：

- rating 与 profile 字段和本文件的写入前基线完全一致。
- rating tags 为空；仅保留原
  `event_b04679cec0c0909c420dfa71a251b128` / `imported` 事件。
- 聚合仍为 1 人 / 7.5。
- 全库为 451 实体、546 关系、222 评分、222 事件、0 个开放冲突。
- `PRAGMA foreign_key_check` 为空。
- 生产公开页、登录首页、Web/Worker 健康检查和 Vercel 日志均正常。

本次验收最终没有留下净业务数据变化。
