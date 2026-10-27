# 验证与设计记录

## 实际验证

全部测试、应用启动和打包均在 GitHub Actions 执行，本机仅编辑、审阅输出和执行 Git 操作。开发入口为 [draft PR #1](https://github.com/Taoidle/scan-reprint/pull/1)，最终提交应以该 PR 的最新绿色检查与对应 artifact 为准。

[完整通过的运行 #9](https://github.com/Taoidle/scan-reprint/actions/runs/40477025441)，提交 `de463c025b18a373cbf5c1403add619b48173d4a`：lint、strict TypeScript、25 项单元测试（25 pass / 0 fail）、完整根依赖树审计（0 vulnerabilities）、Ubuntu 22.04 真实 Electron UI smoke，以及以下四目标全部通过。后续仅文档提交仍运行同样完整矩阵；请下载与目标提交一致的 artifact。

| 目标 | 实际 CI 证据 | 安装产物 |
|---|---|---|
| Windows legacy x64 | Windows Server 2022；Electron 22.3.27 源码和生产程序 smoke | NSIS exe |
| Windows modern x64 | Windows Server 2022；Electron 44.9.3 源码和生产程序 smoke | NSIS exe |
| Ubuntu amd64 | Ubuntu 22.04；源码和生产程序 smoke | deb + AppImage |
| Ubuntu arm64 | 原生 ARM64 runner 打包；Ubuntu 22.04 ARM64 容器内源码和生产程序 smoke；日志 aarch64 / glibc 2.35 | deb + AppImage |

ARM64 前两轮出现等待，在后续提交到达时取消，未计为通过。为启动、窗口出现和整段检查加入明确超时及启动诊断后，运行 #9 在保留全部断言的情况下完成并正常退出；旧等待的根因未从已取消日志确定。保留超时和诊断，以便未来出现同类问题时使 CI 明确失败并提供证据。

## 覆盖与边界

- 输入：前导零、大小写、首尾空格保真；AIM allowlist；拒绝 GS1、控制符和无效 Unicode；EAN 校验；尺寸、份数、IP、端口边界。
- 图形与协议：QR（含中文/emoji）、Code128、EAN13、Data Matrix 的实际 PNG 经独立 ZXing 解码；静区/白边/码下文字；ZPL 十六进制、TSPL 定长二进制与白色位极性；扫描内容不能注入打印指令。
- 打印提交：mock TCP 接收精确字节、连接拒绝、连接后阻塞超时；mock spooler 成功、回调失败、抛错、准备超时和提交超时。
- 队列与数据：串行提交、提交中新任务、重复保护、明确重打、不可变快照；发送前保存失败、发送后保存失败、重启中断；损坏、矛盾、重复和超限历史拒绝。
- 源码 Electron：隔离验证、预览、虚拟 spooler 提交、重复保护、重打确认、自动模式、URL 不导航、1025 字符不截断、850px 无横向溢出、中文本地字体加载。
- 生产打包程序：实际启动可执行文件，确认 `app.isPackaged`、preload 隔离、精确保留输入、条码预览和内嵌中文字体；不启用虚拟打印机。
- 产物：四个目标共六个安装文件，各目标附 `SHA256SUMS.txt`。源码 smoke 的虚拟打印 seam 只在未打包且显式设置环境变量时存在，生产应用始终使用真实打印路径。

尚未完成：真实 USB 扫码枪、实际系统驱动出纸、ZPL/TSPL 实机、断纸/掉电、毫米尺寸与可扫描性校准、真实 Win7 SP1 x64、实体 Ubuntu ARM64 设备、安装/卸载完整生命周期。CI 启动的是打包目录中的生产可执行文件，不等同于运行每个安装器。Linux CI 使用 Xvfb 与 `--no-sandbox` 解决 runner 权限限制；实际桌面沙箱/显示服务仍需安装验收。无签名证书；Win7 Electron 22 已 EOL。提交成功不代表物理出纸。

## 设计与视觉检查

使用 frontend-app-builder 与 imagegen 生成工作台概念，参考图为 `generated_images/exec-cf7ca9ae-160d-4414-b6a9-32d00b9a6f0a.png`（1505×1045）。实际检查采用 Actions Playwright Electron 截图，下载后逐张查看，未在本机启动应用。运行 #8 的 `ui-evidence-modern` 包含 startup、workbench、concept-size、history、compact；`smoke-ubuntu-amd64` 包含生产应用 packaged 截图。

| 比较点 | 实际观察 |
|---|---|
| 信息结构 | 与概念保持左侧输入/设置、右侧预览/操作、底部全宽记录表 |
| 色彩 | 冷浅灰背景、白面板、深蓝文字、teal 主按钮保持一致 |
| 字体层级 | 30px 标题、21px 面板标题、15px 控件、13px 提示；内嵌 Noto Sans SC 400/700 修复干净 Ubuntu 中文缺字 |
| 容器与间距 | 细边框、8px 圆角、18–24px 间距；预览纸张控制在 340px 内；操作与字段不重叠 |
| 标签资产 | 显示实际编码黑白 PNG 和毫米/DPI 信息；像素字体属于热敏标签输出，不使用概念图替代实际条码 |
| 窄窗口 | 850px 截图字段和记录可读、无横向溢出；纵向滚动保留全部操作 |

视觉检查已修复码制标签换行、预览纸张比例和系统缺中文字体的问题。保持概念的信息层级与视觉系统，不声称像素级克隆。与概念有意不同：启动时空内容、未选择打印机、自动打印关闭；加入真实 AIM 配置、IP/端口、错误消息、提交状态和重打确认；码下文字为明确支持范围内的 ASCII 像素文字。

## 依赖与复现

精确版本与锁文件提交到仓库，CI 使用 `npm ci`。Legacy runtime 有独立锁文件；现代构建工具使用固定 Node 22.23.3。Actions 固定 commit SHA，checkout 不持久化 Git 凭据。现代和 legacy 的审计 JSON 随 smoke artifacts 保存；审计是当次数据库结果，不能消除旧 Electron 已终止维护的风险。详见 [依赖说明](DEPENDENCIES.md) 与 [实机验收清单](ACCEPTANCE.md)。
