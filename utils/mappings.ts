export const genreMapping: Record<number, string> = {
  1: "其他",
  2: "魔幻",
  3: "玄幻",
  4: "古风",
  5: "科幻",
  6: "校园",
  7: "都市",
  8: "游戏",
  9: "同人",
  10: "悬疑",
};

export const statusMapping: Record<number, string> = {
  1: "其他",
  2: "已完结",
  3: "连载中",
  4: "断更",
  5: "断更A",
  6: "完结A",
};

// 带 A 后缀的状态归并到无 A 状态（断更A→断更、完结A→已完结）
export function normalizeStatus(status: number): number {
  if (status === 5) return 4;
  if (status === 6) return 2;
  return status;
}

export const ptypeMapping: Record<number, string> = {
  1: "其他",
  2: "免费",
  3: "签约",
  4: "VIP",
};

export const statusColors: Record<number, string> = {
  1: "#999999",
  2: "#2196F3",
  3: "#4CAF50",
  4: "#999999",
  5: "#999999",
  6: "#2196F3",
};

export function formatNumber(num: number | null): string {
  if (num === null || num === undefined) return "0";
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  return num.toLocaleString();
}
