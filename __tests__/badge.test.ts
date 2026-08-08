import { lightColors, darkColors } from "../constants/theme";
import { statusColor, tagColor } from "../components/Badge";

describe("statusColor", () => {
  it("连载中(3) → success", () => {
    expect(statusColor(lightColors, 3)).toBe(lightColors.success);
    expect(statusColor(darkColors, 3)).toBe(darkColors.success);
  });

  it("已完结(2)/完结A(6) → primary", () => {
    expect(statusColor(lightColors, 2)).toBe(lightColors.primary);
    expect(statusColor(lightColors, 6)).toBe(lightColors.primary);
    expect(statusColor(darkColors, 2)).toBe(darkColors.primary);
  });

  it("其他状态回退 textTertiary", () => {
    expect(statusColor(lightColors, 1)).toBe(lightColors.textTertiary);
    expect(statusColor(lightColors, 4)).toBe(lightColors.textTertiary);
    expect(statusColor(lightColors, 99)).toBe(lightColors.textTertiary);
  });
});

describe("tagColor", () => {
  it("同一 novel 前 6 个 tag 颜色互不相同", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      seen.add(tagColor(lightColors, i));
    }
    expect(seen.size).toBe(6);
  });

  it("超过调色板长度后循环", () => {
    expect(tagColor(lightColors, 0)).toBe(tagColor(lightColors, 6));
    expect(tagColor(lightColors, 1)).toBe(tagColor(lightColors, 7));
  });
});
