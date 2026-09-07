const base = require('./jest-e2e.json');

module.exports = {
  ...base,
  rootDir: '..',
  moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' },
  testRegex: 'order-management[.]e2e-spec[.]ts$',
  collectCoverageFrom: ['src/modules/order-management/**/*.ts'],
  coverageDirectory: '<rootDir>/coverage/order-management',
};
