# Hot Video · 爆款短视频导航站

> 将抖音收藏的高赞短视频，整理成一个 **SEO 搜索/导航入口 + 爆款视频浏览 + 原视频跳转** 的网站。不托管、不在线播放、不下载原视频。

基于 **Astro + Cloudflare Pages (D1)** 构建（PRD：JSON → Worker → D1 → Cache → CDN）。

## ✨ 页面

- `/` 首页：当前热门，按点赞降序
- `/20w` `/50w` `/100w` `/500w` `/1000w`：按点赞档位聚合（SEO 核心页）
- `/today` `/week`：按发布时间聚合
- `/2026` `/2026/08`：按年 / 年月聚合（动态路由）
- `/video/[id]`：单视频详情页（相关推荐 + 查看原视频）
- `/admin`：后台（数据统计 + JSON 导入）
- `/sitemap.xml` `/video-sitemap.xml` `/robots.txt`：SEO

## 🛠 技术栈

| 技术 | 用途 |
| --- | --- |
| Astro | 站点框架（SSR / on-demand） |
| @astrojs/cloudflare | Cloudflare Pages 适配器 + D1 绑定 |
| Cloudflare D1 | 线上数据库（视频数据、排序、筛选） |
| TypeScript | 类型支持 |
| JSON | 数据交换格式（Electron → 服务端） |

## 📁 结构

```
src
├── pages
│   ├── index.astro              # 首页
│   ├── [tier].astro             # /20w /50w /100w /500w /1000w
│   ├── today.astro / week.astro # 时间聚合
│   ├── year/[year].astro        # /2026
│   ├── year/[year]/[month].astro# /2026/08
│   ├── video/[id].astro         # 详情页
│   ├── admin/index.astro        # 后台
│   ├── admin/import.ts          # JSON 导入接口
│   ├── sitemap.xml.ts / video-sitemap.xml.ts / robots.txt.ts
├── components/VideoCard.astro   # 视频卡片
├── layouts/Layout.astro         # 布局 + SEO(canonical/OG)
├── lib/videos.ts                # D1 查询 + 本地 JSON 回退
├── data/videos.json             # 本地预览示例数据
migrations/0000_init.sql         # D1 表结构 + 索引
```

## 🚀 本地开发

```bash
pnpm install
pnpm dev          # http://localhost:4321 （无 D1 时自动回退 videos.json）
```

## ☁️ 部署到 Cloudflare Pages

```bash
npx wrangler d1 create hot-video          # 创建 D1，把 database_id 填入 wrangler.toml
npx wrangler d1 execute hot-video --remote --file=./migrations/0000_init.sql
node scripts/seed.mjs                     # 可选：导入示例数据到本地 D1
pnpm deploy:prod                         # 构建并部署到生产分支
```

部署配置见 [wrangler.toml](./wrangler.toml)，Pages 项目名 `hot-video`。
