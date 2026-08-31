// 红绳（redstring）SQLite 库的只读实体投影。
// 只映射导入需要的列；建表由红绳项目 TypeORM synchronize:true 维护，这里从不建表。
// 用 EntitySchema 而非装饰器：仓库脚本约定 node --experimental-strip-types 运行，类型擦除不支持旧式装饰器。
import { EntitySchema } from 'typeorm';

export interface UserProfileRow {
  id: string;
  user_id: string;
  sec_uid: string | null;
  uid: string | null;
  unique_id: string | null;
  nickname: string | null;
  gender: number | null; // 1-男 2-女
  user_age: number | null;
  user_avatar: string | null;
  signature: string | null;
  city: string | null;
  province: string | null;
  district: string | null;
  ip_location: string | null;
  tags: string | null; // JSON 数组字符串
  confidence: number | null;
  intent_score: number | null;
  activity_score: number | null;
  created_at: number; // ms
  updated_at: number; // ms
}

export const UserProfileSchema = new EntitySchema<UserProfileRow>({
  name: 'RedstringUserProfile',
  tableName: 'user_profiles',
  columns: {
    id: { type: 'varchar', primary: true },
    user_id: { type: 'varchar' },
    sec_uid: { type: 'varchar', nullable: true },
    uid: { type: 'varchar', nullable: true },
    unique_id: { type: 'varchar', nullable: true },
    nickname: { type: 'varchar', nullable: true },
    gender: { type: 'integer', nullable: true },
    user_age: { type: 'integer', nullable: true },
    user_avatar: { type: 'varchar', nullable: true },
    signature: { type: 'varchar', nullable: true },
    city: { type: 'varchar', nullable: true },
    province: { type: 'varchar', nullable: true },
    district: { type: 'varchar', nullable: true },
    ip_location: { type: 'varchar', nullable: true },
    tags: { type: 'varchar', nullable: true },
    confidence: { type: 'integer', nullable: true },
    intent_score: { type: 'integer', nullable: true },
    activity_score: { type: 'integer', nullable: true },
    created_at: { type: 'integer' },
    updated_at: { type: 'integer' },
  },
});

export interface UserPostRow {
  id: string; // aweme_id
  desc: string | null;
  create_time: number; // unix 秒
  aweme_type: number; // 0=视频 2=图文 4=合集
  author_uid: string;
  author_sec_uid: string;
  author_nickname: string | null;
  digg_count: number;
  comment_count: number;
  collect_count: number;
  created_at: number; // ms
  updated_at: number; // ms
}

export const UserPostSchema = new EntitySchema<UserPostRow>({
  name: 'RedstringUserPost',
  tableName: 'user_posts',
  columns: {
    id: { type: 'varchar', primary: true },
    desc: { type: 'text', nullable: true },
    create_time: { type: 'integer' },
    aweme_type: { type: 'integer' },
    author_uid: { type: 'varchar' },
    author_sec_uid: { type: 'varchar' },
    author_nickname: { type: 'varchar', nullable: true },
    digg_count: { type: 'integer' },
    comment_count: { type: 'integer' },
    collect_count: { type: 'integer' },
    created_at: { type: 'integer' },
    updated_at: { type: 'integer' },
  },
});

export interface VideoRow {
  id: string;
  post_id: string | null;
  cover_url: string | null;
}

export const VideoSchema = new EntitySchema<VideoRow>({
  name: 'RedstringVideo',
  tableName: 'videos',
  columns: {
    id: { type: 'varchar', primary: true },
    post_id: { type: 'varchar', nullable: true },
    cover_url: { type: 'text', nullable: true },
  },
});
