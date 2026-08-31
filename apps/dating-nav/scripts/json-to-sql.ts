// 相亲信息 JSON → D1 import.sql（PRD §40–§41）
// 幂等：重复导入使用 ON CONFLICT(source, source_user_id / source_post_id) DO UPDATE。
// 运行：node --experimental-strip-types scripts/json-to-sql.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../src/data');

interface Profile {
  id: number;
  source: string;
  source_user_id: string;
  nickname: string | null;
  profile_url: string | null;
  gender: string | null;
  birth_year: number | null;
  ip_region: string | null;
  residence_region: string | null;
  occupation: string | null;
  tags: string[] | null;
  introduction: string | null;
  avatar: string | null;
  intent_score: number;
  intent_level: string | null;
  freshness_score: number;
  activity_score: number;
  confidence_score: number;
  intent_updated_at: number | null;
  created_at: number;
  updated_at: number;
}
interface Post {
  id: number;
  profile_id: number;
  title: string | null;
  content_summary: string | null;
  source: string;
  source_post_id: string;
  source_url: string;
  published_at: number | null;
  likes: number;
  comments: number;
  intent_score_snapshot: number;
  created_at: number;
  updated_at: number;
}

function sqlStr(v: string | null | undefined): string {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlNum(v: number | null | undefined): string {
  return v === null || v === undefined ? 'NULL' : String(v);
}

const profiles = JSON.parse(readFileSync(resolve(dataDir, 'dating-profiles.json'), 'utf-8')) as Profile[];
const posts = JSON.parse(readFileSync(resolve(dataDir, 'dating-posts.json'), 'utf-8')) as Post[];

const lines: string[] = [
  '-- 相亲信息导航 D1 导入（由 scripts/json-to-sql.ts 生成，幂等）',
  '-- 应用：wrangler d1 execute DATING_DB --remote --file=import.sql',
  '',
];

// profiles
for (const p of profiles) {
  const tagsSql = p.tags ? sqlStr(JSON.stringify(p.tags)) : 'NULL';
  lines.push(
    `INSERT INTO dating_profiles (id, source, source_user_id, nickname, profile_url, gender, birth_year, ip_region, residence_region, occupation, tags, introduction, avatar, intent_score, intent_level, freshness_score, activity_score, confidence_score, intent_updated_at, created_at, updated_at) VALUES (${p.id}, ${sqlStr(p.source)}, ${sqlStr(p.source_user_id)}, ${sqlStr(p.nickname)}, ${sqlStr(p.profile_url)}, ${sqlStr(p.gender)}, ${sqlNum(p.birth_year)}, ${sqlStr(p.ip_region)}, ${sqlStr(p.residence_region)}, ${sqlStr(p.occupation)}, ${tagsSql}, ${sqlStr(p.introduction)}, ${sqlStr(p.avatar)}, ${p.intent_score}, ${sqlStr(p.intent_level)}, ${p.freshness_score}, ${p.activity_score}, ${p.confidence_score}, ${sqlNum(p.intent_updated_at)}, ${p.created_at}, ${p.updated_at}) ON CONFLICT(source, source_user_id) DO UPDATE SET nickname=excluded.nickname, profile_url=excluded.profile_url, gender=excluded.gender, birth_year=excluded.birth_year, ip_region=excluded.ip_region, residence_region=excluded.residence_region, occupation=excluded.occupation, tags=excluded.tags, introduction=excluded.introduction, avatar=excluded.avatar, intent_score=excluded.intent_score, intent_level=excluded.intent_level, freshness_score=excluded.freshness_score, activity_score=excluded.activity_score, confidence_score=excluded.confidence_score, intent_updated_at=excluded.intent_updated_at, updated_at=excluded.updated_at;`
  );
}

// posts
for (const p of posts) {
  lines.push(
    `INSERT INTO dating_posts (id, profile_id, title, content_summary, source, source_post_id, source_url, published_at, likes, comments, intent_score_snapshot, created_at, updated_at) VALUES (${p.id}, ${p.profile_id}, ${sqlStr(p.title)}, ${sqlStr(p.content_summary)}, ${sqlStr(p.source)}, ${sqlStr(p.source_post_id)}, ${sqlStr(p.source_url)}, ${sqlNum(p.published_at)}, ${p.likes}, ${p.comments}, ${p.intent_score_snapshot}, ${p.created_at}, ${p.updated_at}) ON CONFLICT(source, source_post_id) DO UPDATE SET title=excluded.title, content_summary=excluded.content_summary, source_url=excluded.source_url, published_at=excluded.published_at, likes=excluded.likes, comments=excluded.comments, intent_score_snapshot=excluded.intent_score_snapshot, updated_at=excluded.updated_at;`
  );
}

writeFileSync(resolve(__dirname, '../import.sql'), lines.join('\n') + '\n');
console.log(`generated import.sql: ${profiles.length} profiles, ${posts.length} posts`);
