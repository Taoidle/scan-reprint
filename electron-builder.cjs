const legacy = process.env.LEGACY === '1';
module.exports = {
  appId: legacy ? 'com.taoidle.scanreprint.legacy' : 'com.taoidle.scanreprint',
  productName: legacy ? 'Scan Reprint Legacy' : 'Scan Reprint',
  electronVersion: legacy ? '22.3.27' : '44.9.3',
  directories: {output:'release'}, files:['dist/**/*','package.json'],
  asar:true, npmRebuild:false,
  artifactName: `scan-reprint-\${version}-${legacy ? 'legacy' : 'modern'}-\${os}-\${arch}.\${ext}`,
  win:{target:[{target:'nsis',arch:['x64']}],signAndEditExecutable:false},
  nsis:{oneClick:false,perMachine:false,allowToChangeInstallationDirectory:true},
  linux:{target:['deb','AppImage'],category:'Utility',maintainer:'Taoidle <me@mail.taoidle.com>',
    executableName:'scan-reprint',depends:['libgtk-3-0','libnss3','libasound2','libxss1','libgbm1','libatk-bridge2.0-0','libdrm2']}
};
