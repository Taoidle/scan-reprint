# YOVAL Scan Reprint：品牌与语言

产品名称统一为 **YOVAL Scan Reprint**，发布者元数据为 **广州铱川创新科技有限公司**。公司法定名称和商标不翻译。EXE 的 ProductName、CompanyName、安装/卸载入口和 Linux desktop 名称随包检查。现有 MIT LICENSE 的 Taoidle 版权和第三方许可保留。没有签名证书：元数据发布者不等于 Windows 验证发布者，SmartScreen/未知发布者提示仍可能出现。

## 选择语言

- Windows 交互安装的第一页提供 `跟随操作系统 / 简体中文 / English`。选择决定后续安装器页面的语言，并向当前用户写入首次启动语言建议。第一页故意双语，避免陌生语言下无法选择。
- `auto` 表示应用每次启动读取系统语言：英文匹配 English，中文匹配简体中文，其他/未知语言回落简体中文。它不是安装时把系统语言永久写成 `en` 或 `zh-CN`。
- 安装器使用 Windows UI 语言解析 auto；应用使用 Electron 系统 locale。区域/显示语言分开配置的系统，两者检测结果可能不同，固定选择中/英可消除差异。
- 静默安装支持 `/S /currentuser /APP_LANG=auto`、`/APP_LANG=zh-CN`、`/APP_LANG=en`；省略为 auto，非法值退出码 2。卸载使用安装时的中/英界面语言。
- Linux DEB/AppImage 没有本应用控制的交互安装向导，首次启动提供等效语言选择。Windows 全用户安装也不向其他用户写入偏好；每个新用户首次启动自行选择。
- 配置页的“界面语言 / Interface language”立即保存并应用，不需要重启。语言切换会暂停扫码，不会触发打印；需明确点击“开始扫码 / Start scanning”。打印配置另用“保存配置”保存。

## 数据与升级

保持原 package 名、appId（legacy 与 modern 各自原 ID）、`scan-reprint` 用户数据目录和历史配置格式。Windows `%APPDATA%/scan-reprint`、Linux `~/.config/scan-reprint`（遵循系统 appData 目录）继续存放 `settings.json` / `history.json`。

语言单独保存在用户数据目录 `language.json`：`{"version":1,"preference":"auto"}`，不含条码内容。安装目录不写配置。NSIS 的 `installer-language.txt` 只有经过枚举校验的 ASCII 偏好，应用只在没有语言设置时读取；已有选择（包括 auto）优先，升级不会覆盖。损坏语言文件不被安装建议覆盖；用户重新选择时先保留 `.backup-*` 原文件。

新日志详情为结构化 `code + params`，按当前 locale 呈现。旧版中文历史详情保留原文并标记“旧版记录原文”，条码 payload、打印机名、IP、用户内容均不翻译。日期/显示数字按 locale，文件和打印协议的机器数值不变。外部系统/驱动诊断保留原始信息，外围解释提供中英；内置错误全部来自消息目录。

## 验证及边界

所有测试和构建仅在 GitHub Actions。CI 增加：中英 key/占位符一致、源码文本边界、auto 三类解析、安装建议与显式偏好优先、首次启动/重启/损坏恢复、结构化与旧历史兼容；真实 Electron 切换语言/重启/不增加打印次数；四目标包的品牌/图标 smoke。

Windows runner 额外下载并校验原 v0.2.0 安装包，实际静默安装旧版、升级新版、启动英文应用、保存中文再升级、检查 EXE/卸载注册表名称与公司、卸载后保留配置/历史/语言；额外真实安装 zh-CN 与 auto 并启动核对继承，非法 APP_LANG 退出码 2。交互 NSIS 页有编译和源契约检查，尚未自动操作该页的鼠标选择、Back/Next 或截图；需人工安装验收。Windows runner 不是 Win7 实机。未验收真实扫码枪、打印机、签名信任、所有桌面图标位置。

本轮仅开发 PR 与 Actions 包，未合并/发布；v0.2.0 tag 保持不变。版本号暂保持 0.2.0（开发候选），正式发布前另行递增。
