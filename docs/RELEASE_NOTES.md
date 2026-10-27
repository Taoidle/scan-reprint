扫码重印首个正式发布版本。提供中文工作台、QR/Code128/EAN13/Data Matrix、可配置 AIM、精确保留输入、毫米尺寸/DPI/份数、预览、确认或自动打印、串行队列、重复保护、明确重打和本地历史。真实打印路径包括系统打印以及 ZPL/TSPL 网络位图。

下载对应系统的安装包，并使用 SHA256SUMS.txt 核对。build-info.json 记录本次 tag 构建的 commit、ref 和 Actions run。所有安装包由该 tag 的 Actions 重新构建，四目标通过后发布。

- legacy Windows x64：Electron 22.3.27，目标 Win7 SP1/8/8.1；已 EOL，独立依赖审计仍有已知 high 风险，仅限隔离环境使用。Windows Server 2022 CI 通过不等于 Win7 实机通过。
- modern Windows x64：Electron 44.9.3，Windows 10/11。
- Ubuntu 22.04+ amd64/arm64：分别提供 deb 与 AppImage；ARM64 在 Ubuntu 22.04 ARM64 容器验证。AppImage 需要 FUSE 2。
- 不含 Windows x86、macOS；无自动更新。所有包未签名，可能出现未知发布者/SmartScreen 提示。
- 未完成真实扫码枪、打印机、Win7、实体 ARM64 桌面与安装/卸载生命周期验收。CI 使用 mock socket/spooler 和真实 Electron，Linux runner 使用 Xvfb/--no-sandbox；不替代实机验收。
- “已提交”只确认系统/网络提交，不代表物理出纸；不确定结果必须人工核对。TSPL 仅连续纸。码下文字只支持 ASCII，中文内容使用 QR 并关闭码下文字。按内容和码制重建，不克隆原标签图像。

完整使用方法、限制和实机验收清单见仓库 README 与 docs/ACCEPTANCE.md。
