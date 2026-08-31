// PRD §15.1 / §18 视频数据模型
export interface Video {
  id: number;
  source: string;
  source_id: string;
  title: string | null;
  author_name: string | null;
  author_id: string | null;
  cover_url: string | null;
  video_url: string;
  likes: number;
  publish_time: number | null; // unix 秒
  collected_time: number | null; // unix 秒
  created_at: number;
  updated_at: number;
}

// 热度档位（PRD §3.2 / §4.1 / §9）
export interface Tier {
  key: string; // 路由片段，如 20w
  label: string; // 导航文案，如 20W+
  min: number; // 最低点赞
  title: string; // SEO 标题
}

export const TIERS: Tier[] = [
  { key: '20w', label: '20W+', min: 200_000, title: '20万+点赞热门短视频' },
  { key: '50w', label: '50W+', min: 500_000, title: '50万+点赞热门短视频' },
  { key: '100w', label: '100W+', min: 1_000_000, title: '100万+点赞热门短视频' },
  { key: '500w', label: '500W+', min: 5_000_000, title: '500万+点赞热门短视频' },
  { key: '1000w', label: '1000W+', min: 10_000_000, title: '1000万+点赞热门短视频' },
];

// 顶部导航项（PRD §4.1 / §9）
export const NAV_ITEMS: { label: string; href: string }[] = [
  { label: '热门', href: '/' },
  ...TIERS.map((t) => ({ label: t.label, href: `/${t.key}` })),
  { label: '今日', href: '/today' },
  { label: '本周', href: '/week' },
];
