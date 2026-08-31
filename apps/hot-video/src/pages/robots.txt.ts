import type { APIRoute } from 'astro';

// Robots（PRD §10 / §13）
export const GET: APIRoute = async ({ site, url }) => {
  const base = (site ?? new URL('/', url)).toString().replace(/\/$/, '');
  const txt = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
Sitemap: ${base}/video-sitemap.xml
`;
  return new Response(txt, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
