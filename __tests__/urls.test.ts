import { coverUrl, bannerUrl } from "../utils/urls";

const DEFAULT_COVER = "https://rs.sfacg.com/web/novel/images/NovelCover/Big/default.jpg";
const COVER_PREFIX = "https://rs.sfacg.com/web/novel/images/NovelCover/Big/";

describe("coverUrl", () => {
  it("空值回退到默认封面", () => {
    expect(coverUrl(null)).toBe(DEFAULT_COVER);
    expect(coverUrl("")).toBe(DEFAULT_COVER);
  });

  it("http:// 升级为 https(Android 9+ 默认禁止明文流量)", () => {
    expect(coverUrl("http://rs.sfacg.com/foo.jpg")).toBe("https://rs.sfacg.com/foo.jpg");
  });

  it("https:// 原样返回", () => {
    expect(coverUrl("https://rs.sfacg.com/foo.jpg")).toBe("https://rs.sfacg.com/foo.jpg");
  });

  it("裸值(含 UUID 短名)拼接封面前缀", () => {
    expect(coverUrl("abc123")).toBe(COVER_PREFIX + "abc123");
  });
});

describe("bannerUrl", () => {
  it("按 novel id 拼接背投 URL", () => {
    expect(bannerUrl(730611)).toBe(
      "https://rs.sfacg.com/web/novel/images/images/beitouNew/730611.jpg",
    );
  });
});
