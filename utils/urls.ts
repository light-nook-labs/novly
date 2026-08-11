const COVER_PREFIX = "https://rs.sfacg.com/web/novel/images/NovelCover/Big/";
export const BANNER_PREFIX = "https://rs.sfacg.com/web/novel/images/images/beitouNew/";
export const BOOKLIST_API = "https://pages.sfacg.com/api/HttpProxy";
export const SURVEY_URL = "https://forms.cloud.microsoft/r/JfeiiwEYaA";
export const MONTHLY_API = "https://pages.sfacg.com/ajax/act/MonthlyBoy.ashx";

export function novelUrl(id: number): string {
  return "https://book.sfacg.com/Novel/" + id + "/";
}

// NookData 无封面作品 cover 为 null(置空);统一提供默认封面,避免空图
const DEFAULT_COVER = "https://rs.sfacg.com/web/novel/images/NovelCover/Big/default.jpg";

export function coverUrl(cover: string | null): string | null {
  if (!cover || cover.length === 0) return DEFAULT_COVER;
  // 种子数据里 cover 存的是 http:// 明文地址,Android 9+ 默认禁止明文流量,
  // 强制升级为 https(与 banner 一致),否则 release 版加载失败
  if (cover.startsWith("http://")) return "https://" + cover.slice("http://".length);
  if (cover.startsWith("https://")) return cover;
  // 有 cover 值就拼接(含仅 UUID 的短名——sfacg 部分封面直接在 Big/ 根下,可访问);
  // 只有空值才用默认封面,避免有 cover 的书被误显示为默认封面
  return COVER_PREFIX + cover;
}

export function bannerUrl(novelId: number): string {
  return BANNER_PREFIX + novelId + ".jpg";
}

export function novelDetailUrl(id: number): string {
  return `https://book.sfacg.com/Novel/${id}/`;
}

export function monthlyApiUrl(date: string, rank: number): string {
  return `${MONTHLY_API}?op=getRanks&date=${date}&rank=${rank}`;
}
