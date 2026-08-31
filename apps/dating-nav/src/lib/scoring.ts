// 相亲意愿评分与展示辅助（PRD §11–§16、§19–§22）
//
// 评分只在后台用于排序 / 推荐，前台优先表现语义化状态（🔥 正在认真找对象 等）。
// 系统评价「公开内容表现出的相亲意愿与活跃状态」，不评价个人价值（PRD §4.1）。

/** 意愿评分权重（合计 100，PRD §12）。 */
export const INTENT_WEIGHTS = {
  /** 明确表达相亲/找对象意愿 */
  express: 30,
  /** 明确描述寻找对象 */
  describe: 20,
  /** 相亲相关信息完整度 */
  completeness: 15,
  /** 发布时间新鲜度 */
  freshness: 15,
  /** 公开互动信号 */
  interaction: 10,
  /** 近期多次发布相关内容 */
  activity: 10,
} as const;

export type IntentLevelKey = 'very_strong' | 'strong' | 'medium' | 'weak';

export interface IntentLevel {
  key: IntentLevelKey;
  /** 分数下限（含） */
  min: number;
  label: string;
  emoji: string;
}

/** 意愿等级（PRD §13）。 */
export const INTENT_LEVELS: IntentLevel[] = [
  { key: 'very_strong', min: 90, label: '很强', emoji: '🔥' },
  { key: 'strong', min: 75, label: '较强', emoji: '🟢' },
  { key: 'medium', min: 50, label: '一般', emoji: '🟡' },
  { key: 'weak', min: 0, label: '较低', emoji: '⚪' },
];

/** 按分数返回意愿等级。 */
export function intentLevel(score: number | null | undefined): IntentLevel {
  const s = score ?? 0;
  for (const lvl of INTENT_LEVELS) {
    if (s >= lvl.min) return lvl;
  }
  return INTENT_LEVELS[INTENT_LEVELS.length - 1];
}

/** 卡片主标题文案（PRD §19–§20）。 */
export function intentHeadline(score: number | null | undefined): string {
  const lvl = intentLevel(score);
  switch (lvl.key) {
    case 'very_strong':
      return '正在认真找对象';
    case 'strong':
      return '相亲意愿较强';
    case 'medium':
      return '有一定相亲意愿';
    default:
      return '相亲意愿较低';
  }
}

export type FreshnessKey = 'high' | 'higher' | 'normal' | 'lower' | 'low';

export interface FreshnessLevel {
  key: FreshnessKey;
  label: string;
  /** 0–100 用于排序的归一化分数 */
  score: number;
}

/** 新鲜度等级（PRD §15）。 */
export function freshnessLevel(days: number): FreshnessLevel {
  if (days <= 3) return { key: 'high', label: '高', score: 100 };
  if (days <= 7) return { key: 'higher', label: '较高', score: 85 };
  if (days <= 30) return { key: 'normal', label: '一般', score: 60 };
  if (days <= 90) return { key: 'lower', label: '较低', score: 35 };
  return { key: 'low', label: '低', score: 15 };
}

/** 距今天数（基于 updated_at / published_at 的 unix 秒）。 */
export function daysSince(unixSec: number | null | undefined): number {
  if (!unixSec) return 9999;
  return Math.max(0, Math.floor((Date.now() / 1000 - unixSec) / 86400));
}

/** 近期是否持续活跃：同一公开账号近期多次出现相亲相关内容（PRD §16）。 */
export function isActiveRecent(postCount: number, latestDays: number): boolean {
  return postCount >= 2 && latestDays <= 30;
}

/**
 * 「为什么值得看」解释项（PRD §14、§22）。
 * 返回语义化理由列表，供详情页 / 卡片展开展示。
 */
export function whyWorthIt(opts: {
  intentScore: number | null | undefined;
  freshDays: number;
  active: boolean;
  relationGoal?: string | null;
}): string[] {
  const reasons: string[] = [];
  const lvl = intentLevel(opts.intentScore);
  if (lvl.key === 'very_strong' || lvl.key === 'strong') {
    reasons.push('明确表达找对象意愿');
  } else if (lvl.key === 'medium') {
    reasons.push('信息与相亲需求相关');
  }
  if (opts.freshDays <= 3) reasons.push('刚刚发布');
  else if (opts.freshDays <= 7) reasons.push('近期发布');
  if (opts.active) reasons.push('近期持续活跃');
  if (opts.relationGoal) reasons.push(`明确寻找${opts.relationGoal}`);
  return reasons;
}
