# Treez 技术栈与依赖职责审计

日期：2026-07-26

## 结论

- 生产界面使用仓库内的最新 shadcn/ui 组件源码，不使用 Ant Design。
- `shadcn` 4.15.0 与 npm registry 当前 `latest` 一致；它是生成、检查组件源码
  的开发期 CLI，因此归入 `devDependencies`，不进入生产运行依赖。
- `dependencies` 中的每个直接依赖均承担明确的运行职责；没有仅为“看起来像技术
  栈”而保留的占位包。
- `react-dom` 由 Next.js 渲染运行时消费，不要求业务源码直接 import。

## 运行依赖职责

| 依赖 | Treez 中的职责 |
| --- | --- |
| `next`、`react`、`react-dom` | App Router 页面、Route Handler、服务端与客户端渲染 |
| `@inon-ai/inon-sso` | iNon SSO 登录、回调、会话与用户身份 |
| `hono`、`@hono/zod-validator` | Cloudflare Worker API 与请求校验 |
| `@supabase/supabase-js` | Worker 将封面写入 iNon 项目的 Supabase Storage |
| `zod` | Worker 和应用写入边界的统一 schema |
| `@reduxjs/toolkit`、`react-redux` | 十分制/五星制显示偏好的全站统一状态 |
| `radix-ui` | shadcn 交互组件的无障碍 primitives |
| `class-variance-authority` | Button、Badge 等组件变体 |
| `clsx`、`tailwind-merge` | 全站 `cn()` class 合并 |
| `lucide-react` | 导航、搜索、评分、反馈等一致图标 |
| `next-themes` | 固定 Heritage 浅色主题上下文，并让 Sonner 与全站主题保持一致 |
| `sonner` | 新增、评分和错误反馈 toast |
| `dayjs` | 用户可读日期及年月筛选 |
| `tw-animate-css` | shadcn 组件动画 utilities |
| `yaml` | 本地 Notion Markdown frontmatter 导入 |

## 开发依赖职责

`typescript`、`tsx`、ESLint 相关包、Prettier、Tailwind/PostCSS、Wrangler 和类型
包分别承担类型检查、导入脚本执行、代码质量、格式化、样式构建、Cloudflare
开发部署和类型声明。`shadcn` 只在开发期生成与检查已提交的 UI 源码。

## 验证

- `pnpm view shadcn version`：`4.15.0`
- `pnpm exec shadcn --version`：`4.15.0`
- 仓库搜索不存在 `antd` 或 `@ant-design/*` import。
- 根布局由 `ThemeProvider` 明确固定为浅色，系统深色偏好不会让 toast 与
  Heritage 页面产生视觉割裂。
- `pnpm run lint`、`pnpm run check`、`pnpm run build` 用于最终验收。
