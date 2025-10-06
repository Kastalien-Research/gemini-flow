import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '../..',
  testMatch: ['<rootDir>/tests/mcp/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        moduleResolution: 'node',
        target: 'ES2022',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  collectCoverageFrom: [
    'src/mcp/**/*.ts',
    '!src/mcp/**/*.d.ts',
    '!src/mcp/**/*.test.ts',
  ],
  coverageThresholds: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  setupFilesAfterEnv: ['<rootDir>/tests/mcp/setup/test-setup.ts'],
  testTimeout: 30000,
  verbose: true,
  maxWorkers: '50%',
};

export default config;
