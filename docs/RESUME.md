# 开发与验证约束

测试、构建、应用 smoke 全部通过 GitHub Actions；本机只编辑与 Git 操作。开发分支 `feat/desktop-reprint`。用户已授权通过验证后合并 main、创建匹配 package version 的新 tag，并正式发布；不得覆盖既有 tag。正式包必须来自 tag 同 SHA 的完整 Actions 构建。

依赖通过精确版本和两个 npm lockfile 固定；仅生成 lockfile 时使用 package-lock-only / ignore-scripts，不在本机执行安装脚本。

每次修复后跟进对应 commit 的 Actions，检查 verify 与四目标 packages。下载实际 CI 截图核对视觉效果；安装包必须包含 SHA256SUMS。Win7、扫码枪和打印机实机验收未完成时保持明确标注。

实际结果与限制记录在 VERIFICATION.md 和 ACCEPTANCE.md 中。
