const base = require('./jest-e2e.json');

module.exports = {
  ...base,
  rootDir: '..',
  moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' },
  testRegex: 'order-management-mvp[.]e2e-spec[.]ts$',
  collectCoverageFrom: [
    'src/modules/notifications/**/*.ts',
    'src/modules/order-management/**/*.ts',
    'src/modules/production-boards/**/*.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/order-management-mvp',
};
