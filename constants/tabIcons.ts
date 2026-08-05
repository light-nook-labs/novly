// 标签页图标常量(集中管理 tab/nav 图标,独立于通用 ICONS)
// tab 图标有专门的设计语义,不与通用 ICONS 混用
export const TAB_ICONS = {
  // 底部 tab 导航
  home: "home",
  novels: "book",
  banners: "images",
  rankings: "podium",
  bookshelf: "bookmark",
  // head tab(小说列表分类)
  all: "list-outline",
  free: "gift-outline",
  sign: "ribbon-outline",
  vip: "diamond-outline",
  // 首页导航网格
  contests: "trophy-outline",
  genres: "layers-outline",
  clipboard: "clipboard-outline",
} as const;
