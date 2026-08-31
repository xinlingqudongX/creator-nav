import type { Video } from './types';
import { TIERS } from './types';
import type { D1Database } from '@creator-nav/ui/lib/d1';
import { getDb } from '@creator-nav/ui/lib/d1';
// 本地回退数据：`src/data/videos.json` 已移除，数据以 redstring `user_posts` 同步后的 D1 为准。
const fallbackData: Video[] = [];

export interface VideoQuery {
  minCollects?: number;
  maxCollects?: number; // exclusive upper bound on collects（首页 1K–10K 区间用）
  after?: number; // publish_time >= after (秒)
  before?: number; // publish_time < before (秒)
  year?: number;
  yearMonth?: string; // 'YYYY-MM'
  excludeId?: number;
  order?: 'collects' | 'likes' | 'publish_time';
  limit?: number;
  // 游标分页（PRD §23.1）：禁止使用 OFFSET。
  // 编码格式 `${score}:${id}`，score 为当前排序字段值（collects / likes / publish_time），id 为视频主键。
  // 降序排列下，下一页取「(score, id) 小于游标」的记录，避免 OFFSET 在大数据量下的漂移与性能问题。
  cursor?: string;
}

// 排序字段 → SQL / JS 列名。默认按收藏数排序（"值收藏"是本站主排序口径）。
function orderColOf(order: VideoQuery['order']): 'collects' | 'likes' | 'publish_time' {
  if (order === 'likes') return 'likes';
  if (order === 'publish_time') return 'publish_time';
  return 'collects';
}

export interface VideoStats {
  total: number;
  byTier: { key: string; label: string; min: number; max: number | null; count: number }[];
  todayNew: number;
}

// D1 绑定统一由 @creator-nav/ui 的 getDb(binding) 提供（Astro 7 + cloudflare:workers 适配）。
// 本文件直接调用 getDb('VIDEO_DB')，非 CF 运行时返回 null 时回退到本地 JSON。

// 编码游标：score=排序字段值，id=主键。供未来「加载更多」API 使用。
export function encodeCursor(score: number, id: number): string {
  return `${score}:${id}`;
}

// 解析游标为 (score, id)；非法返回 null。
function decodeCursor(cursor?: string): { score: number; id: number } | null {
  if (!cursor) return null;
  const parts = cursor.split(':');
  if (parts.length !== 2) return null;
  const score = Number(parts[0]);
  const id = Number(parts[1]);
  if (Number.isNaN(score) || Number.isNaN(id)) return null;
  return { score, id };
}

// 本地 JSON 回退：按条件过滤/排序
function queryLocal(opts: VideoQuery): Video[] {
  let list = (fallbackData as unknown as Video[]).slice();
  if (opts.minCollects != null) list = list.filter((v) => (v.collects ?? 0) >= opts.minCollects!);
  if (opts.maxCollects != null) list = list.filter((v) => (v.collects ?? 0) < opts.maxCollects!);
  if (opts.after != null) list = list.filter((v) => (v.publish_time ?? 0) >= opts.after!);
  if (opts.before != null) list = list.filter((v) => (v.publish_time ?? 0) < opts.before!);
  if (opts.year != null)
    list = list.filter((v) => v.publish_time && new Date(v.publish_time * 1000).getFullYear() === opts.year);
  if (opts.yearMonth != null)
    list = list.filter((v) => {
      if (!v.publish_time) return false;
      const d = new Date(v.publish_time * 1000);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return ym === opts.yearMonth;
    });
  if (opts.excludeId != null) list = list.filter((v) => v.id !== opts.excludeId);
  // 游标过滤（降序）：(score, id) < (cursor.score, cursor.id)
  const cur = decodeCursor(opts.cursor);
  const orderCol = orderColOf(opts.order);
  if (cur) {
    list = list.filter((v) => {
      const s = (v[orderCol] ?? 0) as number;
      return s < cur.score || (s === cur.score && v.id < cur.id);
    });
  }

  list.sort((a, b) => ((b[orderCol] ?? 0) as number) - ((a[orderCol] ?? 0) as number));
  if (opts.limit != null) list = list.slice(0, opts.limit);
  return list;
}

// D1 查询：构造参数化 SQL（PRD §15-17 / §23-25，游标分页替代 OFFSET）
async function queryD1(db: D1Database, opts: VideoQuery): Promise<Video[]> {
  const conds: string[] = [];
  const params: unknown[] = [];
  if (opts.minCollects != null) {
    conds.push('collects >= ?');
    params.push(opts.minCollects);
  }
  if (opts.maxCollects != null) {
    conds.push('collects < ?');
    params.push(opts.maxCollects);
  }
  if (opts.after != null) {
    conds.push('publish_time >= ?');
    params.push(opts.after);
  }
  if (opts.before != null) {
    conds.push('publish_time < ?');
    params.push(opts.before);
  }
  if (opts.year != null) {
    conds.push("strftime('%Y', datetime(publish_time, 'unixepoch')) = ?");
    params.push(String(opts.year));
  }
  if (opts.yearMonth != null) {
    conds.push("strftime('%Y-%m', datetime(publish_time, 'unixepoch')) = ?");
    params.push(opts.yearMonth);
  }
  if (opts.excludeId != null) {
    conds.push('id != ?');
    params.push(opts.excludeId);
  }
  // 游标分页：降序下 WHERE (col < score) OR (col = score AND id < id)
  const orderCol = orderColOf(opts.order);
  const cur = decodeCursor(opts.cursor);
  if (cur) {
    conds.push(`((${orderCol} < ?) OR (${orderCol} = ? AND id < ?))`);
    params.push(cur.score, cur.score, cur.id);
  }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const limit = opts.limit ?? 60;
  const sql = `SELECT * FROM videos ${where} ORDER BY ${orderCol} DESC, id DESC LIMIT ?`;
  const res = await db.prepare(sql).bind(...params, limit).all<Video>();
  return res.results;
}

// 统一入口：有 D1 绑定且查询成功走 D1，否则本地 JSON 回退
export async function getVideos(opts: VideoQuery = {}): Promise<Video[]> {
  const db = await getDb('VIDEO_DB');
  if (db) {
    try {
      return await queryD1(db, opts);
    } catch (e) {
      console.warn('[videos] D1 query failed, fallback to local JSON:', e);
    }
  }
  return queryLocal(opts);
}

export async function getVideoById(id: number): Promise<Video | null> {
  const db = await getDb('VIDEO_DB');
  if (db) {
    try {
      const res = await db.prepare('SELECT * FROM videos WHERE id = ?').bind(id).first<Video>();
      if (res) return res;
    } catch (e) {
      console.warn('[videos] D1 getVideoById failed, fallback:', e);
    }
  }
  return (fallbackData as unknown as Video[]).find((v) => v.id === id) ?? null;
}

export async function getStats(): Promise<VideoStats> {
  const startOfToday = Math.floor(new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000);

  const db = await getDb('VIDEO_DB');
  if (db) {
    try {
      const total = (await db.prepare('SELECT COUNT(*) AS c FROM videos').first<{ c: number }>())?.c ?? 0;
      const byTier = await Promise.all(
        TIERS.map(async (t) => ({
          key: t.key,
          label: t.label,
          min: t.min,
          max: t.max,
          count:
            (
              t.max === null
                ? await db
                    .prepare('SELECT COUNT(*) AS c FROM videos WHERE collects >= ?')
                    .bind(t.min)
                    .first<{ c: number }>()
                : await db
                    .prepare('SELECT COUNT(*) AS c FROM videos WHERE collects >= ? AND collects < ?')
                    .bind(t.min, t.max)
                    .first<{ c: number }>()
            )?.c ?? 0,
        }))
      );
      const todayNew = (await db.prepare('SELECT COUNT(*) AS c FROM videos WHERE created_at >= ?').bind(startOfToday).first<{ c: number }>())?.c ?? 0;
      return { total, byTier, todayNew };
    } catch (e) {
      console.warn('[videos] D1 stats failed, fallback:', e);
    }
  }

  const list = fallbackData as unknown as Video[];
  return {
    total: list.length,
    byTier: TIERS.map((t) => ({
      key: t.key,
      label: t.label,
      min: t.min,
      max: t.max,
      count: list.filter((v) => {
        const n = v.collects ?? 0;
        if (n < t.min) return false;
        if (t.max !== null && n >= t.max) return false;
        return true;
      }).length,
    })),
    todayNew: list.filter((v) => (v.created_at ?? 0) >= startOfToday).length,
  };
}

// 时间范围工具（秒）
export function startOfTodaySec(): number {
  return Math.floor(new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000);
}
export function daysAgoSec(days: number): number {
  return Math.floor((Date.now() - days * 24 * 3600 * 1000) / 1000);
}
