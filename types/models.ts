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
