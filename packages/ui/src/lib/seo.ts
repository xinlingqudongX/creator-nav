// SEO 辅助（纯函数，不依赖 Astro 全局），供 SiteLayout / 页面调用。

/** 构造绝对 canonical / og:url 地址。 */
export function buildCanonical(path: string, base: string | URL): string {
  const baseHref = typeof base === 'string' ? base : base.href;
  try {
    return new URL(path, baseHref).href;
  } catch {
    return path;
  }
}

/** 将相对 OG 图片解析为绝对地址；已是绝对地址则原样返回；无则 null。 */
export function buildOgImage(
  ogImage: string | null | undefined,
  base: string | URL
): string | null {
  if (!ogImage) return null;
  if (/^https?:\/\//i.test(ogImage)) return ogImage;
  const baseHref = typeof base === 'string' ? base : base.href;
  try {
    return new URL(ogImage, baseHref).href;
  } catch {
    return ogImage;
  }
}
