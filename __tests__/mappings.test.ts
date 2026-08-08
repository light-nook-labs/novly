import { describe, expect, it } from "@jest/globals";
import {
  genreMapping,
  statusMapping,
  ptypeMapping,
  normalizeStatus,
  formatNumber,
} from "../utils/mappings";

describe("normalizeStatus", () => {
  it("合并 A 变体到无 A 状态(断更A→断更、完结A→已完结)", () => {
    expect(normalizeStatus(5)).toBe(4);
    expect(normalizeStatus(6)).toBe(2);
  });

  it("其他状态保持不变", () => {
    expect(normalizeStatus(1)).toBe(1);
    expect(normalizeStatus(2)).toBe(2);
    expect(normalizeStatus(3)).toBe(3);
    expect(normalizeStatus(4)).toBe(4);
  });
});

describe("formatNumber", () => {
  it("null/undefined 显示 0", () => {
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber(undefined)).toBe("0");
  });

  it("小于 10000 用千分位", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(9999)).toBe("9,999");
  });

  it("大于等于 10000 转 X.X万", () => {
    expect(formatNumber(10000)).toBe("1.0万");
    expect(formatNumber(12345)).toBe("1.2万");
    expect(formatNumber(99999)).toBe("10.0万");
  });
});

describe("枚举映射", () => {
  it("genre/status/ptype 映射中文标签", () => {
    expect(genreMapping[1]).toBe("其他");
    expect(genreMapping[3]).toBe("玄幻");
    expect(statusMapping[2]).toBe("已完结");
    expect(statusMapping[3]).toBe("连载中");
    expect(ptypeMapping[2]).toBe("免费");
    expect(ptypeMapping[4]).toBe("VIP");
  });

  it("未知值返回 undefined", () => {
    expect(statusMapping[7]).toBeUndefined();
    expect(ptypeMapping[99]).toBeUndefined();
  });
});
