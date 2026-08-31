// 月老红线 Canvas 动效（PRD §11–§13）：轻、快、局部、服务于红线。
// A→B 贝塞尔微弯红线 + 粒子 300–800ms；尊重 prefers-reduced-motion（直接静态线）。

const RED = '#e11d48';

interface Pt {
  x: number;
  y: number;
}

function controlPoint(a: Pt, b: Pt): Pt {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // 垂直方向轻微偏移，形成曲率很小的弧线（PRD §12）
  const off = Math.min(42, len * 0.12);
  return { x: mx - (dy / len) * off, y: my + (dx / len) * off };
}

function quadAt(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function resize(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  const parent = canvas.parentElement;
  if (!parent) return null;
  const rect = parent.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

function centers(from: DOMRect, to: DOMRect, origin: DOMRect): { a: Pt; b: Pt } {
  return {
    a: { x: from.left + from.width / 2 - origin.left, y: from.top + from.height / 2 - origin.top },
    b: { x: to.left + to.width / 2 - origin.left, y: to.top + to.height / 2 - origin.top },
  };
}

function strokeFull(ctx: CanvasRenderingContext2D, a: Pt, b: Pt): void {
  const c = controlPoint(a, b);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
  ctx.stroke();
}

function drawStatic(canvas: HTMLCanvasElement, from: DOMRect, to: DOMRect): void {
  const dim = resize(canvas);
  if (!dim) return;
  const { ctx, w, h } = dim;
  ctx.clearRect(0, 0, w, h);
  const { a, b } = centers(from, to, canvas.parentElement!.getBoundingClientRect());
  strokeFull(ctx, a, b);
}

function burst(ctx: CanvasRenderingContext2D, at: Pt): void {
  // 少量粒子扩散后迅速消失（PRD §13：5–20 个，单次效果）
  const count = 12;
  const parts = Array.from({ length: count }, () => {
    const ang = (Math.PI * 2 * Math.random());
    const sp = 18 + Math.random() * 26;
    return { x: at.x, y: at.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1 };
  });
  const start = performance.now();
  const dur = 420;
  function frame(t: number): void {
    const p = Math.min(1, (t - start) / dur);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (const pt of parts) {
      pt.x += pt.vx * 0.04;
      pt.y += pt.vy * 0.04;
      pt.life = 1 - p;
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/** 绘制红线。animate=true 时播放粒子 + 生成动画（≤800ms），否则直接静态线。 */
export function drawLine(canvas: HTMLCanvasElement, from: DOMRect, to: DOMRect, opts: { animate?: boolean } = {}): void {
  const dim = resize(canvas);
  if (!dim) return;
  const { ctx, w, h } = dim;
  const origin = canvas.parentElement!.getBoundingClientRect();
  const { a, b } = centers(from, to, origin);

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || opts.animate === false) {
    ctx.clearRect(0, 0, w, h);
    strokeFull(ctx, a, b);
    return;
  }

  const start = performance.now();
  const dur = 620;
  function frame(t: number): void {
    const p = Math.min(1, (t - start) / dur);
    const e = easeInOut(p);
    ctx.clearRect(0, 0, w, h);
    const cur = quadAt(a, controlPoint(a, b), b, e);
    // 已生成的部分曲线
    ctx.strokeStyle = RED;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(controlPoint(a, b).x, controlPoint(a, b).y, cur.x, cur.y);
    ctx.stroke();
    // 行进粒子
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(cur.x, cur.y, 5, 0, Math.PI * 2);
    ctx.fill();
    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      // 完成：静态红线 + 末端粒子扩散
      strokeFull(ctx, a, b);
      burst(ctx, b);
    }
  }
  requestAnimationFrame(frame);
}
