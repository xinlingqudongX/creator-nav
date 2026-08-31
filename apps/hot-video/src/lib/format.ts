import { TIERS, type Tier } from './types';

// 大数字格式化（PRD §4.1 / §7 / §8 示例：230W、230.5W、120W）。
// formatCount 是通用别名；formatLikes 保留兼容既有调用（点赞/收藏/其他计数通用）。
export function formatCount(n: number): string {
  if (!n || n < 10_000) {
    return n.toLocaleString('en-US');
  }
  const w = n / 10_000;
  const rounded = Math.round(w * 10) / 10;
  // 整数则不带小数，否则保留一位
  return (Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)) + 'W';
}

export const formatLikes = formatCount;

// 按收藏数返回命中的档位（半开区间 [min, max)，最高档无上界；小于最低阈值返回 null）
export function tierOf(count: number): Tier | null {
  for (const t of TIERS) {
    if (count >= t.min && (t.max === null || count < t.max)) return t;
  }
  return null;
}

// 友好日期（PRD §7 示例：2026-08-20）
export function formatDate(unixSec: number | null | undefined): string {
  if (!unixSec) return '未知';
  const d = new Date(unixSec * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
