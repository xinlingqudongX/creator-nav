-- Hot Video · D1 初始化（PRD §15-17, §23, §39）
-- 本地测试：wrangler d1 execute VIDEO_DB --local  --file=schema.sql
-- 生产环境：wrangler d1 execute VIDEO_DB --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS videos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,

    source        TEXT NOT NULL,
    source_id     TEXT NOT NULL,

    title         TEXT,
    cover_url     TEXT,
    video_url     TEXT,

    author_name   TEXT,
    author_id     TEXT,

    likes         INTEGER DEFAULT 0,
    publish_time  INTEGER,

    collected_time INTEGER,

    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL,

    UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_videos_likes
    ON videos(likes DESC);

CREATE INDEX IF NOT EXISTS idx_videos_publish_time
    ON videos(publish_time DESC);

CREATE INDEX IF NOT EXISTS idx_videos_source
    ON videos(source);
