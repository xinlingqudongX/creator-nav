-- 月老连线功能所需人物辅助字段（PRD §18）。
-- 仅对「已应用 0001 但缺少下列列」的库执行；全新库由 0001 直接创建，本文件可安全跳过（ALTER 报错即忽略）。
-- 应用：wrangler d1 execute DATING_DB --remote --file=migrations/0002_people.sql
--
-- 说明：SQLite 不支持 ADD COLUMN IF NOT EXISTS，故下列语句在列已存在时会报错；
-- 在迁移流程中忽略该错误即可（首次建库已由 0001_init.sql 包含这些列）。

ALTER TABLE dating_profiles ADD COLUMN occupation TEXT;
ALTER TABLE dating_profiles ADD COLUMN tags TEXT;
ALTER TABLE dating_profiles ADD COLUMN introduction TEXT;
ALTER TABLE dating_profiles ADD COLUMN avatar TEXT;
