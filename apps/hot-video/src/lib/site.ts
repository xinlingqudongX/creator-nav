// 站点基础信息与联系方式（PRD §38 合规页）
// ⚠️ 上线前必须把占位信息替换为真实运营主体与可用邮箱
export const SITE = {
  name: 'Hot Video',
  url: 'https://hot.solong.dpdns.org',
  /** 运营主体占位（上线前替换为真实公司/个人名称） */
  operator: '[运营主体名称]',
  /** 运营主体注册地址占位 */
  operatorAddress: '[运营主体注册地址]',
  emails: {
    /** 隐私政策相关 */
    privacy: 'privacy@hot.video',
    /** 版权 / 侵权处理（DMCA 类） */
    copyright: 'dmca@hot.video',
    /** 一般咨询 / 商务合作 */
    contact: 'hello@hot.video',
  },
  /** 文档页“最后更新”日期（上线后随实际修订更新） */
  updated: '2026-08-25',
} as const;
