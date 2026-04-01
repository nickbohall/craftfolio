module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Stub out native modules that can't run in Node
  moduleNameMapper: {
    '^../constants/colors$': '<rootDir>/src/constants/colors.ts',
  },
};
