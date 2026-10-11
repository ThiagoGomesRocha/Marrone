require('dotenv').config({ path: process.env.DOTENV_PATH });

const isBenchmark = process.env.MARRONE_BENCHMARK === 'true';

const config = {
  appId: 'com.marrone.app',
  productName: isBenchmark ? 'Marrone Benchmark' : 'Marrone',
  extraMetadata: {
    marroneBuild: {
      benchmark: isBenchmark,
      builtAt: new Date().toISOString()
    }
  },
  electronVersion: '37.6.1',
  directories: {
    buildResources: 'resources',
    output: 'out'
  },
  extraResources: [
    {
      from: 'resources/data/sample-collection.json',
      to: 'data/sample-collection.json'
    }
  ],
  files: ['**/*'],
  npmRebuild: false,
  // O driver do DB2 (ibm_db) é N-API, então NÃO precisa de rebuild — mas o clidriver que
  // ele baixa são DLLs, e DLL não carrega de dentro do app.asar.
  // Ver: integracaoBD-v2.md §5 (gate G0) e packages/marrone-database/src/drivers/db2.ts.
  // Sem isso, o DB2 funciona em desenvolvimento e falha no aplicativo empacotado.
  //
  // `bindings` TAMBEM precisa estar aqui: ibm_db/lib/odbc.js faz
  // require('bindings')('odbc_bindings'), e o pacote `bindings` localiza o .node varrendo o
  // sistema de arquivos - dentro do asar isso falha com "Invalid package config".
  // Descoberto rodando o app EMPACOTADO (nao em desenvolvimento).
  asarUnpack: ['**/node_modules/ibm_db/**', '**/node_modules/bindings/**'],
  afterSign: 'notarize.js',
  mac: {
    artifactName: '${name}_${version}_${arch}_${os}.${ext}',
    category: 'public.app-category.developer-tools',
    target: [
      {
        target: 'pkg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'resources/icons/mac/icon.icns',
    hardenedRuntime: true,
    identity: 'Anoop MD (W7LPPWA48L)',
    entitlements: 'resources/entitlements.mac.plist',
    entitlementsInherit: 'resources/entitlements.mac.plist',
    notarize: false,
    requirements: 'resources/app-requirements.txt',
    protocols: [
      {
        name: 'Marrone',
        schemes: [
          'marrone'
        ]
      }
    ]
  },
  linux: {
    artifactName: '${name}_${version}_${arch}_${os}.${ext}',
    icon: 'resources/icons/png',
    target: [
      {
        target: 'AppImage',
        arch: ['x64', 'arm64']
      },
      {
        target: 'deb',
        arch: ['x64', 'arm64']
      },
      {
        target: 'rpm',
        arch: ['x64', 'arm64']
      }
    ],
    protocols: [
      {
        name: 'Marrone',
        schemes: ['marrone']
      }
    ],
    category: 'Development',
    desktop: {
      MimeType: 'x-scheme-handler/marrone;'
    }
  },
  deb: {
    // Docs: https://www.electron.build/configuration/linux#debian-package-options
    depends: [
      'libgtk-3-0',
      'libnotify4',
      'libnss3',
      'libxss1',
      'libxtst6',
      'xdg-utils',
      'libatspi2.0-0',
      'libuuid1',
      'libsecret-1-0',
      'libasound2' // #1036
    ]
  },
  win: {
    artifactName: 'marrone-setup-${version}.${ext}',
    icon: 'resources/icons/win/icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    sign: null,
    publisherName: 'Marrone'
  },
  nsis: {
    include: 'resources/installer.nsh',
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  pkg: {
    installLocation: '/Applications',
    isRelocatable: false
  }
};

module.exports = config;
