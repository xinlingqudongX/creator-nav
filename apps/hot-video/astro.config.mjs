// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // PRD §22-25：Worker + D1 + Cache 架构，页面按需 SSR，由 Cloudflare Cache 命中返回
  output: 'server',
  adapter: cloudflare({
    // 启用 Image 服务能力（后续封面 WebP/AVIF 阶段可用）
    imageService: 'compile',
  }),
  // 站点域名，用于生成 canonical / sitemap / OG 绝对地址（PRD §10-14）
  site: 'https://hot.solong.dpdns.org',
  devToolbar: { enabled: false },
  // 共享包 @creator-nav/ui 含 .astro 组件与 CSS，需由 Vite 直接编译（不被预打包）
  vite: {
    ssr: {
      noExternal: ['@creator-nav/ui'],
    },
  },
});
