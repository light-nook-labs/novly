import { describe, expect, it } from "@jest/globals";
import { FIRST_MONTH, currentYm, generateMonthsFrom } from "../utils/months";

describe("currentYm", () => {
  it("按注入日期格式化 YYYYMM", () => {
    expect(currentYm(new Date(2026, 5, 1))).toBe("202606"); // 6 月(month index 5)
    expect(currentYm(new Date(2026, 0, 1))).toBe("202601");
    expect(currentYm(new Date(2026, 11, 31))).toBe("202612");
  });
});

describe("generateMonthsFrom", () => {
  it("从 start 递减生成到 first(含)", () => {
    expect(generateMonthsFrom("202604", "202603")).toEqual(["202604", "202603"]);
  });

  it("跨年正确回退(1月 → 上年12月)", () => {
    expect(generateMonthsFrom("202601", "202511")).toEqual(["202601", "202512", "202511"]);
  });

  it("start 早于 first 返回空列表", () => {
    expect(generateMonthsFrom("201301", "201303")).toEqual([]);
  });

  it("默认以 FIRST_MONTH(201303)为边界", () => {
    const months = generateMonthsFrom("201304");
    expect(months[0]).toBe("201304");
    expect(months[months.length - 1]).toBe(FIRST_MONTH);
    expect(months.length).toBe(2);
  });
});
