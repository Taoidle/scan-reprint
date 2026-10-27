# 扫码重印 · Scan Reprint

中文 Electron 桌面标签重印工具。面向 **USB 键盘模式扫码枪**，也可手工输入模拟。按照扫描得到的**内容与指定码制**重新生成标签，不复制原标签图像、排版或私有编码。

> [四目标自动化验证已通过](https://github.com/Taoidle/scan-reprint/actions/runs/40477025441)，安装包由 GitHub Actions 生成，开发记录见 [PR #1](https://github.com/Taoidle/scan-reprint/pull/1)。真实扫码枪、打印机和 Win7 实机尚未验收；详见 [验证证据与限制](docs/VERIFICATION.md)。

## 支持范围

| 安装包 | Electron | 目标系统 | 说明 |
|---|---|---|---|
| legacy Windows x64 `.exe` | 22.3.27 | Windows 7 SP1 x64 / 8 / 8.1 | 最后支持 Win7 的系列，已 EOL；仅隔离环境使用 |
| modern Windows x64 `.exe` | 44.9.3 | Windows 10/11 x64 | 与 legacy 共用业务代码，独立应用 ID |
| Ubuntu amd64 `.deb` / `.AppImage` | 44.9.3 | Ubuntu 22.04+ amd64 | CI 在 22.04 执行真实 Electron smoke |
| Ubuntu arm64 `.deb` / `.AppImage` | 44.9.3 | Ubuntu 22.04+ arm64 | 原生 ARM64 runner 打包，在 ARM64 Ubuntu 22.04 容器验证运行时 |

本次**不含 Windows x86 / ia32**，不构建 macOS。Win7 包在 Windows Server 2022 runner 打包和运行并不证明 Win7 可用，必须在真实 Win7 SP1 x64 上验收。现代 Linux 使用 Electron 官方二进制，无应用层原生模块；ARM64 构建并非在 x64 主机假装交叉验证。AppImage 需要 FUSE 2；Ubuntu 可安装 `libfuse2`，或优先使用 `.deb`。Linux 打印需要可用 CUPS 队列与对应驱动。

所有包**未签名**，Windows 可能出现未知发布者/SmartScreen 提示。从本仓库 [Releases](https://github.com/Taoidle/scan-reprint/releases) 或指定 Actions run 下载并核对 SHA256；不存在自动更新。

## 使用

1. 安装适合系统的包，打开程序；系统打印先安装并测试打印机驱动。选择打印机，核对实际纸张与 DPI。
2. 选择码制。未开启 AIM 时，所有字符按所选码制处理；**不会根据内容猜码制**。
3. 光标置于“扫码内容”。将扫码枪设为 USB HID 键盘模式、匹配操作系统键盘布局，以 Enter 为结束后缀。不要启用 Tab、多次 Enter 或额外前后缀。无硬件时直接输入。
4. 默认手动确认：输入后核对预览，按“确认打印”。开启“自动打印”后，扫码框接收 Enter 即提交，不再逐条确认；每次启动默认关闭自动打印。
5. 记录按顺序提交。相同内容和码制在 5 秒内再次扫描会拦截；需要重打时点记录中的“明确重打”，再确认。重打沿用原记录的标签、份数和目标打印机/IP。
6. 查看记录状态并核对实物。**“已提交”只表示系统接受或 socket 写出，绝不代表已出纸。** 缺纸、断电、驱动静默丢弃等需现场检查。

标签范围 20–150 mm，203/300 DPI，1–100 份。预览来自最终打印用的黑白位图，按整倍数模块生成，不缩小成模糊条码。码内容过长或标签过小时明确报错；静区包含在位图内。屏幕预览不是物理尺，必须做尺寸校准。

## 内容与 AIM

- QR Code：Unicode 文本；不承诺原始字节、ECI 或二进制复现。
- Code 128：可打印 ASCII；不允许 FNC1/GS1。
- EAN-13：完整 13 位数字，严格校验最后一位；保留前导零，不自动补位。
- Data Matrix：本版本仅可打印 ASCII；Unicode 请使用 QR。
- 不静默 trim，不改变大小写。换行、Tab、NUL、GS、其他 C0/C1 控制符及无效 Unicode 明确拒绝。
- 码下文字仅支持可打印 ASCII。中文 QR 需取消“显示码下文字”；不会用错误字体悄悄替换文字。
- AIM 可开关，并逐项允许 `]Q1` → QR、`]C0` → Code 128、`]E0` → EAN-13、`]d1` → Data Matrix。`]E0` 下仍要求 13 位合法 EAN，不将 UPC/EAN-8 猜成 EAN-13。
- AIM 开启且数据以 `]` 起始时，未知/未勾选/GS1 AIM 均拒绝。关闭 AIM 时，前缀作为普通内容保留。对于没有携带标识的文本，无法识别其原始业务语义；操作员必须选择正确码制，**禁止把 GS1 输入当作普通码重印**。
- 扫描 URL 只作为数据，程序不打开链接、不联网取图。

## 真实打印路径

**系统打印**：通过 Electron `webContents.print` 将最终 PNG 放入严格毫米纸张页面，传递明确设备名称、份数、DPI 和无边距选项。打印机驱动仍可能忽略自定义纸张/缩放/DPI。必须在驱动中校准纸张并实测，不支持自动推断驱动能力。

**ZPL 网络打印**：向指定 IPv4/IPv6 与端口（默认 9100）发出 `^GFA` 十六进制单色位图，含宽高与份数。打印机须支持 ZPL II 图形命令，DPI 必须与设备匹配。

**TSPL 网络打印**：向同样的 raw TCP 端口发出固定长度二进制 `BITMAP`（按 TSPL 白色位极性）和 `PRINT`。范围是 **TSPL/TSPL2 连续纸（GAP 0）**；本版本不配置间隙纸、黑标、切刀或剥离模式。其他介质请用系统驱动或另行实现并验收。

扫描内容只进入条码编码器，绝不作为 ZPL/TSPL 命令拼接。用户输入的 `^XZ`、`~JA`、引号等变成条码图形。尺寸、份数、端口和 IP 由主进程严格校验。网络写入后异常或系统回调失败/超时被保守标记为“结果不确定”，不自动重试。

没有打印机状态回读、纸张传感器确认、端到端 exactly-once 保证或厂商通用兼容承诺。raw TCP 无加密，仅用于受信任局域网打印机。

## 队列与本地数据

同时最多 50 个待处理任务，串行提交。保存最近 200 条历史，内容明文保存在 Electron 用户数据目录的 `history.json`，不会上传。若内容敏感，请按当地策略保护用户目录。设置仅在当前会话保留，打印机与自动打印每次启动需重新选择。

历史先写临时文件、fsync、原子替换成功后再发送。异常退出后，原“提交中”变成“结果不确定”；原“排队中”变成“失败/未自动恢复”，**不在重启后悄悄继续出纸**。磁盘写入失败阻止新提交，提交后保存失败则标为不确定。损坏的历史不会被覆盖；退出应用，备份后将 `history.json` 移走，再启动恢复。请先核对是否有未确认任务。

用户数据位置通常为 `%APPDATA%/scan-reprint`（Windows）或 `~/.config/scan-reprint`（Linux），以 Electron 实际 `userData` 为准。卸载前自行处理敏感历史。

## 开发与 CI

依照项目要求，**测试与构建全部通过 GitHub Actions**；本机仅编辑、生成不执行脚本的 npm 锁文件与 Git 操作。开发分支建立 PR 后，每次推送会运行 Actions 的 “Verify and package”；也支持手动触发。

工作流先运行 lint、TypeScript 检查、unit（含 ZXing 像素解码回环）、完整根依赖树审计、真实 Electron UI smoke，然后构建四个目标。四目标另启动打包后的生产可执行文件检查预览和隔离。Windows legacy smoke 通过独立锁文件安装 22.3.27；现代使用 44.9.3。ARM64 在 Ubuntu 22.04 容器启动真实 Electron，检查最低 glibc/系统库兼容。CI smoke 的虚拟系统打印机仅在 **未打包且 `SCAN_REPRINT_SMOKE=1`** 时启用；安装包始终使用真实打印实现。

成功 run 的 Artifacts 中下载 `scan-reprint-windows-legacy-x64`、`scan-reprint-windows-modern-x64`、`scan-reprint-ubuntu-amd64`、`scan-reprint-ubuntu-arm64`，包含安装文件及 `SHA256SUMS.txt`；界面截图作为独立 smoke artifacts 保存。Actions artifact 保留期 30 天，下载需登录 GitHub；正式 Release 附件独立保存。普通验证仅使用读取权限；tag 发布 job 才拥有 contents:write，用于创建草稿、上传并验证附件后发布。

应用主进程、preload、渲染层分离，启用 contextIsolation、sandbox、CSP、禁用 Node integration、拒绝非主窗口/子帧 IPC，阻止导航、新窗口、远程请求与权限请求。全部脚本、样式和内嵌中文字体均为本地资源。生产代码编译目标 Node16/Chromium108，避免现代语法破坏 legacy 版。

## 参考与验收

- [实机验收清单](docs/ACCEPTANCE.md)
- [依赖与安全说明](docs/DEPENDENCIES.md)
- [设计规范与验证状态](docs/VERIFICATION.md)
- [Electron Windows 7/8/8.1 终止支持](https://www.electronjs.org/blog/windows-7-to-8-1-deprecation-notice)
- [Electron 22 打印 API](https://github.com/electron/electron/blob/v22.3.27/docs/api/web-contents.md)
- [bwip-js](https://github.com/metafloor/bwip-js)
- [TSC TSPL/TSPL2 手册](https://fs.tscprinters.com/en/dl/1/2541)

## 正式发布流程

版本号由 package.json 决定，tag 必须为相同的 vX.Y.Z。先通过 PR 的完整 CI（含四目标安装包组合与校验检查）再合并 main。运行 Actions 的 **Create release tag**，选择 main 并输入新 tag；已有 tag 会被 GitHub 拒绝，流程不覆盖 tag。该工作流使用短期 GITHUB_TOKEN 创建 tag，并显式 dispatch Verify and package 到这个 tag，因为 GITHUB_TOKEN 产生的普通 push 不会再次触发工作流。外部创建的 v*.*.* tag push 同样支持。

正式构建从 tag 重新 checkout，执行完整验证和四目标构建，不复用 PR/main 的安装包。组合 job 只下载本次 run 的四目标 artifact，严格核对六个安装文件与校验值，生成总 SHA256SUMS.txt 和记录 commit/ref/run 的 build-info.json。发布 job 创建草稿并上传，逐一核对 GitHub 附件名称、大小和 SHA256 后才公开发布。失败时保留诊断或草稿，不自动覆盖已有 Release；修复发布需核实当前状态后处理，不能移动已有 tag。发布范围和实机限制见 docs/RELEASE_NOTES.md。
