import { describe, expect, it } from "@jest/globals";
import { buildNovelQuery } from "../utils/novelQuery";

describe("buildNovelQuery", () => {
  it("无过滤:默认排序 + 分页参数", () => {
    const { query, params } = buildNovelQuery(0, {});
    expect(query).toContain("FROM novels");
    expect(query).toContain("ORDER BY click_num DESC LIMIT ? OFFSET ?");
    expect(params).toEqual([10, 0]);
  });

  it("过滤条件拼接与参数顺序", () => {
    const { query, params } = buildNovelQuery(2, {
      ptype: 4,
      status: 3,
      genre: 5,
      year: 2024,
      minWordNum: 1000,
      maxWordNum: 500000,
    });
    expect(query).toContain(
      "WHERE ptype = ? AND status = ? AND genre = ? AND SUBSTR(last_update, 1, 4) = ? AND word_num >= ? AND word_num < ?",
    );
    expect(params).toEqual([4, 3, 5, "2024", 1000, 500000, 10, 20]);
  });

  it("非法 sortBy 回退 click_num;descending=false 用 ASC", () => {
    const { query } = buildNovelQuery(0, { sortBy: "hacked", descending: false });
    expect(query).toContain("ORDER BY click_num ASC");
  });

  it("fromClause 与 extraWhere/extraParams(详情页复用)", () => {
    const { query, params } = buildNovelQuery(0, {
      fromClause: "FROM novels n INNER JOIN novel_tags nt ON n.id = nt.novel_id",
      extraWhere: ["nt.tag_id = ?"],
      extraParams: [42],
    });
    expect(query).toContain("INNER JOIN novel_tags");
    expect(query).toContain("WHERE nt.tag_id = ?");
    expect(params).toEqual([42, 10, 0]);
  });

  it("分页 OFFSET = pageNum × pageSize", () => {
    const { params } = buildNovelQuery(3, { pageSize: 20 });
    expect(params.slice(-2)).toEqual([20, 60]);
  });
});
