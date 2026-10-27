# 依赖策略

直接依赖固定精确版本，`package-lock.json` 锁定传递依赖，CI 使用 npm ci。安装脚本仅在 Actions 运行。运行时应用业务没有 native addon。

- Electron 22.3.27：Win7 专用 legacy 运行时，已 EOL。不能借由 npm audit 证明安全，不对不可信网页开放。
- Electron 44.9.3：现代运行时，选取当前受支持系列；升级时分别检查 Linux 最低基线与 Windows 要求。
- bwip-js 4.7.0：JavaScript 条码编码器。关闭 parse/parsefnc，严格输入校验。QR Unicode 文本不等同原始 binary payload。
- pngjs 7.0.0：纯 JavaScript PNG 与单色位图拼装。程序不读取外部 PNG；输入来自受控条码编码器。
- React/ReactDOM 18.3.1：本地界面，用户内容通过 React 文本节点输出，不使用 dangerouslySetInnerHTML。
- esbuild/TypeScript：编译到 Node16/Chrome108 共用子集；打包工具运行于 Actions Node22，与安装包内运行时分离。
- electron-builder 26.18.0：NSIS、deb、AppImage，npmRebuild=false；无自动发布、签名密钥或应用层原生模块。
- Playwright 与 ZXing：仅开发/CI，分别用于真实 Electron UI 和生成像素解码测试，不进入业务运行路径。

CI 执行生产依赖 `npm audit --omit=dev --audit-level=high`；所有漏洞结论以实际 run 输出为准。开发工具依赖升级应在专门 PR 审查，不能因 legacy 需求而将现代 runtime 锁在 Electron 22。旧 Electron 仍携带已知和未来未修复漏洞，这是公开且无法消除的支持边界。

网络打印只能指向操作员明确输入的 IP，无域名解析或 URL 打开。使用受信任打印局域网；未实现 TLS/认证。所有输出是本地数据，无遥测。

Legacy CI runtime 独立锁定于 `runtimes/legacy/package-lock.json`，避免在已锁定的现代依赖树上进行无锁替换。打包后的 Windows 两版本及 Ubuntu 两架构均安排可执行文件 smoke，确认 app.isPackaged、preload 隔离与条码预览。Actions checkout/setup-node/upload-artifact 固定到已核对发布的 commit SHA，checkout 的 persist-credentials=false。

首次 Actions 全依赖审计揭示旧打包工具与 Playwright 的漏洞，因此升级至 electron-builder 26.18.0、Playwright 1.64.1 和 ESLint 9.39.5，再由 CI 重新审计。Node 构建环境固定 22.23.3。

码下 ASCII 文字使用内嵌的 public-domain font8x8 位图字体，以整数像素缩放输出，避免矩阵码编码器忽略 includetext 或不同打印机字体替换；来源和源文件 SHA256 见 FONT-LICENSE.txt。
