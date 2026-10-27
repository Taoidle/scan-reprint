# 验证与设计记录

## 实际状态

- 已克隆公开空仓库，建立本地 README 基线并创建开发分支。
- 未在本机执行测试、构建或应用启动；遵守仅 GitHub Actions 验证要求。
- **实际 Actions 验证进行中，尚无通过记录。** 远端已建立 main 基线，本地实现已整合，使用 GitHub 连接器提交开发分支。
- 未使用真实扫码枪、打印机或 Win7 机器验收。

## 设计依据

使用 frontend-app-builder 与 imagegen 技能生成完整工作台概念；参考图位于 `generated_images/exec-cf7ca9ae-160d-4414-b6a9-32d00b9a6f0a.png`，已通过 view_image 检查。概念原图 1505×1045，应用首选窗口 1440×1000。任务允许自主设计，不需要额外审批。

设计库存：标题“扫码重印 / Scan Reprint”；左侧扫码输入、保留文本提示、码制/AIM、尺寸/DPI/份数/文字、输出/打印机/自动打印；右侧位图预览、确认打印、重新聚焦扫码；全宽打印记录表；底部提交语义提示。所有功能控件为真实 DOM，标签为实际编码 PNG，概念中的 QR 不作为生产资产。

Tokens：背景 #f4f6f8，白色面板，文字 #14203a，辅助 #69758c，边框 #dce3eb，主按钮 #087e80；8 px 圆角，18–24 px 布局间距；本地 Segoe UI / Microsoft YaHei / Noto Sans CJK SC 字体回退。h1 30 px、h2 21 px、正文/控件 15 px、辅助 13 px。无装饰图标、渐变或远程字体。

组件：App 组合状态与输入；SettingsPanel 打印参数；History 历史表；共享模型；主进程校验、位图、spooler、socket、队列模块分离。850 px 最小窗口，窄宽度 CSS 单列作为额外回退。

## 待执行的视觉一致性核对

| 比较点 | 概念 | 实现意图 | 实际渲染证据 |
|---|---|---|---|
| 信息结构 | 双栏工作台 + 底部记录 | 已照此实现 | 等待 CI workbench.png |
| 背景/主色 | 冷浅灰、白、teal | 同色 tokens | 等待 CI |
| 字体层级 | 强标题、明确标签、小提示 | 明确控件字号与本地字体 | 等待 CI |
| 容器/间距 | 细边框、8px 圆角、开放预览 | 相同结构和比例 | 等待 CI |
| 标签资产 | 预览纸张 + QR | 实际打印 PNG，无概念静态图替代 | 等待 CI |
| 窄窗口 | 未给出 | 同视觉系统，避免横向溢出 | 等待 compact.png |

不能在未看到 CI 渲染前宣称已达到像素一致或视觉验收通过。实际 QA 采用 Actions 内 Playwright Electron，因为用户禁止本机启动测试/构建，不能用本机 Browser/IAB 替代。CI 截图下载后须用 view_image 与概念直接对照。

有意偏离概念：默认空内容、无打印机选择、自动打印关闭（避免误打）；增加 AIM 配置、IP/端口、队列状态、错误消息、重打确认等功能必需 UI；初始预览为空标签，不展示虚构已扫描条码；底部补充内容重建边界。主按钮使用纯色。首屏文案差异均来自实际操作与安全状态，不增加营销说明。

## CI 覆盖

- lint、strict TypeScript、生产依赖 audit。
- 保留文本、AIM allowlist、GS1/控制符/无效 Unicode 拒绝、EAN 校验、尺寸/份数/IP/端口边界。
- QR/Code128/EAN13/Data Matrix 实际位图由独立 ZXing 解码；ZPL 十六进制与 TSPL 定长二进制/白色极性断言。
- 本地 mock TCP server 接收精确字节；mock spooler 成功、失败、抛错、超时。
- 队列串行、提交中新任务、去重、明确重打、持久化失败、重启中断、不可变快照。
- Electron UI：隔离验证、输入/预览、系统 seam 提交、重复保护、重打确认、自动打印、URL 不导航、850px 布局，保存截图。
- 四目标安装包与 SHA256；Windows 两个 runtime smoke、Ubuntu22 amd64 smoke、ARM64 Ubuntu22 容器 smoke。

## 静态审查修复（随后交由 Actions 验证）

- 移除 textarea maxlength，避免扫描 >1024 字符被浏览器截断后误印；主进程仍拒绝超限完整输入，增加 UI 验证用例。
- 提交时先捕获并清空本次输入，下一条输入不再被前一次异步完成清除；预览绑定请求快照，错误分开显示。
- 重打确认改用原生 modal dialog，隔离后台焦点和自动打印快捷键，Escape 可取消。
- 历史文件 4 MiB 上限、ID/时间/状态/标签一致性校验；只保留已知字段；临时文件 fsync 后才 rename，成功后才允许提交。新增存储测试。
- 系统打印准备操作设置超时，限定只打印第一页以免毫米换算溢出产生额外空白页；新增准备超时与位图白边/padding 用例。
- Legacy Electron 使用独立 manifest + 锁文件 `runtimes/legacy/`，CI npm ci 安装，不再临时无锁替换依赖。
- 四目标均加入生产打包可执行文件 smoke；ARM64 的源码与打包应用均在 Ubuntu22.04 容器启动；检查每目标安装文件类型齐全。
- Actions 固定到已核对的 commit SHA，checkout 不持久化 Git 凭据；容器 Node 下载增加 SHA256 校验。
- 只读检查确认当前 PATH 及 `/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin` 未发现 gh。恢复 GitHub App 授权也可继续远端工作，不要求必须在 Mac 登录。
