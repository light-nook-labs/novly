// Why Novly? 内容与解析:纯文本常量 → 自动生成内容块(正文/列表项)
// 维护方式:直接编辑 WHY_TEXT 常量即可,无需改动其他代码
// 注:内容以内联 TS 常量打包(而非资产文件)——不依赖 metro assetExts 配置,跨平台可靠、无需重启 dev server
export interface WhyBlock {
  text: string;
  bullet: boolean;
}

// Why 内容(普通行 = 正文段落;`- ` 开头 = 列表项;空行忽略)
const WHY_TEXT = `我从2020年开始，在 SFACG（菠萝包轻小说） 看小说，也经常在这里看书。

但这些年,我遇到过不少困扰:

- 有些好书因为年代久远,封面（例如，S级的书却是默认封面）和一些元信息（有些作者简介在PC网站上有，但是APP中没有）已经丢失
- 搜索与推荐机制不佳,一些好书永远不会被人发现
- 不同平台(PC / 移动端 / App)数据不一致,同一本书各处信息都对不上

对于这些情况，我感到非常惋惜。明明是一个有着悠久历史的小说网站，却这么不珍惜自己这么长时间产生的佳作。

这些让找书、追书变得非常困难。

所以我希望帮助和我遇到同样问题的书友,提供一个更好的检索平台:

- 离线优先:内置稳定元数据,无需网络即可浏览
- 数据修复:找回丢失的封面、作者与书籍信息
- 更好的搜索与浏览:让好书不再被埋没
`;

// 读取 why 内容(同步,无需异步资产加载)
export function loadWhyText(): string {
  return WHY_TEXT;
}

// 解析文本:普通行 → 正文段落;`- ` 开头 → 列表项;空行忽略
export function parseWhyMarkdown(text: string): WhyBlock[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) =>
      line.startsWith("- ") ? { text: line.slice(2), bullet: true } : { text: line, bullet: false },
    );
}
