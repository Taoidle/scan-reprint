# YOVAL Scan Reprint — 未发布开发候选 / Unreleased

本轮为品牌与中英 i18n 更新，仅交付开发 PR 和 Actions 安装包，尚未合并或发布新 tag。安装包版本号暂保持 0.2.0，不能当作原 v0.2.0 Release 的替代附件；正式发布前须单独递增版本并从新 tag 构建。

- 产品统一命名 **YOVAL Scan Reprint**，发布者元数据 **广州铱川创新科技有限公司**。窗口、应用界面、EXE 版本信息、安装/卸载入口、Linux desktop 信息统一；原应用 ID、用户数据路径和条码 payload 保持不变。
- Windows 安装第一页选择 **跟随系统 / 简体中文 / English**，控制后续安装器文字并提供当前用户的应用首次语言。Linux 在首次启动选择。已保存的语言优先，升级不会覆盖。
- `auto` 每次启动匹配系统中/英语言，其他或未知语言回落简体中文。配置页可随时切换并持久化；切换会暂停扫码，不触发打印。
- 工作台、配置、手工测试、弹窗、状态、提示与校验错误使用中英消息目录。新历史详情保存结构化 code/params，按当前语言显示；旧中文详情保留原文，打印机名和用户内容不翻译。
- 沿用明确开始/暂停、完整 HID + Enter 扫描帧、可配置重复码、串行队列、失败/不确定不自动重打和原创应用图标。

English: this unreleased candidate introduces YOVAL branding and a per-user Chinese/English language preference. Choose the installer/first-run language or change it in Configuration. Follow system resolves English or Chinese on each launch and falls back to Chinese otherwise. Upgrades preserve existing settings, history and language choices. Switching language never starts scanning or prints a label. See [English quick start](QUICKSTART.en.md).

全部测试与构建仅在 GitHub Actions，包括四目标 Electron UI/生产包、语言与输入边界、Windows 实际静默安装旧版后升级/启动/卸载、品牌元数据与图标资源。交互 NSIS 鼠标操作、真实扫码枪/打印机及 Win7 实机仍需人工验收。详细验证结果以 PR 的最终 SHA/run 为准。

兼容限制：Windows legacy x64 使用已 EOL 的 Electron 22.3.27，现代 Windows x64 与 Ubuntu 22.04+ amd64/arm64 使用独立现代运行时；不含 Windows x86/macOS。安装包未签名，公司元数据不代表 Windows 已验证发布者。所有打印提交均不承诺物理出纸。MIT 和第三方版权保留。既有 v0.1.0/v0.2.0 tag 与 Release 不变。

[语言、升级与验证说明](BRANDING-I18N.md) · [使用教程](../README.md) · [现场验收](ACCEPTANCE.md)
