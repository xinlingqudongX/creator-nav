// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// 相亲信息导航站：Astro SSR + Cloudflare Pages + D1(DATING_DB)
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  // 站点域名，用于生成 canonical / sitemap / OG 绝对地址（PRD §10-14）
  site: 'https://dating.solong.dpdns.org',
  devToolbar: { enabled: false },
  // 共享包 @creator-nav/ui 含 .astro 组件与 CSS，需由 Vite 直接编译（不被预打包）
  vite: {
    ssr: {
      noExternal: ['@creator-nav/ui'],
    },
  },
});
