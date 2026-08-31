-- 爆款短视频导航站 D1 Schema（PRD §15.1 videos 表, §17 索引）
-- 本地初始化：npx wrangler d1 execute hot-video --local --file=./migrations/0000_init.sql
-- 远程初始化：npx wrangler d1 execute hot-video --remote --file=./migrations/0000_init.sql

CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY,

    source TEXT NOT NULL,
    source_id TEXT NOT NULL,

    title TEXT,
    author_name TEXT,
    author_id TEXT,

    cover_url TEXT,
    video_url TEXT NOT NULL,

    likes INTEGER DEFAULT 0,

    publish_time INTEGER,
    collected_time INTEGER,

    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_source_id
ON videos(source, source_id);

CREATE INDEX IF NOT EXISTS idx_videos_likes
ON videos(likes DESC);

CREATE INDEX IF NOT EXISTS idx_videos_publish_time
ON videos(publish_time DESC);

CREATE INDEX IF NOT EXISTS idx_videos_collected_time
ON videos(collected_time DESC);

CREATE INDEX IF NOT EXISTS idx_videos_source
ON videos(source);
