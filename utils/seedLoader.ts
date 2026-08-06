// 原生端(Android/iOS)不使用 seed.sql.gz —— 走 hot/cold chunks。
// 返回 null 仅为占位(该函数在原生端不会被调用)。
export function getSeedAsset(): any {
  return null;
}
