// web 端:wa-sqlite 需要以 SQL 文本导入完整 seed。
// seed 资产只在此 web-only 模块里 require —— Metro 打包时原生端解析到 seedLoader.ts,
// 因此 seed.sql.gz 不会进入 Android/iOS bundle,避免 APK 冗余 ~60MB。
 
export function getSeedAsset(): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro 资产打包必需
  return require("../assets/seed.sql.gz");
}
