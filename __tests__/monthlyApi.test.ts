import { describe, expect, it } from "@jest/globals";
import { parseMonthlyRank } from "../utils/monthlyApi";

describe("parseMonthlyRank", () => {
  it("解析正常响应", () => {
    const json = {
      status: 200,
      data: [
        { nid: 730611, name: "小说A", ticketNum: 1590, authorName: "作者A", cover: "https://x/1.jpg" },
        { nid: 730612, name: "小说B", ticketNum: 0, authorName: null, cover: null },
      ],
    };
    const items = parseMonthlyRank(json);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      nid: 730611,
      name: "小说A",
      ticketNum: 1590,
      authorName: "作者A",
      cover: "https://x/1.jpg",
    });
    expect(items[1]).toEqual({ nid: 730612, name: "小说B", ticketNum: 0, authorName: null, cover: null });
  });

  it("data 缺失/非数组返回空数组(旧月份某分类无榜单)", () => {
    expect(parseMonthlyRank({ status: 200 })).toEqual([]);
    expect(parseMonthlyRank({ status: 400, msg: "参数有误" })).toEqual([]);
    expect(parseMonthlyRank(null)).toEqual([]);
    expect(parseMonthlyRank({ data: "not-array" })).toEqual([]);
  });

  it("过滤无效项(nid 非正整数)并给缺省字段默认值", () => {
    const json = {
      data: [
        { nid: 0, name: "A" }, // nid 非法 → 过滤
        { nid: "abc", name: "B" }, // nid 非数字 → 过滤
        { nid: 123 }, // 缺字段 → 默认值
      ],
    };
    const items = parseMonthlyRank(json);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ nid: 123, name: "", ticketNum: 0, authorName: null, cover: null });
  });
});
