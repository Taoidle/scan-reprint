# YOVAL Scan Reprint

Publisher metadata: **广州铱川创新科技有限公司**. This is an unsigned development build. A metadata company name does not provide a verified Windows publisher signature.

1. On Windows, choose **Follow system / 简体中文 / English** on the first installer page. On Linux, choose at first launch. Existing users' saved preferences take priority over installer choices.
2. **Follow system** matches English or Chinese at each app launch; unsupported or unknown languages fall back to Simplified Chinese. Change it at any time in **Configuration → Interface language**. Switching language pauses scanning and never prints.
3. Choose the symbology, label size, DPI and print destination, then **Save configuration**. The default is one copy. Use **Manual test** to verify content and the physical printout first.
4. Configure your USB HID scanner for keyboard mode with an **Enter suffix**. Click **Start scanning**, keep the app in the foreground, then scan. No input-box focus is needed.
5. Each complete scan is queued. Duplicate codes can print every time or be blocked within a configured time window. Opening configuration, dialogs, leaving the app or pressing Esc pauses scanning. Click Start scanning to resume.
6. A submitted job only confirms system/network submission, not physical output. Check the printer before using **Explicit reprint**. Failed or uncertain jobs are never retried automatically.

Barcode content, spaces, leading zeroes and letter case are preserved. Symbology is never guessed. GS1/FNC1, binary data and control characters are not supported. Scanned URLs are data only; the app does not navigate to them.

The historical `scan-reprint` user data folder and application IDs are preserved. Configuration and history survive normal upgrades and uninstalls. New messages are translated at display time; legacy Chinese history details retain their original wording. User content, printer names and the legal company name are not translated.

Windows x64 legacy (Electron 22, EOL), modern Windows x64 and Ubuntu 22.04+ amd64/arm64 are built in Actions. No Windows x86 or macOS build is included. Physical scanners/printers and actual Win7 machines still require acceptance testing. The interactive installer page has compile/contract coverage; mouse-driven installer interactions remain a manual check. See [branding and language implementation notes](BRANDING-I18N.md).
