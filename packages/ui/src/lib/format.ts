// 通用展示格式化（与具体业务常量解耦，供两站共用）。

/** 点赞/互动数格式化为「W」中文单位（例：230W、230.5W、120W、9,999）。 */
export function formatLikes(n: number): string {
  if (!n || n < 10_000) {
    return n.toLocaleString('en-US');
  }
  const w = n / 10_000;
  const rounded = Math.round(w * 10) / 10;
  return (Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)) + 'W';
}

/** Unix 秒 → YYYY-MM-DD；无效返回「未知」。 */
export function formatDate(unixSec: number | null | undefined): string {
  if (!unixSec) return '未知';
  const d = new Date(unixSec * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Unix 秒 → 相对时间（例：刚刚、3分钟前、2小时前、3天前、日期）。 */
export function formatRelative(unixSec: number | null | undefined): string {
  if (!unixSec) return '未知';
  const diff = Date.now() / 1000 - unixSec;
  if (diff < 0) return formatDate(unixSec);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}天前`;
  return formatDate(unixSec);
}
