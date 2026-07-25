# Treez 接入 iNon SSO

日期：2026-07-26

## 目标

Treez 使用与 iNon、SAYLESS、Leaf、PINE 相同的中央账号体系。用户在任意 iNon 项目完成注册后，可以直接进入 Treez；首次进入时自动成为 Treez 普通成员，无需重复注册。

中央登录与账户管理统一位于 `https://inon.space`。Treez 不维护独立用户表、密码或第三方登录配置。

## 登录能力

中央 SSO 提供：

- 邮箱验证码注册；
- 邮箱验证码登录；
- 邮箱密码登录；
- 用户名密码登录；
- GitHub OAuth 登录；
- 邮箱、用户名和密码的后续绑定与维护。

Treez 只接收中央签发的项目身份，并在自己的域名下保存加密 HttpOnly 项目会话 Cookie。

## 项目接入

Treez 使用 `@inon-ai/inon-sso@0.1.0`，项目标识为 `treez`。

| 路径 | 作用 |
| --- | --- |
| `/api/auth/inon/login` | 发起中央 OAuth Code + PKCE 登录 |
| `/api/auth/inon/callback` | 校验回调并建立 Treez 项目会话 |
| `/api/auth/inon/refresh` | 刷新中央令牌与项目会话 |
| `/api/auth/inon/logout` | 撤销刷新令牌并清理 Treez Cookie |
| `/api/auth/inon/session` | SDK 原生会话查询 |
| `/api/auth/me` | 前端所需的最小用户视图 |
| `/basic/login`、`/basic/signup` | 兼容旧入口并跳往中央登录页 |

`/user/*` 同时由 `proxy.ts` 做 Cookie 级乐观保护，并由 `app/user/layout.tsx` 在页面边界再次要求有效用户会话。项目角色来自中央 SSO 的 `projectRole`；当前 Treez 尚无管理员后台，但会话和 `/api/auth/me` 已统一提供 `isAdmin`。

## 环境变量

Vercel 生产环境需要：

```text
INON_SSO_CLIENT_ID
INON_SSO_CLIENT_SECRET
INON_SSO_SESSION_SECRET
INON_SSO_PUBLIC_ORIGIN=https://treez.inon.space
```

密钥只写入 Vercel 项目环境和中央客户端注册表，不提交到 Git。仓库只保留空值 `.env.example`。

## 验收重点

1. 未登录访问 `/user/me` 会跳到项目登录入口；
2. 项目登录入口返回 303 到 `inon.space`；
3. OAuth 回调固定为 `https://treez.inon.space/api/auth/inon/callback`；
4. `/api/auth/me` 不缓存，未登录返回 `{ "user": null }`；
5. 登录后导航显示中央用户名或邮箱；
6. 退出登录通过项目 SDK 撤销中央刷新令牌并清理本地会话；
7. 个人中心显示中央邮箱、用户名与 Treez 项目身份，并链接到中央账户页。

## 生产部署记录

- Vercel 项目：`yingyingdontkill/treez`
- Vercel Project ID：`prj_6k4NZxQ32rJhtpHaZo8jYt0J7AXV`
- 生产部署：`dpl_4mZGD2CKBASXVnEUCLC92iUQfZgM`
- 部署状态：READY
- 已添加项目域名：`treez.inon.space`
- 健康检查：200
- 未登录 `/api/auth/me`：200，`Cache-Control: private, no-store`
- 登录入口：303 到 `inon.space`，回调为 `https://treez.inon.space/api/auth/inon/callback`
- 未登录 `/user/me`：307 到项目登录入口

`inon.space` 的 DNS 托管在阿里云。Vercel 已接受域名，但生产启用仍需在阿里云 DNS 添加：

```text
记录类型：A
主机记录：treez
记录值：76.76.21.21
```
