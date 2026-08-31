// 打开红绳 SQLite 库（只读）。主库路径由红绳 electron/main/index.ts 的
// app.setPath("userData", appData/redstring-desktop) 决定，WAL 模式下并发只读安全。
import { existsSync } from 'node:fs';
import path from 'node:path';
import { DataSource } from 'typeorm';
import { UserProfileSchema, UserPostSchema, VideoSchema } from './entities.ts';

export function defaultRedstringDbPath(): string {
  const appData = process.env.APPDATA ?? path.join(process.env.HOME ?? '', 'AppData', 'Roaming');
  return path.join(appData, 'redstring-desktop', 'redstring.db');
}

export interface RedstringConnection {
  ds: DataSource;
  tables: Set<string>;
  /** 各表行数；表不存在时为 -1 */
  counts: Record<string, number>;
  close(): Promise<void>;
}

export async function openRedstring(dbPath?: string): Promise<RedstringConnection> {
  const resolved = dbPath ?? defaultRedstringDbPath();
  if (!existsSync(resolved)) {
    throw new Error(`红绳数据库不存在: ${resolved}（可用 --db 指定路径）`);
  }

  const ds = new DataSource({
    type: 'better-sqlite3',
    database: resolved,
    readonly: true,
    fileMustExist: true,
    synchronize: false,
    logging: false,
    entities: [UserProfileSchema, UserPostSchema, VideoSchema],
  });
  await ds.initialize();

  const tableRows = (await ds.query(
    `SELECT name FROM sqlite_master WHERE type='table'`,
  )) as Array<{ name: string }>;
  const tables = new Set(tableRows.map((r) => r.name));

  const required = ['user_profiles', 'user_posts'];
  const missing = required.filter((t) => !tables.has(t));
  if (missing.length > 0) {
    await ds.destroy();
    throw new Error(`红绳库缺少必需表: ${missing.join(', ')}（该文件可能不是红绳主库）`);
  }

  const counts: Record<string, number> = {};
  for (const t of ['user_profiles', 'user_posts', 'videos']) {
    if (!tables.has(t)) {
      counts[t] = -1;
      continue;
    }
    const rows = (await ds.query(`SELECT COUNT(*) AS n FROM ${t}`)) as Array<{ n: number }>;
    counts[t] = Number(rows[0].n);
  }

  return { ds, tables, counts, close: () => ds.destroy() };
}
