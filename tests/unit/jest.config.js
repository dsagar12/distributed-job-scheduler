module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/../../tests/unit', '<rootDir>/../../packages'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^@scheduler/types$': '<rootDir>/../../packages/types/src',
    '^@scheduler/shared$': '<rootDir>/../../packages/shared/src',
    '^@scheduler/database$': '<rootDir>/../../packages/database/src',
  },
};
