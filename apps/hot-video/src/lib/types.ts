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

// 热度档位（PRD §3.2 / §4.1 / §9）—— 基于收藏数
export interface Tier {
  key: string; // 路由片段，如 1w
  label: string; // 导航文案，如 1W+
  min: number; // 最低收藏数
  title: string; // SEO 标题
}

export const TIERS: Tier[] = [
  { key: '1w', label: '1W+', min: 10_000, title: '1万+收藏热门短视频' },
  { key: '2w', label: '2W+', min: 20_000, title: '2万+收藏热门短视频' },
  { key: '3w', label: '3W+', min: 30_000, title: '3万+收藏热门短视频' },
  { key: '5w', label: '5W+', min: 50_000, title: '5万+收藏热门短视频' },
];

// 顶部导航项（PRD §4.1 / §9）
export const NAV_ITEMS: { label: string; href: string }[] = [
  { label: '热门', href: '/' },
  ...TIERS.map((t) => ({ label: t.label, href: `/${t.key}` })),
  { label: '今日', href: '/today' },
  { label: '本周', href: '/week' },
];
