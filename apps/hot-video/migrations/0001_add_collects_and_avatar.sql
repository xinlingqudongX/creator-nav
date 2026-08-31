-- 爆款视频 D1 增量：新增收藏数与作者头像列 + 收藏降序索引
-- 应用（远程）：npx wrangler d1 migrations apply hot-video --remote
-- 应用（本地）：npx wrangler d1 migrations apply hot-video --local
-- 说明：wrangler d1 migrations 通过 _cf_Migrations 表跟踪已应用文件，天然幂等；
--       不要重复用 `d1 execute --file` 手动二次执行，SQLite 的 ALTER TABLE ADD COLUMN 不幂等。

ALTER TABLE videos ADD COLUMN author_avatar_url TEXT;
ALTER TABLE videos ADD COLUMN collects INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_videos_collects
    ON videos(collects DESC);
