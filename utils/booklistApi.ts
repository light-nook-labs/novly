// 书单在线 API 解析(纯函数,可单元测试)
// 列表项:/bookList/{id};详情元数据:/bookList/{id};详情小说:/bookList/{id}/novel(data.items)
import type { Booklist, BooklistMeta, BooklistNovel } from "../types/models";

// 书单在线 API 常量(列表页与首页推荐共用)
export const BOOKLIST_API = "https://pages.sfacg.com/api/HttpProxy";
export const BOOKLIST_EXPAND = "avatar,verifyType,vipLevel,nickName,growup";
export const BOOKLIST_KNOWN_TOTAL = 1272; // 已知书单总数(近似)
export const BOOKLIST_CACHE_TTL = 24 * 60 * 60 * 1000; // 书单数据缓存 24h(命中免重复请求)

/** 规整文本:合并连续换行为单个换行(禁止空行,避免破坏布局层次),去除首尾空白 */
export function cleanText(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\n{2,}/g, "\n").trim();
}

/** 每段首行缩进2个全角空格(中文排版习惯),空行不缩进 */
export function indentParagraphs(s: string | null | undefined): string | null {
  if (!s) return null;
  return s
    .split("\n")
    .map((line) => (line.trim() ? "\u3000\u3000" + line : line))
    .join("\n");
}

// 列表项(/bookList/{id}):无效数据返回 null(调用方直接丢弃)
export function parseBooklistItem(json: unknown, id: number): Booklist | null {
  const d = (json as any)?.data;
  if (!d || !d.bookListID) return null;
  return {
    bookListID: d.bookListID,
    title: cleanText(d.title) || `书单 #${id}`,
    summary: indentParagraphs(cleanText(d.summary)),
    markNum: d.markNum ?? 0,
    recommendNum: d.recommendNum ?? 0,
    novelNum: d.novelNum ?? 0,
    nickName: d.user?.nickName ?? "",
    avatar: d.user?.expand?.avatar ?? null,
    vipLevel: d.user?.expand?.vipLevel ?? 0,
    lastUpdate: d.lastUpdateDateTime ? String(d.lastUpdateDateTime).slice(0, 10) : null,
  };
}

// 详情元数据(/bookList/{id}):无效数据返回 null
export function parseBooklistMeta(json: unknown, id: number): BooklistMeta | null {
  const d = (json as any)?.data;
  if (!d || !d.bookListID) return null;
  return {
    bookListID: d.bookListID,
    title: cleanText(d.title) || `书单 #${id}`,
    summary: indentParagraphs(cleanText(d.summary)),
    markNum: d.markNum ?? 0,
    recommendNum: d.recommendNum ?? 0,
    novelNum: d.novelNum ?? 0,
    nickName: d.user?.nickName ?? "",
  };
}

// 详情小说列表(/bookList/{id}/novel,data.items)
export function parseBooklistNovels(json: unknown): BooklistNovel[] {
  const data = (json as any)?.data?.items;
  if (!Array.isArray(data)) return [];
  return data
    .map((it: any): BooklistNovel | null => {
      const nv = it?.novels;
      if (!nv || !nv.novelId) return null;
      const ex = nv?.expand ?? {};
      const sysTags = Array.isArray(ex.sysTags)
        ? ex.sysTags.map((t: any) => t?.tagName).filter((x: any) => typeof x === "string" && x.length > 0)
        : [];
      const tags = Array.isArray(ex.tags) ? ex.tags.filter((x: any) => typeof x === "string") : [];
      return {
        novelId: nv.novelId,
        novelName: nv.novelName ?? "",
        authorName: nv.authorName ?? "",
        novelCover: ex.bigNovelCover ?? nv.novelCover ?? null,
        typeName: ex.typeName ?? null,
        tags,
        sysTags,
        charCount: nv.charCount ?? 0,
        markCount: nv.markCount ?? 0,
        viewTimes: nv.viewTimes ?? 0,
        isFinish: nv.isFinish ?? 0,
        note: indentParagraphs(cleanText(it.summary)),
      };
    })
    .filter((n): n is BooklistNovel => n !== null);
}
