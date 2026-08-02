// 统一数据模型类型定义
// React 项目规范:重要类型集中管理,各页面/组件从这里导入
// 渐进式迁移:新类型加入此处,页面本地类型逐步迁移

export interface Author {
  id: number;
  name: string;
  top_novel_title: string | null;
  top_novel_clicks: number;
}

export interface Contest {
  id: number;
  name: string;
  novel_count?: number;
}

export interface Novel {
  id: number;
  title: string;
  author: string | null;
  genre: number;
  status: number;
  ptype: number;
  contest_id: number | null;
  has_banner: number;
  word_num: number | null;
  click_num: number | null;
  like_num: number | null;
  praise_num: number | null;
  comment_num: number | null;
  review_num: number | null;
  cover: string | null;
  last_update: string | null;
}

export interface Tag {
  id: number;
  name: string;
}

export interface FilterState {
  genre: number | null;
  status: number | null;
  year: number | null;
  minWordNum: number | null;
  maxWordNum: number | null;
  sortBy: string;
  descending: boolean;
}

export interface GenreCount {
  genre: number;
  count: number;
}

export interface AuthorStats {
  id: number;
  name: string;
  top_novel_title: string | null;
  top_novel_clicks: number;
  total_novels: number;
  total_clicks: number;
  total_likes: number;
  total_praise: number;
}

export interface CacheEntry<T> {
  timestamp: number;
  data: T;
}
