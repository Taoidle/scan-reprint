const legacy = process.env.LEGACY === '1';
module.exports = {
  appId: legacy ? 'com.taoidle.scanreprint.legacy' : 'com.taoidle.scanreprint',
  productName: 'YOVAL Scan Reprint',
  copyright:'Copyright (c) 2026 Taoidle',
  electronVersion: legacy ? '22.3.27' : '44.9.3',
  directories: {output:'release'}, files:['dist/**/*','package.json'],
  asar:true, npmRebuild:false,
  artifactName: `scan-reprint-\${version}-${legacy ? 'legacy' : 'modern'}-\${os}-\${arch}.\${ext}`,
  win:{target:[{target:'nsis',arch:['x64']}],icon:'build/icon.ico',signAndEditExecutable:true,publisherName:'广州铱川创新科技有限公司'},
  nsis:{installerIcon:'build/icon.ico',uninstallerIcon:'build/icon.ico',include:'installer/language.nsh',installerLanguages:['zh_CN','en_US'],language:'2052',displayLanguageSelector:false,shortcutName:'YOVAL Scan Reprint',uninstallDisplayName:'YOVAL Scan Reprint',oneClick:false,perMachine:false,allowToChangeInstallationDirectory:true},
  linux:{icon:'build/icons',target:['deb','AppImage'],category:'Utility',maintainer:'广州铱川创新科技有限公司 <me@mail.taoidle.com>',
    executableName:'scan-reprint'},
  deb:{depends:['libgtk-3-0','libnss3','libasound2','libxss1','libgbm1','libatk-bridge2.0-0','libdrm2']}
};
