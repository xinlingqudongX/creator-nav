// 生成式占位头像（PRD §14.1 + 合规边界）：不托管/盗链真实图片。
// 由 id 派生稳定色相，取昵称首字；无昵称时用心形。

export interface AvatarInfo {
  initial: string;
  bg: string;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarInfo(id: string, name?: string): AvatarInfo {
  const hue = hashStr(id) % 360;
  const hue2 = (hue + 38) % 360;
  const initial = name && name.trim() ? name.trim().slice(0, 1) : '❤';
  const bg = `linear-gradient(135deg, hsl(${hue} 68% 64%), hsl(${hue2} 70% 52%))`;
  return { initial, bg };
}
