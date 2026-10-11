module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/tests/**/*.(test|spec).(js|ts)'],
  collectCoverageFrom: [
    'src/**/*.(js|ts)',
    '!src/**/*.d.ts'
  ],
  setupFilesAfterEnv: []
};
