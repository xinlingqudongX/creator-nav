// 月老人物卡 HTML（服务端/客户端共用，保证 A 卡与 B 卡渲染一致）。
import { avatarInfo } from './moon-avatar';
import type { Person } from './person';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 生成人物卡 HTML 字符串（含生成式头像、年龄/城市/性别、职业、标签、自我介绍、主页链接）。 */
export function personCardHTML(p: Person): string {
  const av = avatarInfo(p.id, p.name);
  const meta = [p.age ? `${p.age}岁` : null, p.city, p.gender].filter(Boolean).join(' · ');
  const tags = (p.tags ?? [])
    .map((t) => `<li>${escapeHtml(t)}</li>`)
    .join('');
  return `
  <div class="moon-person" data-id="${escapeHtml(p.id)}">
    <div class="moon-person__avatar" style="background:${av.bg}">${escapeHtml(av.initial)}</div>
    <div class="moon-person__body">
      <h3 class="moon-person__name">${escapeHtml(p.name ?? '公开用户')}${
        meta ? ` <span class="moon-person__meta">${escapeHtml(meta)}</span>` : ''
      }</h3>
      ${p.occupation ? `<p class="moon-person__occupation">${escapeHtml(p.occupation)}</p>` : ''}
      ${tags ? `<ul class="moon-person__tags">${tags}</ul>` : ''}
      ${p.introduction ? `<p class="moon-person__intro">${escapeHtml(p.introduction)}</p>` : ''}
      <a class="moon-person__link" href="/profile/${escapeHtml(p.id)}">查看公开主页 →</a>
    </div>
  </div>`;
}
