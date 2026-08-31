// D1 访问工具（Astro 7 + @astrojs/cloudflare@14 适配）。
//
// Astro 7 已废弃 `Astro.locals.runtime.env`，官方推荐通过 `cloudflare:workers`
// 模块读取绑定。非 CF 运行时（纯 Node / 构建期 / 未配置 D1）导入会失败，
// 这里捕获并返回 null，由调用方回退到本地 JSON。

/** D1 数据库最小接口（避免引入 @cloudflare/workers-types 依赖）。 */
export interface D1Database {
  prepare(query: string): {
    bind(...values: unknown[]): {
      all<T = unknown>(): Promise<{ results: T[] }>;
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
}

/** 按绑定名（如 VIDEO_DB / DATING_DB）获取 D1 实例；不可用返回 null。 */
export async function getDb(binding: string): Promise<D1Database | null> {
  try {
    const mod = await import('cloudflare:workers');
    const env = (mod as { env?: Record<string, unknown> })?.env;
    const db = env?.[binding] as D1Database | undefined;
    return db ?? null;
  } catch {
    return null;
  }
}
