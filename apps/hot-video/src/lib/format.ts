import { TIERS, type Tier } from './types';

// 点赞数格式化（PRD §4.1 / §7 / §8 示例：230W、230.5W、120W）
export function formatLikes(n: number): string {
  if (!n || n < 10_000) {
    return n.toLocaleString('en-US');
  }
  const w = n / 10_000;
  const rounded = Math.round(w * 10) / 10;
  // 整数则不带小数，否则保留一位
  return (Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)) + 'W';
}

// 根据点赞数返回命中的最高档位（用于详情页标签/相关推荐排序）
export function tierOf(likes: number): Tier | null {
  let matched: Tier | null = null;
  for (const t of TIERS) {
    if (likes >= t.min) matched = t;
  }
  return matched;
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
