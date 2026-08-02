// 统一 Icon 常量:按业务语义命名(与 db 字段/业务场景一致),值对应 Ionicons 图标
// 命名以项目业务为主(back/like/click/author/link/jump/wordNum 等),
// 不用 expo-icons 本身的图标名——避免语义不明导致 icon 不一致
export const ICONS = {
  back: "chevron-back", // 顶部返回
  jump: "chevron-forward", // 跳转页面(右侧箭头)
  link: "open-outline", // 超链接(外链)
  like: "heart-outline", // 收藏/喜欢(like_num)
  click: "thumbs-up-outline", // 点赞/点击(click_num)
  author: "person-outline", // 作者
  wordNum: "document-text-outline", // 字数(word_num)
  search: "search-outline",
  book: "book-outline",
  tag: "pricetag-outline",
  contest: "trophy-outline",
  genre: "layers-outline",
  banner: "images-outline",
  filter: "options-outline",
  shield: "shield-checkmark-outline",
  close: "close",
  star: "star-outline",
  clipboard: "clipboard-outline",
  bug: "bug-outline",
  trash: "trash-outline",
  swap: "swap-vertical",
} as const;
