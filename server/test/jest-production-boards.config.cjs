const base = require('./jest-e2e.json');

module.exports = {
  ...base,
  rootDir: '..',
  moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' },
  testRegex:
    '(production-boards[.]e2e-spec|add-production-boards[.]migration[.]spec)[.]ts$',
  collectCoverageFrom: [
    'src/modules/production-boards/**/*.ts',
    'src/modules/database/database-transaction.ts',
    'src/modules/database/migrations/sqlite/1788900000000-AddProductionBoards.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/production-boards',
};
