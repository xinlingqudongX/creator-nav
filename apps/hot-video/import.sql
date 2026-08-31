-- 爆款视频导航 D1 导入（由 @creator-nav/db-source 从红绳库直连生成，幂等）
-- 应用：wrangler d1 execute VIDEO_DB --remote --file=import.sql

INSERT INTO videos (source, source_id, title, cover_url, video_url, author_name, author_id, likes, publish_time, collected_time, created_at, updated_at) VALUES ('douyin', '7655771646766564453', '#解决充电插头的问题', NULL, 'https://www.douyin.com/video/7655771646766564453', '碟中碟niu', '2209365018295034', 178501, 1782519780, 1788008345, 1788008345, 1788008345) ON CONFLICT(source, source_id) DO UPDATE SET title=excluded.title, cover_url=excluded.cover_url, video_url=excluded.video_url, author_name=excluded.author_name, author_id=excluded.author_id, likes=excluded.likes, publish_time=excluded.publish_time, collected_time=excluded.collected_time, updated_at=excluded.updated_at;
