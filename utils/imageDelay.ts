// 测试用:人为延迟图片加载(便于调试加载动画)。已关闭(置 0):
// 图片按真实网络加载速度显示,shimmer 占位仅在真实加载期间短暂出现。
// 如需再次调试加载动画,临时改为 3000 即可。
export const IMAGE_LOAD_DELAY_MS = 0;

/** 人为延迟图片加载(返回 promise,resolve 后图片才开始真实加载) */
export function delayImageLoad(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, IMAGE_LOAD_DELAY_MS));
}
