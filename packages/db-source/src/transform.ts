// 红绳行 → D1 目标行的映射。纯函数，便于单独验证。
// 时间戳约定：红绳库内 created_at/updated_at 为毫秒，D1 统一为秒（与红绳 hot-video-json.ts 的做法一致）。
import type { UserProfileRow, UserPostRow } from './entities.ts';

export const SOURCE = 'douyin';

/** ms → s；>1e12 视为毫秒做除法，<=0 或缺失返回 null */
export function toSeconds(v: number | null | undefined): number | null {
  if (v === null || v === undefined || v <= 0) return null;
  return v > 1e12 ? Math.floor(v / 1000) : Math.floor(v);
}

export function genderLabel(g: number | null | undefined): string | null {
  if (g === 1) return '男';
  if (g === 2) return '女';
  return null;
}

export function intentLevel(score: number): string {
  if (score >= 85) return 'very_strong';
  if (score >= 70) return 'strong';
  if (score >= 50) return 'medium';
  return 'weak';
}

/** 红绳 tags 是 JSON 数组字符串；非法 JSON 时按单标签包装，空值返回 null */
export function normalizeTags(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const tags = parsed.map((t) => String(t).trim()).filter(Boolean);
      return tags.length > 0 ? JSON.stringify(tags) : null;
    }
  } catch {
    // 非法 JSON：按单标签处理
  }
  const s = raw.trim();
  return s ? JSON.stringify([s]) : null;
}

export interface DatingProfileRow {
  source: string;
  source_user_id: string;
  nickname: string | null;
  profile_url: string | null;
  gender: string | null;
  birth_year: number | null;
  ip_region: string | null;
  residence_region: string | null;
  occupation: string | null;
  tags: string | null;
  introduction: string | null;
  avatar: string | null;
  intent_score: number;
  intent_level: string;
  freshness_score: number;
  activity_score: number;
  confidence_score: number;
  intent_updated_at: number | null;
  created_at: number;
  updated_at: number;
}

export function profileToDatingProfile(p: UserProfileRow, nowSec: number): DatingProfileRow {
  const intentScore = p.intent_score ?? 0;
  const residence = [p.city, p.province, p.district]
    .map((s) => s?.trim() || null)
    .find(Boolean) ?? null;
  const updatedSec = toSeconds(p.updated_at);
  return {
    source: SOURCE,
    source_user_id: p.user_id,
    nickname: p.nickname ?? null,
    profile_url: `https://www.douyin.com/user/${p.sec_uid || p.uid || p.user_id}`,
    gender: genderLabel(p.gender),
    birth_year: p.user_age && p.user_age > 0 ? new Date().getFullYear() - p.user_age : null,
    ip_region: p.ip_location?.trim() || null,
    residence_region: residence,
    occupation: null,
    tags: normalizeTags(p.tags),
    introduction: p.signature ?? null,
    avatar: p.user_avatar ?? null,
    intent_score: intentScore,
    intent_level: intentLevel(intentScore),
    freshness_score: 0, // 站点查询层用 updated_at 重算新鲜度，不依赖此列
    activity_score: p.activity_score ?? 0,
    confidence_score: p.confidence ?? 0,
    intent_updated_at: updatedSec,
    created_at: toSeconds(p.created_at) ?? nowSec,
    updated_at: updatedSec ?? nowSec,
  };
}

export interface DatingPostRow {
  profile_user_id: string; // 生成 SQL 时用标量子查询解析 D1 侧 profile_id
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

export function postToDatingPost(
  p: UserPostRow,
  profile: { userId: string; intentScore: number },
  nowSec: number,
): DatingPostRow {
  const summary = (p.desc ?? '').trim();
  const updatedSec = toSeconds(p.updated_at);
  return {
    profile_user_id: profile.userId,
    title: summary ? summary.slice(0, 80) : null,
    content_summary: summary || null,
    source: SOURCE,
    source_post_id: p.id,
    source_url: `https://www.douyin.com/video/${p.id}`,
    published_at: toSeconds(p.create_time),
    likes: p.digg_count ?? 0,
    comments: p.comment_count ?? 0,
    intent_score_snapshot: profile.intentScore,
    created_at: toSeconds(p.created_at) ?? nowSec,
    updated_at: updatedSec ?? nowSec,
  };
}

export interface HotVideoRow {
  source: string;
  source_id: string;
  title: string | null;
  cover_url: string | null;
  video_url: string;
  author_name: string | null;
  author_id: string;
  author_avatar_url: string | null;
  likes: number;
  collects: number;
  publish_time: number;
  collected_time: number;
  created_at: number;
  updated_at: number;
}

export function postToHotVideo(p: UserPostRow, nowSec: number): HotVideoRow {
  const collected = toSeconds(p.created_at) ?? nowSec;
  return {
    source: SOURCE,
    source_id: p.id,
    title: (p.desc ?? '').trim() || null,
    cover_url: p.cover_url ?? null,
    video_url: `https://www.douyin.com/video/${p.id}`,
    author_name: p.author_nickname ?? null,
    author_id: p.author_uid,
    author_avatar_url: p.author_avatar_url ?? null,
    likes: p.digg_count ?? 0,
    collects: p.collect_count ?? 0,
    publish_time: toSeconds(p.create_time) ?? 0,
    collected_time: collected,
    created_at: collected,
    updated_at: toSeconds(p.updated_at) ?? collected,
  };
}
