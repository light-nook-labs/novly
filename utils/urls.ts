const COVER_PREFIX = "https://rs.sfacg.com/web/novel/images/NovelCover/Big/";
const BANNER_PREFIX = "https://rs.sfacg.com/web/novel/images/images/beitouNew/";

export function coverUrl(cover: string | null): string | null {
  if (!cover || cover.length === 0) return null;
  // 种子数据里 cover 存的是 http:// 明文地址,Android 9+ 默认禁止明文流量,
  // 强制升级为 https(与 banner 一致),否则 release 版加载失败
  if (cover.startsWith("http://")) return "https://" + cover.slice("http://".length);
  if (cover.startsWith("https://")) return cover;
  return COVER_PREFIX + cover;
}

export function bannerUrl(novelId: number): string {
  return BANNER_PREFIX + novelId + ".jpg";
}
