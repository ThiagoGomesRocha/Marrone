module.exports = {
  rootDir: '.',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!strip-json-comments|nanoid|xml-formatter)/'
  ],
  moduleNameMapper: {
    // jsdom faz require('canvas') opcional; o binário nativo não é construído neste fork,
    // então sem este stub o suite inteiro falha ao carregar. Ver jest.canvasMock.js.
    '^canvas$': '<rootDir>/jest.canvasMock.js',
    '\\.(css|less|scss|sass)$': '<rootDir>/jest.cssMock.js',
    '^assets/(.*)$': '<rootDir>/src/assets/$1',
    '^components/(.*)$': '<rootDir>/src/components/$1',
    '^hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^themes/(.*)$': '<rootDir>/src/themes/$1',
    '^api/(.*)$': '<rootDir>/src/api/$1',
    '^pageComponents/(.*)$': '<rootDir>/src/pageComponents/$1',
    '^providers/(.*)$': '<rootDir>/src/providers/$1',
    '^utils/(.*)$': '<rootDir>/src/utils/$1',
    '^test-utils/(.*)$': '<rootDir>/src/test-utils/$1'
  },
  clearMocks: true,
  moduleDirectories: ['node_modules', 'src'],
  // Ambiente jsdom customizado: neutraliza o require('canvas') do jsdom, que sem isso
  // derruba o suite inteiro da app. Ver jest.jsdomEnvironment.js.
  testEnvironment: '<rootDir>/jest.jsdomEnvironment.js',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  setupFiles: [
    '<rootDir>/jest.setup.js'
  ],
  testMatch: [
    '<rootDir>/src/**/*.spec.[jt]s?(x)',
    '<rootDir>/plugins/**/*.spec.[jt]s?(x)'
  ]
};
