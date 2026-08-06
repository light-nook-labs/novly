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
  novel_count?: number; // 标签列表页的计数投影
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

export interface BannerNovel {
  id: number;
  title: string;
  author: string | null;
}

export interface NovelRowData {
  id: number;
  title: string;
  author: string | null;
  cover: string | null;
  click_num: number | null;
  word_num?: number | null;
  like_num?: number | null;
  comment_num?: number | null;
  tags?: string[];
  status: number;
  genre: number;
  ptype: number;
}

export interface StatusCount {
  status: number;
  count: number;
}

export interface Booklist {
  bookListID: number;
  title: string;
  summary: string | null;
  markNum: number;
  recommendNum: number;
  novelNum: number;
  nickName: string;
  avatar: string | null;
  vipLevel: number;
  lastUpdate: string | null;
}

export interface BooklistMeta {
  bookListID: number;
  title: string;
  summary: string | null;
  markNum: number;
  recommendNum: number;
  novelNum: number;
  nickName: string;
}

export interface BooklistNovel {
  novelId: number;
  novelName: string;
  authorName: string;
  novelCover: string | null;
  typeName: string | null;
  tags: string[];
  sysTags: string[];
  charCount: number;
  markCount: number;
  viewTimes: number;
  isFinish: number;
  note: string | null;
}

export interface RankNovel {
  id: number;
  title: string;
  author: string | null;
  genre: number;
  status: number;
  ptype: number;
  word_num: number;
  click_num: number;
  like_num: number;
  praise_num: number;
  review_num: number;
  comment_num: number;
  cover: string | null;
  ticket_num: number;
}

export interface SearchNovel {
  id: number;
  title: string;
  author: string | null;
  click_num: number | null;
}
