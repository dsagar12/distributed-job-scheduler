module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000,
  roots: ['<rootDir>/../../tests/concurrency', '<rootDir>/../../packages'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^@scheduler/types$': '<rootDir>/../../packages/types/src',
    '^@scheduler/shared$': '<rootDir>/../../packages/shared/src',
    '^@scheduler/database$': '<rootDir>/../../packages/database/src',
  },
};
