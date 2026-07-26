# Treez 生产验收报告

日期：2026-07-26

## 用户故事

访客从 `treez.inon.space` 浏览四领域公共条目，经 Vercel Next.js 页面和 Route Handler 访问 Cloudflare Worker/D1；登录用户再通过 iNon SSO，以服务端 HMAC 签名新增公共条目并留下公开评分、评论、日期与标签。

## 生产资源

- Web：`https://treez.inon.space`
- Vercel deployment：`dpl_GTzYa1jTjYQwAAPoi6xbopVFHJtg`
- Worker：`https://treez-api-production.yingyingdontkill.workers.dev`
- Worker version：`53e35f5e-a0ea-4c32-b7ab-55447c9c3adb`
- D1：`treez-production`
- D1 ID：`442b52ad-bfb9-46de-8753-2cc09086ee4d`
- R2：账户尚未启用；Dashboard 要求接受按量付费自动续订条款。

## 验收结果

| 边界 | 状态 | 证据 |
| --- | --- | --- |
| Production build | 通过 | Next.js 16.2.9 构建、TypeScript、19 个 App Router 路由成功 |
| 技术栈职责 | 通过 | 无 Ant Design；shadcn 4.15.0 为当前 latest，运行依赖均有明确职责 |
| Worker | 通过 | 健康检查 `status=ok`；profile by-id 返回 222 条评分 |
| Notion 交叉验证 | 通过 | 四库 472 个页面的云端/本地 ID 集合完整一致，无缺失或重复 |
| D1 数据 | 通过 | 451 实体、546 关系、222 评分、61 资产、1219 个已核验来源记录 |
| 导入幂等性 | 通过 | 本地连续应用两次、生产重新应用后业务总数均不增长；外键检查为空 |
| 匿名公共读 | 通过 | 首页、音乐目录、搜索、实体详情、个人档案均返回真实导入数据 |
| 搜索代理 | 通过 | `/api/treez/search?q=Radiohead` 返回 HTTP 200 与 1 条结果 |
| 匿名写保护 | 通过 | POST `/api/treez/entities` 返回 HTTP 401，不产生数据 |
| SSO 入口 | 通过 | `/sso/start` 返回 303 至 `inon.space/api/sso/auth/oauth2/authorize` |
| 十分制/五星制 | 通过 | 同一页面评分从 `10.0 / 10` 一致切换为 `5.0 / 5` |
| 移动端 | 通过 | 390×844 无横向溢出，完整导航、首页与卡片流可见 |
| 浏览器错误 | 通过 | 无 Next error overlay、无 page error、无 console error |
| Vercel 运行日志 | 通过 | 发布后 30 分钟内无 error 级日志 |
| 登录后真实写入 | 待验收 | 不使用虚构数据污染生产库；需要登录用户用真实条目完成一次写入 |
| R2 封面归档 | 阻塞 | 首次启用需要接受 Cloudflare 计费订阅条款 |

## 视觉证据

- `verification/production-home-desktop.png`
- `verification/production-home-mobile.png`

## 已知数据事项

- 导入器保留 2 个同名单曲冲突候选，不做无证据自动合并。
- 影视、书、游戏暂无 Notion 结构化初始数据，产品新增路径与空状态已经完整实现。
- R2 启用前，封面使用原始来源 URL；无有效 URL 时使用一致的 Heritage 占位封面。

## 回滚

- Vercel：从 deployment `dpl_GTzYa1jTjYQwAAPoi6xbopVFHJtg` 回滚至前一生产部署。
- Worker：在 Cloudflare Versions 中将上一版本恢复为 100% 流量。
- D1：迁移只追加；数据恢复使用导入前导出或重新运行幂等导入器。
- 密钥：Vercel `TREEZ_API_SECRET` 与 Worker `WRITE_SIGNING_SECRET` 必须成对轮换。
