// 同步编排：读红绳库 → 筛选 → 转换 → 写 apps/<site>/import.sql → 执行 wrangler 导入 D1。
// 导入复用各 app package.json 既有的 db:import* 脚本，保持命令格式一致。
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RedstringConnection } from './connection.ts';
import { UserProfileSchema, UserPostSchema } from './entities.ts';
import { datingPostInsertSql, datingProfileInsertSql, hotVideoInsertSql } from './sqlgen.ts';
import {
  genderLabel,
  postToDatingPost,
  postToHotVideo,
  profileToDatingProfile,
} from './transform.ts';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(pkgRoot, '../..');

export interface SyncFlags {
  dryRun?: boolean;
  skipImport?: boolean;
  local?: boolean;
  minIntentScore?: number;
  gender?: string;
  region?: string;
  minLikes?: number;
  minCollects?: number;
  limit?: number;
}

export interface SiteResult {
  site: string;
  total: number;
  filtered: number;
  related: number; // dating: 关联作品数；hot: 0
  sqlPath: string | null;
  imported: boolean;
}

function runWrangler(app: string, script: string): void {
  console.log(`\n> pnpm --filter ${app} ${script}`);
  const cmd = `pnpm --filter ${app} ${script}`;
  const r = spawnSync(cmd, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    throw new Error(`wrangler 导入失败（exit ${r.status}），import.sql 已生成，可稍后手动执行`);
  }
}

export async function syncDating(conn: RedstringConnection, flags: SyncFlags): Promise<SiteResult> {
  const nowSec = Math.floor(Date.now() / 1000);
  const all = await conn.ds.getRepository(UserProfileSchema).find();
  let rows = all.filter((p) => p.user_id);
  if (flags.minIntentScore !== undefined) {
    rows = rows.filter((p) => (p.intent_score ?? 0) >= flags.minIntentScore!);
  }
  if (flags.gender) rows = rows.filter((p) => genderLabel(p.gender) === flags.gender);
  if (flags.region) {
    const q = flags.region;
    rows = rows.filter(
      (p) =>
        (p.ip_location ?? '').includes(q) ||
        (p.city ?? '').includes(q) ||
        (p.province ?? '').includes(q),
    );
  }
  if (flags.limit !== undefined) rows = rows.slice(0, flags.limit);
  const profiles = rows.map((p) => profileToDatingProfile(p, nowSec));

  // 作品只导已入选画像的作者，profile_id 由 SQL 内标量子查询解析
  const intentByUid = new Map(rows.map((p) => [p.user_id, p.intent_score ?? 0]));
  const allPosts = intentByUid.size > 0 ? await conn.ds.getRepository(UserPostSchema).find() : [];
  const posts = allPosts
    .filter((p) => intentByUid.has(p.author_uid))
    .map((p) =>
      postToDatingPost(p, { userId: p.author_uid, intentScore: intentByUid.get(p.author_uid) ?? 0 }, nowSec),
    );

  console.log(
    `\n[dating] user_profiles 总数 ${all.length}，筛选后画像 ${profiles.length} 条，关联作品 ${posts.length} 条`,
  );
  if (all.length > 0 && profiles.length > 0) {
    const withGender = profiles.filter((p) => p.gender !== null).length;
    const withTags = profiles.filter((p) => p.tags !== null).length;
    const strong = profiles.filter((p) => p.intent_score >= 70).length;
    console.log(`[dating] 字段覆盖：性别 ${withGender}，标签 ${withTags}，意愿分≥70 ${strong}`);
  }

  const result: SiteResult = {
    site: 'dating',
    total: all.length,
    filtered: profiles.length,
    related: posts.length,
    sqlPath: null,
    imported: false,
  };
  if (profiles.length === 0) {
    console.log('[dating] 无画像数据，跳过生成与导入（红绳侧生成 user_profiles 后重试）');
    return result;
  }

  const lines = [
    '-- 相亲信息导航 D1 导入（由 @creator-nav/db-source 从红绳库直连生成，幂等）',
    '-- 应用：wrangler d1 execute DATING_DB --remote --file=import.sql',
    '',
    ...profiles.map(datingProfileInsertSql),
    '',
    ...posts.map(datingPostInsertSql),
  ];
  if (flags.dryRun) {
    console.log('[dating] --dry-run：不写文件、不导入');
    return result;
  }
  const sqlPath = resolve(repoRoot, 'apps/dating-nav/import.sql');
  writeFileSync(sqlPath, lines.join('\n') + '\n');
  console.log(`[dating] 已生成 ${sqlPath}`);
  result.sqlPath = sqlPath;
  if (!flags.skipImport) {
    runWrangler('dating-nav', flags.local ? 'db:import:local' : 'db:import:remote');
    result.imported = true;
  }
  return result;
}

export async function syncHotVideo(conn: RedstringConnection, flags: SyncFlags): Promise<SiteResult> {
  const nowSec = Math.floor(Date.now() / 1000);
  const all = await conn.ds.getRepository(UserPostSchema).find();
  let rows = all;
  if (flags.minLikes !== undefined) rows = rows.filter((p) => (p.digg_count ?? 0) >= flags.minLikes!);
  if (flags.minCollects !== undefined) rows = rows.filter((p) => (p.collect_count ?? 0) >= flags.minCollects!);
  if (flags.limit !== undefined) rows = rows.slice(0, flags.limit);

  const covers = new Map<string, string | null>();
  if (conn.tables.has('videos')) {
    const vrows = (await conn.ds.query('SELECT post_id, cover_url FROM videos')) as Array<{
      post_id: string | null;
      cover_url: string | null;
    }>;
    for (const v of vrows) {
      if (v.post_id) covers.set(v.post_id, v.cover_url);
    }
  }
  const videos = rows.map((p) => postToHotVideo(p, covers.get(p.id) ?? null, nowSec));
  const withCover = videos.filter((v) => v.cover_url !== null).length;

  console.log(`\n[hot] user_posts 总数 ${all.length}，筛选后 ${videos.length} 条，有封面 ${withCover} 条`);

  const result: SiteResult = {
    site: 'hot',
    total: all.length,
    filtered: videos.length,
    related: 0,
    sqlPath: null,
    imported: false,
  };
  if (videos.length === 0) {
    console.log('[hot] 无作品数据，跳过生成与导入');
    return result;
  }

  const lines = [
    '-- 爆款视频导航 D1 导入（由 @creator-nav/db-source 从红绳库直连生成，幂等）',
    '-- 应用：wrangler d1 execute VIDEO_DB --remote --file=import.sql',
    '',
    ...videos.map(hotVideoInsertSql),
  ];
  if (flags.dryRun) {
    console.log('[hot] --dry-run：不写文件、不导入');
    return result;
  }
  const sqlPath = resolve(repoRoot, 'apps/hot-video/import.sql');
  writeFileSync(sqlPath, lines.join('\n') + '\n');
  console.log(`[hot] 已生成 ${sqlPath}`);
  result.sqlPath = sqlPath;
  if (!flags.skipImport) {
    runWrangler('hot-video', flags.local ? 'db:import:local' : 'db:import');
    result.imported = true;
  }
  return result;
}
