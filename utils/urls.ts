const COVER_PREFIX = "https://rs.sfacg.com/web/novel/images/NovelCover/Big/";
const BANNER_PREFIX = "https://rs.sfacg.com/web/novel/images/images/beitouNew/";

export function coverUrl(cover: string | null): string | null {
  if (!cover || cover.length === 0) return null;
  if (cover.startsWith("http")) return cover;
  return COVER_PREFIX + cover;
}

export function bannerUrl(novelId: number): string {
  return BANNER_PREFIX + novelId + ".jpg";
}
