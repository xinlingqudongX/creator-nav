// 地区 / 年龄 / 性别 路由与展示辅助（PRD §7–§8、§27–§29、§50）

/** 地区 slug → 中文名（覆盖 30+ 主要城市，PRD §9 常量）。 */
export const REGION_SLUGS: Record<string, string> = {
  beijing: '北京',
  shanghai: '上海',
  guangzhou: '广州',
  shenzhen: '深圳',
  hangzhou: '杭州',
  chengdu: '成都',
  wuhan: '武汉',
  nanjing: '南京',
  xian: '西安',
  suzhou: '苏州',
  tianjin: '天津',
  chongqing: '重庆',
  changsha: '长沙',
  zhengzhou: '郑州',
  qingdao: '青岛',
  dalian: '大连',
  jinan: '济南',
  hefei: '合肥',
  kunming: '昆明',
  xiamen: '厦门',
  fuzhou: '福州',
  wuxi: '无锡',
  ningbo: '宁波',
  foshan: '佛山',
  dongguan: '东莞',
  nanning: '南宁',
  shenyang: '沈阳',
  harbin: '哈尔滨',
  taiyuan: '太原',
  shijiazhuang: '石家庄',
  wenzhou: '温州',
  changzhou: '常州',
};

/** 中文名 → slug（反向查表）。 */
export const REGION_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_SLUGS).map(([slug, name]) => [name, slug])
);

export function isValidRegion(slug: string): boolean {
  return slug in REGION_SLUGS;
}

export function regionName(slug: string): string | null {
  return REGION_SLUGS[slug] ?? null;
}

/** 性别 slug → 中文（存储值）。 */
export const GENDERS: Record<'female' | 'male', string> = {
  female: '女',
  male: '男',
};

export function isValidGender(slug: string): slug is 'female' | 'male' {
  return slug in GENDERS;
}

export function genderLabel(slug: string): string | null {
  return (GENDERS as Record<string, string>)[slug] ?? null;
}

/** 存储值（女/男/其他）→ 展示文案；未知返回「未公开」。 */
export function humanizeGender(g: string | null | undefined): string {
  if (g === '女' || g === '男') return g;
  return '未公开';
}

export type AgeFilter =
  | { kind: 'year'; year: number; label: string; lo: number; hi: number }
  | { kind: 'gen'; lo: number; hi: number; label: string };

/**
 * 解析年龄 URL 段（PRD §7、假设 #4）：
 * - `95` → 1995 年（特定出生年）
 * - `90s` → 90 后（1990–1999）
 * 非法返回 null。
 */
export function parseAgeSlug(slug: string): AgeFilter | null {
  const thisYear = new Date().getFullYear();
  if (/^\d{2}$/.test(slug)) {
    let year = 1900 + parseInt(slug, 10);
    if (year > thisYear) year -= 100;
    return { kind: 'year', year, label: `${year}年`, lo: year, hi: year };
  }
  const m = slug.match(/^(\d{2})s$/);
  if (m) {
    const lo = 1900 + parseInt(m[1], 10);
    return { kind: 'gen', lo, hi: lo + 9, label: `${m[1]}后` };
  }
  return null;
}

/** 出生年是否命中年龄筛选。 */
export function ageMatches(birthYear: number | null | undefined, slug: string): boolean {
  if (!birthYear) return false;
  const f = parseAgeSlug(slug);
  if (!f) return false;
  return birthYear >= f.lo && birthYear <= f.hi;
}

/** 首页 / 筛选表单的年龄下拉选项（PRD §23、§51）。 */
export const AGE_OPTIONS: { value: string; label: string }[] = [
  { value: '95', label: '95年' },
  { value: '90s', label: '90后' },
  { value: '00s', label: '00后' },
  { value: '85s', label: '85后' },
  { value: '10s', label: '10后' },
];

/** 首页 / 筛选表单的性别下拉选项。 */
export const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'female', label: '女性' },
  { value: 'male', label: '男性' },
];

/** 关系目标下拉选项（PRD §23，仅用于前台筛选体验，不入 URL 维度）。 */
export const RELATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'long', label: '长期关系' },
  { value: 'short', label: '短期相处' },
  { value: 'any', label: '都可以' },
];

/** 出生年 → 代际文案（如 1995 → 95后）。 */
export function ageText(birthYear: number | null | undefined): string {
  if (!birthYear) return '年龄未公开';
  const suffix = String(birthYear).slice(2);
  return `${suffix}后`;
}
