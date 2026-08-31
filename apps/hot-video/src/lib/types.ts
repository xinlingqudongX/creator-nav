// PRD §15.1 / §18 视频数据模型
export interface Video {
  id: number;
  source: string;
  source_id: string;
  title: string | null;
  author_name: string | null;
  author_id: string | null;
  author_avatar_url: string | null;
  cover_url: string | null;
  video_url: string;
  likes: number;
  collects: number;
  publish_time: number | null; // unix 秒
  collected_time: number | null; // unix 秒
  created_at: number;
  updated_at: number;
}

// 热度档位（PRD §3.2 / §4.1 / §9）—— 按收藏数分档，每档为半开区间 [min, max)
export interface Tier {
  key: string; // 路由片段，如 1w
  label: string; // 导航文案，如 1W+
  min: number; // 收藏数下限（含）
  max: number | null; // 收藏数上限（不含）；null 表示最高档，无上界
  title: string; // SEO / H1 标题
  range: string; // 人类可读区间文案，如 "1万 – 5万" / "20万以上"
}

export const TIERS: Tier[] = [
  { key: '1w',  label: '1W+',  min: 10_000,  max: 50_000,  title: '1万-5万收藏热门短视频',  range: '1 万 – 5 万' },
  { key: '5w',  label: '5W+',  min: 50_000,  max: 100_000, title: '5万-10万收藏热门短视频', range: '5 万 – 10 万' },
  { key: '10w', label: '10W+', min: 100_000, max: 150_000, title: '10万-15万收藏热门短视频', range: '10 万 – 15 万' },
  { key: '15w', label: '15W+', min: 150_000, max: 200_000, title: '15万-20万收藏热门短视频', range: '15 万 – 20 万' },
  { key: '20w', label: '20W+', min: 200_000, max: null,    title: '20万以上收藏热门短视频',   range: '20 万以上' },
];

// 顶部导航项（PRD §4.1 / §9）
export const NAV_ITEMS: { label: string; href: string }[] = [
  { label: '热门', href: '/' },
  ...TIERS.map((t) => ({ label: t.label, href: `/${t.key}` })),
  { label: '今日', href: '/today' },
  { label: '本周', href: '/week' },
];
