// 月老连线人物模型（PRD §18）与 DatingProfile → Person 映射。
// Person 仅含公开可展示字段；红线逻辑只保存人物 id，不复制资料（PRD §8）。
import type { DatingProfile } from './dating';

export interface Person {
  id: string;
  name?: string;
  age?: number;
  city?: string;
  gender?: string;
  occupation?: string;
  avatar?: string; // 可选公开头像 URL；为空时前端用生成式占位（不托管/盗链真实图片）
  video?: string;
  tags?: string[];
  introduction?: string;
}

/** 由 dating_profiles 行映射为月老玩法所需的 Person。 */
export function mapProfileToPerson(p: DatingProfile): Person {
  const age = p.birth_year ? new Date().getFullYear() - p.birth_year : undefined;
  let tags: string[] | undefined;
  if (p.tags) {
    try {
      const parsed = JSON.parse(p.tags);
      if (Array.isArray(parsed)) tags = parsed.map(String);
    } catch {
      tags = undefined;
    }
  }
  return {
    id: String(p.id),
    name: p.nickname ?? undefined,
    age,
    city: p.residence_region ?? undefined,
    gender: p.gender ?? undefined,
    occupation: p.occupation ?? undefined,
    avatar: p.avatar ?? undefined,
    video: undefined, // 当前数据模型无视频字段；PRD §14.2 视频为可选增强
    tags,
    introduction: p.introduction ?? undefined,
  };
}
