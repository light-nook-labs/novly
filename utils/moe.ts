// 萌神大赛分组逻辑(纯函数,可单元测试)
// 输入:带 tag_name 的小说行(如 "2024萌神"),输出:按年份倒序分组(同组保持行序)
import type { NovelRowData } from "../types/models";

export type MoeRow = NovelRowData & { tag_name: string };

export interface MoeGroup {
  year: string;
  novels: NovelRowData[];
}

// 年份 = tag_name 去掉"萌神"后缀(如 "2024萌神" → "2024");组间按年份倒序
export function groupMoeByYear(rows: MoeRow[]): MoeGroup[] {
  const grouped: MoeGroup[] = [];
  const map = new Map<string, NovelRowData[]>();
  for (const row of rows) {
    const year = row.tag_name.replace("萌神", "");
    let group = map.get(year);
    if (!group) {
      group = [];
      map.set(year, group);
      grouped.push({ year, novels: group });
    }
    group.push(row);
  }
  return grouped.sort((a, b) => b.year.localeCompare(a.year));
}
