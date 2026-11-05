# ALA Design 自动化生成平台

基于 Figma 节点 `3:2` 实现的桌面优先响应式页面。

现已新增 Figma 节点 `175:171` 的一级首页：使用透明顶部导航、蓝色流光背景和磨砂需求输入面板，支持输入多行需求、选择多张需求截图，并从首页进入原有二级生成页面。“文本识别系统”会先在浏览器中 OCR 需求截图，再将图片文字与手动输入合并，自动识别主副标题、营销类别、单/双 Offer、权益、按钮文案和明确给出的生成属性。

图片生成层优先调用 Cloudflare Workers AI 的 `@cf/black-forest-labs/flux-1-schnell`，仅生成弹窗顶部的节日主题视觉；标题、权益、CTA、固定坐标和透明 PNG 合成仍由本地规范渲染器负责。未配置 Cloudflare、接口失败或免费额度耗尽时，会自动回退到本地测试素材。支持翻页并将当前素材下载为 3 倍透明背景 PNG 效果图（逻辑画布 279×400，实际文件 837×1200）。

Pop-up Design 已接入 `skills/financial-marketing-popup-generator` v1.3.0，适用范围限定为“单 offer + 本土节日弹窗”。运行时直接解析技能包 YAML，并根据其中的固定画布、布局、CTA、Roboto 字重、品牌色、顶部视觉、花边数量和主题示例创建素材。符合范围的结果会显示 `PASS/DRAFT` 校验状态，其他组合显示 `N/A`。当前下载策略以效果图为准：每次只下载当前页完整素材的透明背景 PNG，暂不单独切分 CTA。

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

在 `.env.local` 中填写服务端变量：

```bash
CLOUDFLARE_ACCOUNT_ID=你的账户ID
CLOUDFLARE_API_TOKEN=你的WorkersAI令牌
```

API Token 只由本地 Vite 服务端代理读取，不会进入浏览器代码。当前代理用于本地测试；正式上线时需将 `/api/generate-image` 迁移到部署平台的服务端函数或 Cloudflare Worker。

生产构建：

```bash
pnpm build
```

## 在线访问

推送到 `main` 后，GitHub Actions 会自动构建并发布 GitHub Pages：

https://1974898705-ui.github.io/New-web-ALA-Design/

公开页面为纯静态测试版，文本识别、图片 OCR、本地弹窗模拟和透明 PNG 下载可直接使用。Cloudflare 生图代理需要服务端环境变量，因此 GitHub Pages 上未配置时会安全回退到本地测试素材。
