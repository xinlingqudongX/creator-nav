// 月老连线主逻辑（PRD §6、§15.3、§16）：取人物池 → A 固定、B 随机可换 → 牵红线（本地保存 + Canvas 动效）→ 导出。
import { loadLines, addLine } from './moon-store';
import { drawLine } from './moon-canvas';
import { personCardHTML } from '../lib/moon-card';
import type { Person } from '../lib/person';

const $ = (id: string) => document.getElementById(id);

const stage = $('moon-stage');
const slotB = $('moon-b');
const canvas = $('moon-canvas') as HTMLCanvasElement | null;
const tieBtn = $('moon-tie') as HTMLButtonElement | null;
const nextBtn = $('moon-next') as HTMLButtonElement | null;
const exportBtn = $('moon-export') as HTMLButtonElement | null;
const countEl = $('moon-count');
const hintEl = $('moon-hint');

const aEl = stage?.querySelector('#moon-a .moon-person') as HTMLElement | null;
const aId = aEl?.dataset.id ?? '';
const aName = aEl?.querySelector('.moon-person__name')?.textContent?.split(' ')[0] ?? 'TA';

let pool: Person[] = [];
let currentB: Person | null = null;
let count = 0;

function avatarRect(root: HTMLElement | null): DOMRect | null {
  const el = root?.querySelector('.moon-person__avatar');
  return el ? el.getBoundingClientRect() : null;
}

function updateCount(): void {
  if (countEl) countEl.textContent = `已牵 ${count} 条`;
}

function clearCanvas(): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function redrawStatic(): void {
  if (!canvas || !currentB) return;
  const ar = avatarRect(aEl);
  const br = avatarRect(slotB?.querySelector('.moon-person') ?? null);
  if (ar && br) drawLine(canvas, ar, br, { animate: false });
}

function nextB(): void {
  if (!slotB) return;
  if (pool.length === 0) {
    slotB.innerHTML = '<div class="moon-person moon-person--empty">没有更多候选人了</div>';
    currentB = null;
    return;
  }
  let pick: Person = pool[0];
  let guard = 0;
  do {
    pick = pool[Math.floor(Math.random() * pool.length)];
    guard++;
  } while (currentB && pick.id === currentB.id && pool.length > 1 && guard < 20);
  currentB = pick;
  slotB.innerHTML = personCardHTML(pick);
  clearCanvas();
  if (hintEl) hintEl.textContent = '';
}

async function tie(): Promise<void> {
  if (!currentB || !canvas) return;
  const { existed, data } = await addLine(aId, currentB.id);
  count = data.lines.length;
  updateCount();
  const ar = avatarRect(aEl);
  const br = avatarRect(slotB?.querySelector('.moon-person') ?? null);
  if (ar && br) drawLine(canvas, ar, br, { animate: true });
  if (hintEl) {
    hintEl.textContent = existed
      ? `已经给 ${aName} 和 ${currentB.name ?? 'TA'} 牵过线 ❤️ 仍可继续查看双方资料`
      : `❤️ 已为 ${aName} 和 ${currentB.name ?? 'TA'} 牵线，再找一个？`;
  }
}

function exportLines(): void {
  loadLines().then((d) => {
    const name = `moon-lines-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

async function init(): Promise<void> {
  if (!stage || !aId) return;
  try {
    const res = await fetch('/api/people');
    const json = (await res.json()) as { people: Person[] };
    pool = (json.people ?? []).filter((p) => p.id !== aId);
  } catch {
    pool = [];
  }
  const data = await loadLines();
  count = data.lines.length;
  updateCount();
  nextB();
  window.addEventListener('resize', redrawStatic);
}

tieBtn?.addEventListener('click', () => void tie());
nextBtn?.addEventListener('click', nextB);
exportBtn?.addEventListener('click', exportLines);
void init();
