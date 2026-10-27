# Scan Reprint v0.2.0

本次更新将主界面改为“配置一次，开始扫码”的工作台，并加入原创应用图标。

- 保存打印机、标签尺寸、DPI、码制、份数与重复码策略，重开后保留；默认每次扫描 1 份。配置校验、版本迁移和损坏文件备份恢复独立于打印历史，设置文件不保存条码内容。
- 配置扫码枪为 USB HID 键盘模式 + Enter 后缀，点击“开始扫码”后，在应用前台连续扫描即可自动加入串行打印队列，无需反复点击输入框。键盘操作可聚焦开始按钮后按 Alt+Enter；普通 Enter/空格不会意外启动。
- 暂停、Esc、切出应用、打开配置/手工测试或弹窗会停止接收并丢弃半帧；返回后需明确开始。没有后台系统级键盘监听。暂停仅停止新扫描，已入队任务仍按序处理。
- 相同码可以每次完整扫描都打印，或按 100–60000 ms 自选防抖窗口拦截；同一会话帧重复提交只入队一次。失败或不确定结果不自动重打。
- 手工输入移到独立“手工测试”区，需确认试印。保留前导零、大小写与空格，不猜码制，不支持的 GS1/FNC1、二进制、控制字符明确拒绝。
- 原创深蓝/青绿扫描框、条码与回转箭头图标；SVG 统一生成 Windows 多尺寸 ICO、Linux PNG，并配置安装包、EXE 和应用窗口资源。

升级后首次打开请进入“配置”选择打印机并保存，再到“手工测试”试印，确认纸张与 DPI 后开始扫码。0.1.0 没有持久化设置，因此首次升级需要配置；已有本机历史保留，每次启动始终暂停。无自动更新，请下载对应系统的新安装包。

六个安装文件由本次 tag 的 GitHub Actions 重新构建，包含 Windows legacy/modern x64 EXE、Ubuntu amd64/arm64 各 deb 和 AppImage。请用 SHA256SUMS.txt 核对下载；build-info.json 记录本次构建的 commit、tag 和 Actions run。发布前验证 lint、typecheck、38 项单元测试、真实 Electron 工作流与四目标生产包 smoke、图标资源和六包 SHA256。

兼容与验收边界：

- legacy Windows x64：Electron 22.3.27，目标 Win7 SP1/8/8.1；已 EOL，独立依赖审计仍存在已知 high 风险，仅限隔离环境使用。Windows Server 2022 CI 通过不等于 Win7 实机通过。
- modern Windows x64：Electron 44.9.3，Windows 10/11。
- Ubuntu 22.04+ amd64/arm64：ARM64 在原生 ARM runner 的 Ubuntu 22.04 容器验证；AppImage 需要 FUSE 2。
- 不含 Windows x86、macOS。所有包未签名，Windows 可能提示未知发布者/SmartScreen。
- 真实扫码枪、打印机、Win7、实体 ARM64 桌面、切换到其他 OS 程序、安装/卸载与任务栏/开始菜单图标缓存尚未实机验收。CI 使用 mock socket/spooler 和真实 Electron；窗口 blur 使用原生事件注入，Linux 使用 Xvfb/--no-sandbox，不能代替现场验收。
- “已提交”仅表示系统/网络接受，不代表物理出纸。失败/不确定时先核对设备，再明确重打。TSPL 仅连续纸；码下文字仅 ASCII，中文 QR 需关闭码下文字。按内容和码制重建，不克隆原标签图像。

详细教程见 README，现场验收清单见 docs/ACCEPTANCE.md。v0.1.0 tag 和原 Release 保持不变。
