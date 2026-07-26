# Treez

Treez（树脂）是一份公开的个人鉴赏档案，覆盖音乐、影视、书籍和游戏。用户通过
iNon SSO 登录后，可以新增公共条目，并以十分制或五星半星制留下评分、评论日期
与标签；未登录用户可以浏览全部条目、聚合分、评论和个人公开档案。

产品与实现边界以根目录 [AGENTS.md](./AGENTS.md) 为准。

## 架构

- Next.js 16 App Router、React 19、TypeScript
- 最新 shadcn/ui（Radix）与 Treez Heritage 设计系统
- Cloudflare Worker + Hono 公共 API
- Cloudflare D1 业务数据
- Supabase iNon 项目的 `treez-assets` 图床
- Vercel 承载 `treez.inon.space`
- iNon SSO 负责登录；Next.js 校验会话后签名调用 Worker 写接口

## 本地运行

```bash
pnpm install
pnpm run db:migrate:local
pnpm run dev:worker
pnpm run dev
```

复制 `.env.example` 为 `.env.local`，并复制 `.dev.vars.example` 为
`.dev.vars`，分别填入 Next.js 与 Worker 本地密钥。密钥不得提交。

## 数据导入

本地 Notion 默认来源：

```text
/Users/jackson/iNon/WiKi/notion/All About Myself/Dimensions/Hobbies/Music/Albums & Artists
```

先生成 dry-run、审计 JSON 与幂等 SQL：

```bash
pnpm run import:notion:dry-run
```

输出位于 `.agents/docs/260726/import/`。生产应用前必须核对报告、冲突和四库
数量；Notion 默认只读，首次导入后 D1 是业务真源。

## 验证

```bash
pnpm run lint
pnpm run check
pnpm run build
pnpm run build:worker
```

所有设计、计划、迁移、导入与验收记录保存在 `.agents/docs/YYMMDD/`。
