// 生成相亲信息导航站本地回退示例数据（dating-profiles.json / dating-posts.json）。
// 仅用于开发预览与 SEO 阈值验证；生产数据由 Electron 采集 → JSON → import.sql → D1 导入。
// 运行：node scripts/gen-sample.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../src/data');
mkdirSync(dataDir, { recursive: true });

const NOW = Math.floor(Date.now() / 1000);
const day = 86400;

const REGIONS = [
  { slug: 'hangzhou', name: '杭州', province: '浙江' },
  { slug: 'shanghai', name: '上海', province: '上海' },
  { slug: 'beijing', name: '北京', province: '北京' },
  { slug: 'shenzhen', name: '深圳', province: '广东' },
  { slug: 'guangzhou', name: '广州', province: '广东' },
  { slug: 'chengdu', name: '成都', province: '四川' },
];

const SOURCES = ['douyin', 'xiaohongshu', 'weibo'];
const NICK_F = ['小鹿', '阿橙', '柚子', '糖糖', '安然', '七七', '木木', '小满'];
const NICK_M = ['阿建', '星辰', '川哥', '大林', '子谦', '阿哲', '小宇', '石头'];
const BIRTH = [1995, 1992, 1998, 1990, 2000, 1996, 1988, 1993];

// 月老玩法“可判断性”所需的 B 级公开辅助字段（PRD §18）。均为公开可展示信息，不含任何联系方式。
// 真实数据由来源提供；此处为示例数据生成可信内容，使 MVP 可玩。
const OCCUPATIONS = [
  '互联网产品', '小学老师', '平面设计', '护士', '咖啡师', '新媒体运营',
  '软件工程师', '健身教练', '摄影师', '财务', '医生', '建筑设计师',
  '法务', '餐饮创业', '自由撰稿人', '外贸跟单',
];
const TAGS_POOL = [
  '爱旅行', '猫奴', '健身', '电影控', '做饭党', '读书', '露营', '民谣',
  '跑步', '摄影', '二次元', '养生', '咖啡', '羽毛球', '滑雪', '话剧',
];
const INTRO_F = [
  '性格慢热但熟了话多，周末喜欢逛展和探店，希望找个能一起散步聊天的人。',
  '在杭州工作三年，圈子不大，想认真找个三观合、能互相兜底的对象。',
  '独立、有点倔，喜欢有主见的人。不介意异地，介意敷衍。',
];
const INTRO_M = [
  '平时话不多但靠谱，周末爱打球或宅家看片，想找性格合拍、能聊到一块的人。',
  '北漂打工人，工作稳定，顾家型，希望对方简单真诚就好。',
  '有点社恐但朋友说我很暖，期待一段稳定长久的关系，非诚勿扰。',
];

function pick(arr, seed) {
  return arr[seed % arr.length];
}
function pickTags(seed) {
  // 取 3 个不重复标签
  const out = [];
  let k = seed;
  while (out.length < 3) {
    const t = TAGS_POOL[k % TAGS_POOL.length];
    if (!out.includes(t)) out.push(t);
    k += 5;
  }
  return out;
}

function intentLevelOf(s) {
  if (s >= 90) return 'very_strong';
  if (s >= 75) return 'strong';
  if (s >= 50) return 'medium';
  return 'weak';
}
function freshnessScore(days) {
  if (days <= 3) return 100;
  if (days <= 7) return 85;
  if (days <= 30) return 60;
  if (days <= 90) return 35;
  return 15;
}
function ageText(y) {
  return `${String(y).slice(2)}后`;
}

const profiles = [];
const posts = [];
let pid = 0;
let postId = 0;

for (const region of REGIONS) {
  for (let i = 0; i < 6; i++) {
    pid += 1;
    const gender = i % 2 === 0 ? '女' : '男';
    const birth_year = BIRTH[(pid + i) % BIRTH.length];
    const source = SOURCES[(pid + i) % SOURCES.length];
    const source_user_id = `${source}_${region.slug}_${1000 + pid}`;
    // 意愿分：保证每个地区都有高/中/低分布，使组合页超过阈值
    const intent_score = [96, 82, 68, 54, 38, 12][i % 6];
    const intent_level = intentLevelOf(intent_score);
    const updDays = [1, 2, 4, 9, 18, 40][i % 6];
    const updated_at = NOW - updDays * day;
    const created_at = NOW - (60 + i * 7) * day;
    const freshness_score = freshnessScore(updDays);
    const postCount = i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 3;
    const activity_score = postCount >= 2 ? 70 + (postCount - 2) * 10 : 35;
    const confidence_score = 60 + ((pid * 7) % 35);
    const nickname = (gender === '女' ? NICK_F : NICK_M)[i % 8] + (100 + pid);
    const occupation = pick(OCCUPATIONS, pid + (gender === '女' ? 0 : 3));
    const tags = pickTags(pid);
    const introduction = (gender === '女' ? INTRO_F : INTRO_M)[pid % 3];

    profiles.push({
      id: pid,
      source,
      source_user_id,
      nickname,
      profile_url: `https://${source}.example.com/u/${source_user_id}`,
      gender,
      birth_year,
      ip_region: i % 2 === 0 ? region.province : region.name,
      residence_region: region.name,
      // 月老玩法辅助字段（B 级公开数据，PRD §18）。avatar 留空 → 前端生成式占位，不托管/盗链真实图片。
      occupation,
      tags,
      introduction,
      avatar: null,
      intent_score,
      intent_level,
      freshness_score,
      activity_score,
      confidence_score,
      intent_updated_at: updated_at,
      created_at,
      updated_at,
    });

    const relationGoal = ['长期关系', '长期关系', '短期相处', '都可以'][i % 4];
    for (let k = 0; k < postCount; k++) {
      postId += 1;
      const pubDays = updDays + k * 3;
      const published_at = NOW - pubDays * day;
      const title = `${ageText(birth_year)}·${region.name}${gender === '女' ? '女生' : '男生'}认真找对象`;
      const content_summary =
        k === 0
          ? `本人${ageText(birth_year)}，${region.name}工作定居，想找${relationGoal === '都可以' ? '合适的你' : relationGoal + '的对象'}。性格真诚，希望遇到同频的人，非诚勿扰。`
          : `更新：最近在${region.name}参加线下活动，认识了不少朋友，还是想认真找个能聊得来的对象，长期关系优先。`;
      posts.push({
        id: postId,
        profile_id: pid,
        title,
        content_summary,
        source,
        source_post_id: `${source}_post_${postId}`,
        source_url: `https://${source}.example.com/p/${postId}`,
        published_at,
        likes: 200 + ((postId * 137) % 9000),
        comments: 5 + ((postId * 13) % 400),
        intent_score_snapshot: Math.max(0, Math.min(100, intent_score + (k === 0 ? 0 : -4))),
        created_at: published_at,
        updated_at: published_at,
      });
    }
  }
}

writeFileSync(resolve(dataDir, 'dating-profiles.json'), JSON.stringify(profiles, null, 2));
writeFileSync(resolve(dataDir, 'dating-posts.json'), JSON.stringify(posts, null, 2));
console.log(`generated ${profiles.length} profiles, ${posts.length} posts`);
