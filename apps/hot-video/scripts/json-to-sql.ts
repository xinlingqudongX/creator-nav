/**
 * json-to-sql.ts — 将视频 JSON 导出转换为 D1 可执行的 INSERT ... ON CONFLICT UPSERT SQL。
 *
 * 用法（Node 22+ 类型擦除，无需额外依赖）：
 *   node --experimental-strip-types scripts/json-to-sql.ts [输入JSON] [输出SQL]
 * 默认：输入 src/data/videos.json，输出 import.sql（项目根目录）
 *
 * 输出示例：
 *   INSERT INTO videos (source, source_id, title, ...) VALUES (... , ...)
 *   ON CONFLICT(source, source_id) DO UPDATE SET title = excluded.title, ...;
 *
 * 说明：
 *   - 唯一键 (source, source_id) 冲突时执行 UPSERT，保留首次 created_at。
 *   - 缺 source / source_id / video_url 的记录会被跳过并打印告警。
 *   - 字符串值做单引号转义（SQL 标准：重复单引号）并剔除 NUL 字符，避免注入与语法错误。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

interface VideoInput {
  source: string;
  source_id: string;
  video_url: string;
  title?: string | null;
  cover_url?: string | null;
  author_name?: string | null;
  author_id?: string | null;
  likes?: number | string | null;
  publish_time?: number | null;
  collected_time?: number | null;
  created_at?: number;
  updated_at?: number;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const inputPath = resolve(root, process.argv[2] ?? 'src/data/videos.json');
const outputPath = resolve(root, process.argv[3] ?? 'import.sql');

// 插入列（固定集合，缺省字段以 NULL 写入）
const COLUMNS = [
  'source', 'source_id', 'title', 'cover_url', 'video_url',
  'author_name', 'author_id', 'likes', 'publish_time', 'collected_time',
  'created_at', 'updated_at',
] as const;

// 冲突更新列（不含唯一键 source/source_id，不含首次 created_at）
const UPDATE_COLUMNS = [
  'title', 'cover_url', 'video_url', 'author_name', 'author_id',
  'likes', 'publish_time', 'collected_time', 'updated_at',
] as const;

function sqlVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  const s = String(v).replace(/\u0000/g, ''); // 剔除 NUL，避免 SQL 语法截断
  return "'" + s.replace(/'/g, "''") + "'"; // 单引号转义
}

function numVal(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildRow(rec: Record<string, unknown>, now: number): string {
  const values: string[] = [];
  for (const col of COLUMNS) {
    if (col === 'created_at') { values.push(String((rec.created_at as number) ?? now)); continue; }
    if (col === 'updated_at') { values.push(String((rec.updated_at as number) ?? now)); continue; }
    if (col === 'likes') { values.push(sqlVal(numVal(rec.likes))); continue; }
    values.push(sqlVal(rec[col] ?? null));
  }
  const cols = COLUMNS.join(',\n    ');
  const vals = values.join(',\n    ');
  const updates = UPDATE_COLUMNS.map((c) => `    ${c} = excluded.${c}`).join(',\n');
  return `INSERT INTO videos (
    ${cols}
)
VALUES (
    ${vals}
)
ON CONFLICT(source, source_id)
DO UPDATE SET
${updates};`;
}

function main(): void {
  const raw = readFileSync(inputPath, 'utf8');
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('❌ JSON 解析失败：', (e as Error).message);
    process.exit(1);
  }
  if (!Array.isArray(data)) {
    console.error('❌ 输入必须是 JSON 数组');
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);
  const out: string[] = [
    '-- 由 scripts/json-to-sql.ts 自动生成，请勿手改',
    `-- 生成时间：${new Date().toISOString()}`,
    '-- 本地测试：wrangler d1 execute VIDEO_DB --local  --file=import.sql',
    '-- 生产导入：wrangler d1 execute VIDEO_DB --remote --file=import.sql',
    '',
  ];

  let imported = 0;
  let skipped = 0;
  for (const rec of data as Record<string, unknown>[]) {
    if (!rec || typeof rec !== 'object') { skipped++; continue; }
    if (!rec.source || !rec.source_id || !rec.video_url) {
      console.warn('⚠️ 跳过缺字段记录（需 source/source_id/video_url）：', JSON.stringify(rec).slice(0, 140));
      skipped++;
      continue;
    }
    out.push(buildRow(rec, now));
    out.push('');
    imported++;
  }

  writeFileSync(outputPath, out.join('\n'), 'utf8');
  console.log(`✅ 已生成 ${outputPath}`);
  console.log(`   导入 ${imported} 条，跳过 ${skipped} 条`);
  if (skipped > 0) process.exitCode = 0; // 部分跳过仍算成功，仅打印告警
}

main();
