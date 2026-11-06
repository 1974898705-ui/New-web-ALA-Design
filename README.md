# ALA Design 自动化生成平台

基于 Figma 节点 `3:2` 实现的桌面优先响应式页面。

现已新增 Figma 节点 `175:171` 的一级首页：使用透明顶部导航、蓝色流光背景和磨砂需求输入面板，支持输入多行需求、选择多张需求截图，并从首页进入原有二级生成页面。“文本识别系统”会先在浏览器中 OCR 需求截图，再将图片文字与手动输入合并，自动识别主副标题、营销类别、单/双 Offer、权益、按钮文案和明确给出的生成属性。

图片生成层通过已部署的 Cloudflare Worker 调用 Workers AI `@cf/black-forest-labs/flux-2-klein-4b`，以 704×1024 竖版尺寸生成无文字视觉底图：节日装饰、卡片视觉、分色和花边由 Cloudflare 负责，标题、Offer 与 CTA 由浏览器按技能规范精确排版。这样避免生图模型漏字、错字和乱码，同时保留整张卡片的生成式视觉。接口失败或账户额度耗尽时，才会明确回退到本地测试素材。支持翻页并将当前素材下载为 3 倍 PNG 效果图（逻辑画布 279×400，实际文件 837×1200）。

Pop-up Design 已接入 `skills/financial-marketing-popup-generator` v1.3.0，适用范围限定为“单 offer + 本土节日弹窗”。完整技能规则会同时进入视觉底图提示词和确定性排版器，包括固定画布比例、布局、CTA、Roboto 字重、品牌色、顶部视觉、花边数量和主题示例。Cloudflare 视觉仍需人工确认，因此结果会标为 `DRAFT`，但页面会展示已执行的规则检查数量；其他组合显示 `N/A`。当前下载策略以效果图为准：每次只下载当前页完整素材的 PNG，暂不单独切分 CTA。

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

本地开发如需直接使用线上 Worker，可在 `.env.local` 中填写：

```bash
VITE_IMAGE_PROVIDER_ENDPOINT=https://ala-design-image-api.ai-creative-platform.workers.dev/api/generate-image
```

生产构建通过 `.env.production` 使用同一接口。Cloudflare 登录凭据只保存在本机 Wrangler 的加密凭据存储中，不会进入仓库或浏览器代码。Worker 源码位于 `worker/`，可使用 `pnpm run worker:deploy` 重新部署。

生产构建：

```bash
pnpm build
```

## 在线访问

推送到 `main` 后，GitHub Actions 会自动构建并发布。公开页面支持文本识别、图片 OCR、Cloudflare 真实生图、本地安全回退和透明 PNG 下载：

https://1974898705-ui.github.io/New-web-ALA-Design/

Cloudflare Worker：

https://ala-design-image-api.ai-creative-platform.workers.dev/health
