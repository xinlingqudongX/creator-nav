import type { APIRoute } from 'astro';
import { getVideos } from '../lib/videos';

// 视频 Sitemap（PRD §13）：含缩略图与原始视频地址
export const GET: APIRoute = async ({ site, url }) => {
  const base = (site ?? new URL('/', url)).toString().replace(/\/$/, '');

  const videos = await getVideos({ limit: 100000 });

  const items = videos
    .map((v) => {
      const page = `${base}/video/${v.id}`;
      const thumb = v.cover_url ?? '';
      const content = v.video_url ?? '';
      const title = (v.title ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `  <url>
    <loc>${page}</loc>
    <video:video>
      <video:thumbnail_loc>${thumb}</video:thumbnail_loc>
      <video:title>${title}</video:title>
      <video:content_loc>${content}</video:content_loc>
    </video:video>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${items}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
