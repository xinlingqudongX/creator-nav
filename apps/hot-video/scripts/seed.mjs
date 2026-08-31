// 本地 D1 种子脚本：将 src/data/videos.json 导入 D1（PRD §20 增量导入）
// 用法：node scripts/seed.mjs  （需先 npx wrangler d1 create hot-video 并配置 wrangler.toml 的 database_id）
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const run = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const videos = JSON.parse(readFileSync(resolve(__dirname, '../src/data/videos.json'), 'utf8'));

const esc = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

const statements = videos
  .map(
    (v) => `INSERT OR REPLACE INTO videos
      (id, source, source_id, title, author_name, author_id, cover_url, video_url, likes, publish_time, collected_time, created_at, updated_at)
     VALUES (${v.id}, ${esc(v.source)}, ${esc(v.source_id)}, ${esc(v.title)}, ${esc(v.author_name)}, ${esc(v.author_id)}, ${esc(v.cover_url)}, ${esc(v.video_url)}, ${v.likes}, ${esc(v.publish_time)}, ${esc(v.collected_time)}, ${esc(v.created_at)}, ${esc(v.updated_at)});`
  )
  .join('\n');

const sql = `-- 由 scripts/seed.mjs 生成\n${statements}\n`;

try {
  await run('npx', ['wrangler', 'd1', 'execute', 'hot-video', '--local', '--command', sql], {
    stdio: 'inherit',
    shell: true,
  });
  console.log(`\n✅ 已导入 ${videos.length} 条视频到本地 D1`);
} catch (e) {
  console.error('\n❌ 导入失败，请确认：');
  console.error('   1) 已运行 npx wrangler d1 create hot-video');
  console.error('   2) wrangler.toml 中 database_id 已填写');
  console.error('   也可将下方 SQL 保存为文件后执行：npx wrangler d1 execute hot-video --local --file=seed.sql\n');
  console.error(sql);
  process.exit(1);
}
