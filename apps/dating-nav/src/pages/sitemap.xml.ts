import type { APIRoute } from 'astro';
import { REGION_SLUGS } from '../lib/regions';

// 动态 sitemap（仅包含确定存在的页面，避免收录低于 SEO 阈值的 404 页）
export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL('https://dating.solong.dpdns.org')).href.replace(/\/$/, '');

  const staticUrls = ['/', '/dating', '/about', '/privacy', '/terms', '/copyright', '/contact'];
  const regionUrls = Object.keys(REGION_SLUGS).map((s) => `/dating/${s}`);
  const urls = [...staticUrls, ...regionUrls];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${base}${u}</loc></url>`)
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
