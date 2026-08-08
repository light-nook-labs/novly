// 月榜在线 API 解析(纯函数,可单元测试)
// 接口:MonthlyBoy.ashx?op=getRanks&date=YYYY-MM&rank=N → { status, data: [{nid,name,ticketNum,authorName,cover}] }

export interface MonthlyRankItem {
  nid: number;
  name: string;
  ticketNum: number;
  authorName: string | null;
  cover: string | null;
}

// 规整响应:字段缺省给默认值,过滤无效项(nid 非正整数);
// 旧月份某分类无数据时 data 为空数组(页面显示"该月暂无此榜单")
export function parseMonthlyRank(json: unknown): MonthlyRankItem[] {
  const data = (json as any)?.data;
  if (!Array.isArray(data)) return [];
  return data
    .map((it: any): MonthlyRankItem => ({
      nid: Number(it?.nid),
      name: typeof it?.name === "string" ? it.name : "",
      ticketNum: Number(it?.ticketNum) || 0,
      authorName: typeof it?.authorName === "string" ? it.authorName : null,
      cover: typeof it?.cover === "string" ? it.cover : null,
    }))
    .filter((it) => Number.isInteger(it.nid) && it.nid > 0);
}
