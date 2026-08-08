import { describe, expect, it } from "@jest/globals";
import {
  cleanText,
  indentParagraphs,
  parseBooklistItem,
  parseBooklistMeta,
  parseBooklistNovels,
} from "../utils/booklistApi";

describe("cleanText", () => {
  it("合并连续换行并去除首尾空白", () => {
    expect(cleanText("  a\n\n\nb  ")).toBe("a\nb");
    expect(cleanText("")).toBe("");
    expect(cleanText(null)).toBe("");
  });
});

describe("indentParagraphs", () => {
  it("每段首行缩进2个全角空格,空行不缩进", () => {
    expect(indentParagraphs("第一段\n\n第二段")).toBe("\u3000\u3000第一段\n\n\u3000\u3000第二段");
    expect(indentParagraphs(null)).toBeNull();
    expect(indentParagraphs("")).toBeNull();
  });
});

describe("parseBooklistItem", () => {
  it("解析列表项并规整文本", () => {
    const json = {
      data: {
        bookListID: 5,
        title: "  我的书单  ",
        summary: "简介\n\n\n多段",
        markNum: 10,
        recommendNum: 2,
        novelNum: 7,
        user: { nickName: "作者", expand: { avatar: "a.png", vipLevel: 2 } },
        lastUpdateDateTime: "2026-06-01T10:00:00Z",
      },
    };
    const item = parseBooklistItem(json, 5);
    expect(item).not.toBeNull();
    expect(item?.title).toBe("我的书单");
    expect(item?.summary).toBe("\u3000\u3000简介\n\u3000\u3000多段");
    expect(item?.nickName).toBe("作者");
    expect(item?.avatar).toBe("a.png");
    expect(item?.vipLevel).toBe(2);
    expect(item?.lastUpdate).toBe("2026-06-01");
  });

  it("无效数据返回 null", () => {
    expect(parseBooklistItem({ data: {} }, 5)).toBeNull();
    expect(parseBooklistItem(null, 5)).toBeNull();
    expect(parseBooklistItem({ data: { bookListID: 0 } }, 5)).toBeNull();
  });
});

describe("parseBooklistMeta", () => {
  it("解析详情元数据", () => {
    const meta = parseBooklistMeta(
      { data: { bookListID: 9, title: "书单九", summary: "简介", novelNum: 3, user: { nickName: "作" } } },
      9,
    );
    expect(meta?.bookListID).toBe(9);
    expect(meta?.title).toBe("书单九");
    expect(meta?.nickName).toBe("作");
    expect(meta?.novelNum).toBe(3);
  });

  it("无效数据返回 null", () => {
    expect(parseBooklistMeta({ data: {} }, 9)).toBeNull();
  });
});

describe("parseBooklistNovels", () => {
  it("解析 data.items 并过滤无效项", () => {
    const json = {
      data: {
        items: [
          {
            novels: {
              novelId: 100,
              novelName: "书A",
              authorName: "作A",
              charCount: 1000,
              expand: {
                bigNovelCover: "cover.png",
                typeName: "玄幻",
                tags: ["热血", "战斗"],
                sysTags: [{ tagName: "系统" }, { tagName: "" }],
              },
            },
            summary: "推荐理由",
          },
          { novels: {} }, // 无 novelId → 过滤
          null,
        ],
      },
    };
    const novels = parseBooklistNovels(json);
    expect(novels).toHaveLength(1);
    expect(novels[0].novelId).toBe(100);
    expect(novels[0].typeName).toBe("玄幻");
    expect(novels[0].tags).toEqual(["热血", "战斗"]);
    expect(novels[0].sysTags).toEqual(["系统"]); // 空 tagName 被过滤
    expect(novels[0].note).toBe("\u3000\u3000推荐理由");
  });

  it("items 缺失返回空数组", () => {
    expect(parseBooklistNovels({ data: {} })).toEqual([]);
    expect(parseBooklistNovels({})).toEqual([]);
    expect(parseBooklistNovels(null)).toEqual([]);
  });
});
