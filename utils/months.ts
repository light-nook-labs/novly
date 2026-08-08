// 月榜月份生成逻辑(纯函数,可单元测试)
// 月榜数据最早可追溯到 2013-03(实测:2013-02 及更早月份无数据),每月一期
export const FIRST_MONTH = "201303";

// 当前月份 YYYYMM(可注入 Date 便于测试)
export function currentYm(now: Date = new Date()): string {
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// 从 start(YYYYMM) 起往前生成到第一期(含),月份递减并处理跨年(1月→上年12月)
export function generateMonthsFrom(start: string, first: string = FIRST_MONTH): string[] {
  const list: string[] = [];
  let cur = start;
  while (cur >= first) {
    list.push(cur);
    const y = Number(cur.slice(0, 4));
    const m = Number(cur.slice(4, 6));
    cur = m === 1 ? `${y - 1}12` : `${y}${String(m - 1).padStart(2, "0")}`;
  }
  return list;
}
