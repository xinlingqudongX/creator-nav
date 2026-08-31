// 相亲信息导航查询层（PRD §9、§18、§23–§34）
//
// 数据来源：Cloudflare D1（绑定 DATING_DB）优先；非 CF 运行时回退到本地 JSON。
// MVP 规模下采用「拉取全集 → 内存过滤 / 排序」策略，避免游标分页与双路 SQL 的复杂度。

import type { D1Database } from '@creator-nav/ui/lib/d1';
import { getDb } from '@creator-nav/ui/lib/d1';
import { intentLevel, freshnessLevel, daysSince, isActiveRecent } from './scoring';
import { REGION_SLUGS, GENDERS, ageMatches } from './regions';
import { mapProfileToPerson, type Person } from './person';
import fallbackProfiles from '../data/dating-profiles.json';
import fallbackPosts from '../data/dating-posts.json';

/** SEO 页面生成阈值（PRD §30、计划 §9）：单维度 3 / 组合(≥2 维度) 5。 */
export const SEO_THRESHOLDS = {
  single: 3,
  combo: 5,
} as const;

/** 给定筛选维度数量，返回该页生成所需的最低数据量。 */
export function thresholdFor(dimensionCount: number): number {
  return dimensionCount >= 2 ? SEO_THRESHOLDS.combo : SEO_THRESHOLDS.single;
}

export interface DatingProfile {
  id: number;
  source: string;
  source_user_id: string;
  nickname: string | null;
  profile_url: string | null;
  gender: string | null;
  birth_year: number | null;
  ip_region: string | null;
  residence_region: string | null;
  // 月老玩法「可判断性」辅助字段（PRD §18，B 级公开数据）
  occupation: string | null;
  tags: string | null; // JSON 数组字符串，如 '["爱旅行","猫奴"]'
  introduction: string | null;
  avatar: string | null; // 可选公开头像 URL；MVP 为空 → 生成式占位
  intent_score: number;
  intent_level: string | null;
  freshness_score: number;
  activity_score: number;
  confidence_score: number;
  intent_updated_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface DatingPost {
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

export interface DatingFilters {
  region?: string;
  age?: string;
  gender?: string;
}

const FALLBACK_LIMIT = 5000;

async function fetchProfiles(): Promise<DatingProfile[]> {
  const db = await getDb('DATING_DB');
  if (db) {
    try {
      const res = await db
        .prepare(`SELECT * FROM dating_profiles ORDER BY intent_score DESC, updated_at DESC LIMIT ${FALLBACK_LIMIT}`)
        .all<DatingProfile>();
      if (res.results?.length) return res.results;
    } catch (e) {
      console.warn('[dating] D1 profiles query failed, fallback to local JSON:', e);
    }
  }
  return fallbackProfiles as unknown as DatingProfile[];
}

async function fetchPosts(): Promise<DatingPost[]> {
  const db = await getDb('DATING_DB');
  if (db) {
    try {
      const res = await db
        .prepare(`SELECT * FROM dating_posts ORDER BY published_at DESC LIMIT ${FALLBACK_LIMIT}`)
        .all<DatingPost>();
      if (res.results?.length) return res.results;
    } catch (e) {
      console.warn('[dating] D1 posts query failed, fallback to local JSON:', e);
    }
  }
  return fallbackPosts as unknown as DatingPost[];
}

/** 按个人主页聚合帖子，便于计算活跃度 / 时间线。 */
async function postsByProfile(): Promise<Map<number, DatingPost[]>> {
  const posts = await fetchPosts();
  const map = new Map<number, DatingPost[]>();
  for (const post of posts) {
    const arr = map.get(post.profile_id);
    if (arr) arr.push(post);
    else map.set(post.profile_id, [post]);
  }
  return map;
}

function matchProfile(p: DatingProfile, filters: DatingFilters): boolean {
  if (filters.region) {
    const name = REGION_SLUGS[filters.region];
    if (!name) return false;
    if (p.residence_region !== name && p.ip_region !== name) return false;
  }
  if (filters.age && !ageMatches(p.birth_year, filters.age)) return false;
  if (filters.gender) {
    const g = (GENDERS as Record<string, string>)[filters.gender];
    if (!g || p.gender !== g) return false;
  }
  return true;
}

/** 排序分：意愿 × 新鲜度 × 活跃度 的加权组合（PRD §25）。 */
function rankScore(p: DatingProfile): number {
  const intent = p.intent_score ?? 0;
  const fresh = freshnessLevel(daysSince(p.updated_at)).score;
  const active = p.activity_score ?? 0;
  return intent * 0.5 + fresh * 0.3 + active * 0.2;
}

export async function queryProfiles(
  filters: DatingFilters = {},
  opts: { limit?: number; offset?: number } = {}
): Promise<{ profiles: DatingProfile[]; total: number }> {
  const all = await fetchProfiles();
  const filtered = all.filter((p) => matchProfile(p, filters));
  const total = filtered.length;
  const sorted = filtered
    .slice()
    .sort((a, b) => rankScore(b) - rankScore(a) || (b.updated_at ?? 0) - (a.updated_at ?? 0));
  const limit = opts.limit ?? 60;
  const offset = opts.offset ?? 0;
  return { profiles: sorted.slice(offset, offset + limit), total };
}

export interface DatingStats {
  total: number;
  intentStrong: number;
  newToday: number;
  active: number;
}

const startOfTodaySec = (): number =>
  Math.floor(new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000);

/** 统计：总数 / 近期意愿较强 / 今日新增 / 近期持续活跃（PRD §21、§24）。 */
export async function getStats(filters: DatingFilters = {}): Promise<DatingStats> {
  const { profiles } = await queryProfiles(filters, { limit: FALLBACK_LIMIT });
  const byProfile = await postsByProfile();
  const startToday = startOfTodaySec();
  let intentStrong = 0;
  let newToday = 0;
  let active = 0;
  for (const p of profiles) {
    if ((p.intent_score ?? 0) >= 75) intentStrong++;
    if ((p.updated_at ?? 0) >= startToday) newToday++;
    const posts = byProfile.get(p.id) ?? [];
    const latestDays = posts.reduce(
      (min, pp) => Math.min(min, daysSince(pp.published_at)),
      9999
    );
    if (isActiveRecent(posts.length, latestDays)) active++;
  }
  return { total: profiles.length, intentStrong, newToday, active };
}

export interface RegionBreakdown {
  ages: { slug: string; label: string; count: number }[];
  genders: { slug: string; label: string; count: number }[];
}

/** 地区页子维度拆分（年龄 / 性别）计数，用于生成子链接与统计。 */
export async function regionBreakdown(region: string): Promise<RegionBreakdown> {
  const all = await fetchProfiles();
  const name = REGION_SLUGS[region];
  const inRegion = all.filter(
    (p) => name != null && (p.residence_region === name || p.ip_region === name)
  );
  const ages: RegionBreakdown['ages'] = [];
  for (const opt of ['95', '90s', '00s', '85s', '10s'] as const) {
    const count = inRegion.filter((p) => ageMatches(p.birth_year, opt)).length;
    const label = opt === '95' ? '95年' : `${opt.replace('s', '')}后`;
    ages.push({ slug: opt, label, count });
  }
  const genders: RegionBreakdown['genders'] = [];
  for (const [slug, label] of Object.entries(GENDERS)) {
    const count = inRegion.filter((p) => p.gender === label).length;
    genders.push({ slug, label, count });
  }
  return { ages, genders };
}

export async function getProfileById(id: number): Promise<DatingProfile | null> {
  const all = await fetchProfiles();
  return all.find((p) => p.id === id) ?? null;
}

/** 月老连线人物池：全量 Person（PRD §18）。供客户端选候选 B 使用。 */
export async function getAllPeople(): Promise<Person[]> {
  const all = await fetchProfiles();
  return all.map(mapProfileToPerson);
}

export async function getPostById(id: number): Promise<{ post: DatingPost; profile: DatingProfile | null } | null> {
  const posts = await fetchPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) return null;
  const profile = await getProfileById(post.profile_id);
  return { post, profile };
}

/** 个人公开动态时间线（PRD §34）：仅展示与相亲需求直接相关的公开内容，按时间倒序。 */
export async function getPostsByProfile(profileId: number): Promise<DatingPost[]> {
  const byProfile = await postsByProfile();
  return (byProfile.get(profileId) ?? []).slice().sort(
    (a, b) => (b.published_at ?? 0) - (a.published_at ?? 0)
  );
}

export function humanizeGender(g: string | null | undefined): string {
  if (g === '女' || g === '男') return g;
  return '未公开';
}
