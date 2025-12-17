/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ora|cli-spinners|cli-cursor|restore-cursor|onetime|mimic-fn|is-interactive|is-unicode-supported|string-width|strip-ansi|ansi-regex|emoji-regex|log-symbols|figures)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10000,
  testPathIgnorePatterns: [
    '/node_modules/',
    'src/registry/__tests__/installer.test.ts',
    'src/registry/__tests__/cache.test.ts',
    'src/registry/__tests__/config-manager.test.ts',
    'src/registry/__tests__/resolvers/local-resolver.test.ts',
    'src/registry/__tests__/resolvers/manifest-resolver.test.ts',
    'src/registry/__tests__/schemas/manifest.test.ts',
    'src/registry/__tests__/schemas/config.test.ts',
  ],
};
