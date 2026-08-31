# creator-nav — 多站点 Monorepo

本仓库是 pnpm workspace monorepo，包含多个独立部署的站点与共享包。

## 结构

- `apps/hot-video/` — 爆款短视频导航站（Astro + Cloudflare Pages + D1 `VIDEO_DB`）
- `apps/dating-nav/` — 相亲信息导航站（Astro + Cloudflare Pages + D1 `DATING_DB`）
- `packages/ui/` — 共享 UI 包 `@creator-nav/ui`（Layout / Nav / Footer / 全局 CSS / SEO 工具）
- `packages/db-source/` — 数据源连接器 `@creator-nav/db-source`（TypeORM + better-sqlite3 直读红绳库，同步导入 D1）

各站独立 Cloudflare Pages 项目、独立 D1 数据库，互不共享数据。

## 通用开发约定

启动 dev server（任一 app）：

```
pnpm --filter hot-video dev
pnpm --filter dating-nav dev
```

构建全部站点：

```
pnpm -r build
```

部署单站：

```
pnpm deploy:hot      # = pnpm --filter hot-video deploy:prod
pnpm deploy:dating   # = pnpm --filter dating-nav deploy:prod
```

## 共享包 @creator-nav/ui

- 站点通过 `"@creator-nav/ui": "workspace:*"` 引用。
- 导出 `.astro` 组件、`.css` 主题文件、`.ts` 工具（见 `packages/ui/package.json` 的 `exports`）。
- 主题通过 `<html data-theme="hot|dating">` 切换，颜色变量在 `packages/ui/src/styles/tokens-*.css`。
- Astro 7 + `@astrojs/cloudflare` 已废弃 `Astro.locals.runtime.env`，D1 绑定统一通过
  `import('cloudflare:workers')` 后在 `env.<BINDING>` 读取（见 `packages/ui/src/lib/d1.ts`）。

## D1 数据导入

两站均不提供公网导入后台。

### 主管道：红绳直连同步（@creator-nav/db-source）

数据源为红绳项目（`D:\project\redstring`，Electron + TypeORM + better-sqlite3）的本地库
`%APPDATA%/redstring-desktop/redstring.db`，全程**只读**打开（WAL 并发读安全）：

- dating-nav：红绳 `user_profiles`（画像表）→ `dating_profiles`；已入选画像的作品
  `user_posts` → `dating_posts`（profile_id 由 SQL 内标量子查询解析）
- hot-video：红绳 `user_posts` LEFT JOIN `videos`（封面）→ `videos`

```
pnpm sync:redstring                 # 两站：读库 → 筛选 → 生成幂等 import.sql → wrangler --remote 导入
pnpm sync:dating --dry-run          # 只读统计，不写文件不导入
pnpm sync:hot --skip-import         # 只生成 apps/hot-video/import.sql
pnpm sync:redstring --site dating --gender 女 --min-intent-score 70 --limit 100
pnpm sync:hot --min-likes 500 --local   # 导入本地 D1 而非远程
pnpm sync:hot --min-collects 10000 --skip-import   # 只生成收藏数≥1万的 hot-video SQL
pnpm sync:hot:collects                  # 同步收藏数≥1万的视频到 hot-video
pnpm publish:hot:collects               # 同步收藏数≥1万视频并部署 hot-video
```

其他参数：`--db <path>` 指定红绳库路径、`--region <关键词>` 地区模糊匹配。时间戳
统一毫秒→秒。筛选后为 0 行时跳过该站（不写文件、不导入）。hot 另支持
`--min-likes`（点赞数下限）与 `--min-collects`（收藏数下限）。

### 备用路径：手动 JSON 导入

`apps/*/scripts/json-to-sql.ts`（读 `src/data/*.json`）保留为手动导入备用路径，
流程：本地 JSON → `db:convert` 生成 `import.sql` → `db:import:remote`。重复导入
统一使用 `ON CONFLICT ... DO UPDATE` 幂等。

## 文档

Astro 官方文档：https://docs.astro.build

常用指南：

- [路由 / 动态路由 / middleware](https://docs.astro.build/en/guides/routing/)
- [Astro 组件](https://docs.astro.build/en/basics/astro-components/)
- [样式 / Tailwind](https://docs.astro.build/en/guides/styling/)
