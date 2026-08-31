import type { APIRoute } from 'astro';
import { getVideos } from '../lib/videos';
import { TIERS } from '../lib/types';

// 聚合页 Sitemap（PRD §10.1 / §13）
export const GET: APIRoute = async ({ site, url }) => {
  const base = (site ?? new URL('/', url)).toString().replace(/\/$/, '');

  const videos = await getVideos({ limit: 100000 });

  // 固定聚合页
  const staticPaths = [
    '',
    ...TIERS.map((t) => `/${t.key}`),
    '/today',
    '/week',
    // 合规 / 基础页面（PRD §38）
    '/about',
    '/privacy',
    '/terms',
    '/copyright',
    '/contact',
  ];

  // 由数据派生年/月聚合页
  const years = new Set<string>();
  const months = new Set<string>();
  for (const v of videos) {
    if (!v.publish_time) continue;
    const d = new Date(v.publish_time * 1000);
    const y = `${d.getFullYear()}`;
    const ym = `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    years.add(y);
    months.add(ym);
  }
  const yearPaths = [...years].map((y) => `/year/${y}`);
  const monthPaths = [...months].map((ym) => `/year/${ym.replace('-', '/')}`);

  const allPaths = [...new Set([...staticPaths, ...yearPaths, ...monthPaths])];
  const urls = allPaths.map((p) => `  <url><loc>${base}${p || '/'}</loc></url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
