import { describe, expect, it } from "@jest/globals";
import { groupMoeByYear, type MoeRow } from "../utils/moe";

function row(id: number, tag: string): MoeRow {
  return {
    id,
    title: `小说${id}`,
    author: null,
    cover: null,
    click_num: 100,
    status: 3,
    genre: 3,
    ptype: 2,
    tag_name: tag,
  };
}

describe("groupMoeByYear", () => {
  it("按年份分组并倒序,同组保持行序", () => {
    const groups = groupMoeByYear([
      row(1, "2024萌神"),
      row(2, "2023萌神"),
      row(3, "2024萌神"),
      row(4, "2018萌神"),
    ]);
    expect(groups.map((g) => g.year)).toEqual(["2024", "2023", "2018"]);
    expect(groups[0].novels.map((n) => n.id)).toEqual([1, 3]);
  });

  it("空输入返回空数组", () => {
    expect(groupMoeByYear([])).toEqual([]);
  });

  it("年份提取(去掉萌神后缀)", () => {
    const groups = groupMoeByYear([row(1, "2025萌神")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].year).toBe("2025");
    expect(groups[0].novels).toHaveLength(1);
  });
});
