# Treez Supabase 图床迁移记录

日期：2026-07-26

## 目标与资源

- 以 Supabase iNon 项目的 Storage/S3 取代未启用的 Cloudflare R2。
- Supabase project ref：`cbesquswcuvzipzldimc`。
- bucket：`treez-assets`，公开读取，10 MB 上限，仅允许 `image/*`。
- 写入只能经过签名 Treez Worker；服务端密钥保存在 Cloudflare Secret
  `SUPABASE_SECRET_KEY`，不进入浏览器、D1 或仓库。

## 实施

1. 安装并实际使用 `@supabase/supabase-js@2.110.8`。
2. 新增 `0004_asset_object_key.sql`，将历史字段 `r2_key` 无损重命名为
   `object_key`，并重建索引。
3. Worker 对图片大小和 MIME type 校验后，以 SHA-256 内容摘要作为对象 key。
4. 公开 API 对已归档封面返回 Supabase public object URL；未归档时回退原 URL。
5. 回填脚本保持幂等，只处理 `content_type` 或 `byte_size` 尚未完成的记录。

## 来源恢复

- 11 张原始 HTTP 图片可直接下载。
- 40 张豆瓣封面使用 Notion 中保存的原 URL，并补齐浏览器 User-Agent 与
  Douban Referer 后下载。
- 10 张本地导出只保留文件名的附件，通过 Notion Plugin 逐页核对
  attachment、block 与 space 身份，生成一次性 Notion 图片代理 URL。
- 一次性 URL 只进入回填进程，不写入仓库或 D1。

## 生产验证

- D1：61 条资产全部有 `object_key`、`content_type` 和 `byte_size`。
- D1：61 个唯一对象，总字节数 `3,000,718`，外键检查为空。
- Supabase `storage.objects`：61 个对象，61 个均为图片，总字节数一致。
- MIME：49 个 `image/jpeg`，12 个 `image/webp`。
- 回填脚本最终 dry-run：`candidates=0`。
- Worker health：`status=ok`。
- 条目详情返回 `treez-assets` 公共 URL；抽样图片 HTTP 200、类型为 JPEG。
- `treez.inon.space/music?kind=album` 的生产 HTML 已包含 Supabase 封面 URL。

## 部署与回滚

- Worker deployment：`2c02665c-15d9-4305-bb9a-9170c1f53299`。
- Worker version：`4facffc5-ec8d-4e8a-87ba-fed282d6f815`。
- 回滚代码时将上一 Worker version 恢复为 100% 流量。
- D1 迁移只追加；如需逻辑回滚，可继续读取 `object_key` 并保留已归档对象。
- 对象使用内容摘要 key，可安全幂等重传；不应为应用回滚删除 bucket。
