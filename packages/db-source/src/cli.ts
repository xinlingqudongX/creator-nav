// CLI 入口：红绳 SQLite 库 → Cloudflare D1 直连同步
// 运行：node --experimental-strip-types packages/db-source/src/cli.ts [options]
import { openRedstring } from './connection.ts';
import { syncDating, syncHotVideo, type SyncFlags } from './import.ts';

interface ParsedArgs extends SyncFlags {
  site: string;
  db?: string;
  help?: boolean;
}

const VALUE_FLAGS = new Set([
  '--site',
  '--db',
  '--min-intent-score',
  '--gender',
  '--region',
  '--min-likes',
  '--min-collects',
  '--limit',
]);

const USAGE = `红绳 → Cloudflare D1 直连同步（跳过手动导出 JSON）

用法: pnpm sync:redstring [options]

选项:
  --site dating|hot|all   目标站点（默认 all，两站顺序执行）
  --db <path>             红绳数据库路径（默认 %APPDATA%/redstring-desktop/redstring.db）
  --min-intent-score <n>  dating: 相亲意愿分下限
  --gender <男|女>        dating: 性别筛选
  --region <关键词>       dating: 地区模糊匹配（IP属地/城市/省份）
  --min-likes <n>         hot: 作品点赞数下限
  --min-collects <n>      hot: 作品收藏数下限
  --limit <n>             最多导入条数（dating 计画像，hot 计作品）
  --dry-run               只读红绳库并打印统计，不写 SQL、不导入
  --skip-import           只生成 import.sql，不执行 wrangler
  --local                 导入到本地 D1（默认远程）
  -h, --help              显示本帮助`;

function toNum(v: string, flag: string): number {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${flag} 需要数字，收到: ${v}`);
  return n;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { site: 'all' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (VALUE_FLAGS.has(a)) {
      const v = argv[++i];
      if (v === undefined) throw new Error(`缺少参数值: ${a}`);
      switch (a) {
        case '--site':
          parsed.site = v;
          break;
        case '--db':
          parsed.db = v;
          break;
        case '--min-intent-score':
          parsed.minIntentScore = toNum(v, a);
          break;
        case '--gender':
          parsed.gender = v;
          break;
        case '--region':
          parsed.region = v;
          break;
        case '--min-likes':
          parsed.minLikes = toNum(v, a);
          break;
        case '--min-collects':
          parsed.minCollects = toNum(v, a);
          break;
        case '--limit':
          parsed.limit = toNum(v, a);
          break;
      }
    } else if (a === '--dry-run') {
      parsed.dryRun = true;
    } else if (a === '--skip-import') {
      parsed.skipImport = true;
    } else if (a === '--local') {
      parsed.local = true;
    } else if (a === '--help' || a === '-h') {
      parsed.help = true;
    } else {
      throw new Error(`未知参数: ${a}\n\n${USAGE}`);
    }
  }
  if (!['dating', 'hot', 'all'].includes(parsed.site)) {
    throw new Error(`--site 仅支持 dating|hot|all，收到: ${parsed.site}`);
  }
  return parsed;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }

  console.log('打开红绳库（只读）…');
  const conn = await openRedstring(args.db);
  try {
    console.log(
      `  user_profiles ${conn.counts.user_profiles} 行 | user_posts ${conn.counts.user_posts} 行 | videos ${conn.counts.videos < 0 ? '表不存在' : conn.counts.videos + ' 行'}`,
    );

    const results = [];
    if (args.site === 'dating' || args.site === 'all') results.push(await syncDating(conn, args));
    if (args.site === 'hot' || args.site === 'all') results.push(await syncHotVideo(conn, args));

    console.log('\n=== 同步结果 ===');
    for (const r of results) {
      const parts = [`筛选后 ${r.filtered} 条`];
      if (r.related > 0) parts.push(`关联作品 ${r.related} 条`);
      parts.push(r.imported ? '已导入 D1' : r.sqlPath ? '仅生成 SQL' : '跳过');
      console.log(`  ${r.site}: ${parts.join('，')}`);
    }
  } finally {
    await conn.close();
  }
}

main().catch((e: unknown) => {
  console.error(`\n[redstring-sync] 失败: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
