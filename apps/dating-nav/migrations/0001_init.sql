-- 相亲信息导航站 D1 初始结构（PRD §9、§41）
-- 应用：wrangler d1 execute DATING_DB --local  --file=migrations/0001_init.sql
--       wrangler d1 execute DATING_DB --remote --file=migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS dating_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    source_user_id TEXT NOT NULL,
    nickname TEXT,
    profile_url TEXT,
    gender TEXT,
    birth_year INTEGER,
    ip_region TEXT,
    residence_region TEXT,
    -- 月老玩法「可判断性」辅助字段（PRD §18，B 级公开数据）。avatar 为空时前端用生成式占位。
    occupation TEXT,
    tags TEXT,            -- JSON 数组字符串，如 ["爱旅行","猫奴","健身"]
    introduction TEXT,
    avatar TEXT,          -- 可选公开头像 URL；MVP 留空，不托管/盗链真实图片
    intent_score INTEGER DEFAULT 0,
    intent_level TEXT,
    freshness_score INTEGER DEFAULT 0,
    activity_score INTEGER DEFAULT 0,
    confidence_score INTEGER DEFAULT 0,
    intent_updated_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(source, source_user_id)
);

CREATE TABLE IF NOT EXISTS dating_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES dating_profiles(id) ON DELETE CASCADE,
    title TEXT,
    content_summary TEXT,
    source TEXT NOT NULL,
    source_post_id TEXT NOT NULL,
    source_url TEXT NOT NULL,
    published_at INTEGER,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    intent_score_snapshot INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(source, source_post_id)
);

-- 列表 / 筛选 / 排序常用索引
CREATE INDEX IF NOT EXISTS idx_posts_published ON dating_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_intent    ON dating_posts(intent_score_snapshot DESC);
CREATE INDEX IF NOT EXISTS idx_posts_profile    ON dating_posts(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_region  ON dating_profiles(residence_region);
CREATE INDEX IF NOT EXISTS idx_profiles_gender  ON dating_profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_birth   ON dating_profiles(birth_year);
CREATE INDEX IF NOT EXISTS idx_profiles_intent  ON dating_profiles(intent_score DESC);
