// 幂等 INSERT SQL 生成。转义规则沿用 apps/*/scripts/json-to-sql.ts：
// 单引号翻倍、剔除 NUL 字符；NULL 缺省；不写显式 id（让 D1 AUTOINCREMENT 分配）。
import type { DatingProfileRow, DatingPostRow, HotVideoRow } from './transform.ts';

export function sqlStr(v: string | null | undefined): string {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/\0/g, '').replace(/'/g, "''")}'`;
}

export function sqlNum(v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? 'NULL' : String(v);
}

function subqueryProfileId(sourceUserId: string): string {
  return `(SELECT id FROM dating_profiles WHERE source=${sqlStr('douyin')} AND source_user_id=${sqlStr(sourceUserId)})`;
}

export function datingProfileInsertSql(r: DatingProfileRow): string {
  const tagsSql = r.tags === null ? 'NULL' : sqlStr(r.tags);
  return (
    `INSERT INTO dating_profiles (source, source_user_id, nickname, profile_url, gender, birth_year, ip_region, residence_region, occupation, tags, introduction, avatar, intent_score, intent_level, freshness_score, activity_score, confidence_score, intent_updated_at, created_at, updated_at) VALUES (` +
    `${sqlStr(r.source)}, ${sqlStr(r.source_user_id)}, ${sqlStr(r.nickname)}, ${sqlStr(r.profile_url)}, ${sqlStr(r.gender)}, ${sqlNum(r.birth_year)}, ${sqlStr(r.ip_region)}, ${sqlStr(r.residence_region)}, ${sqlStr(r.occupation)}, ${tagsSql}, ${sqlStr(r.introduction)}, ${sqlStr(r.avatar)}, ${sqlNum(r.intent_score)}, ${sqlStr(r.intent_level)}, ${sqlNum(r.freshness_score)}, ${sqlNum(r.activity_score)}, ${sqlNum(r.confidence_score)}, ${sqlNum(r.intent_updated_at)}, ${sqlNum(r.created_at)}, ${sqlNum(r.updated_at)})` +
    ` ON CONFLICT(source, source_user_id) DO UPDATE SET nickname=excluded.nickname, profile_url=excluded.profile_url, gender=excluded.gender, birth_year=excluded.birth_year, ip_region=excluded.ip_region, residence_region=excluded.residence_region, occupation=excluded.occupation, tags=excluded.tags, introduction=excluded.introduction, avatar=excluded.avatar, intent_score=excluded.intent_score, intent_level=excluded.intent_level, freshness_score=excluded.freshness_score, activity_score=excluded.activity_score, confidence_score=excluded.confidence_score, intent_updated_at=excluded.intent_updated_at, updated_at=excluded.updated_at;`
  );
}

export function datingPostInsertSql(r: DatingPostRow): string {
  return (
    `INSERT INTO dating_posts (profile_id, title, content_summary, source, source_post_id, source_url, published_at, likes, comments, intent_score_snapshot, created_at, updated_at) VALUES (` +
    `${subqueryProfileId(r.profile_user_id)}, ${sqlStr(r.title)}, ${sqlStr(r.content_summary)}, ${sqlStr(r.source)}, ${sqlStr(r.source_post_id)}, ${sqlStr(r.source_url)}, ${sqlNum(r.published_at)}, ${sqlNum(r.likes)}, ${sqlNum(r.comments)}, ${sqlNum(r.intent_score_snapshot)}, ${sqlNum(r.created_at)}, ${sqlNum(r.updated_at)})` +
    ` ON CONFLICT(source, source_post_id) DO UPDATE SET title=excluded.title, content_summary=excluded.content_summary, source_url=excluded.source_url, published_at=excluded.published_at, likes=excluded.likes, comments=excluded.comments, intent_score_snapshot=excluded.intent_score_snapshot, updated_at=excluded.updated_at;`
  );
}

export function hotVideoInsertSql(r: HotVideoRow): string {
  return (
    `INSERT INTO videos (source, source_id, title, cover_url, video_url, author_name, author_id, author_avatar_url, likes, collects, publish_time, collected_time, created_at, updated_at) VALUES (` +
    `${sqlStr(r.source)}, ${sqlStr(r.source_id)}, ${sqlStr(r.title)}, ${sqlStr(r.cover_url)}, ${sqlStr(r.video_url)}, ${sqlStr(r.author_name)}, ${sqlStr(r.author_id)}, ${sqlStr(r.author_avatar_url)}, ${sqlNum(r.likes)}, ${sqlNum(r.collects)}, ${sqlNum(r.publish_time)}, ${sqlNum(r.collected_time)}, ${sqlNum(r.created_at)}, ${sqlNum(r.updated_at)})` +
    ` ON CONFLICT(source, source_id) DO UPDATE SET title=excluded.title, cover_url=excluded.cover_url, video_url=excluded.video_url, author_name=excluded.author_name, author_id=excluded.author_id, author_avatar_url=excluded.author_avatar_url, likes=excluded.likes, collects=excluded.collects, publish_time=excluded.publish_time, collected_time=excluded.collected_time, updated_at=excluded.updated_at;`
  );
}
