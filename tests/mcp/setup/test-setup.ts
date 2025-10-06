/**
 * MCP Test Suite Global Setup
 * Configures Jest environment for MCP conformance testing
 */

import { jest } from '@jest/globals';

// Extend Jest timeout for slower operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Keep errors visible
};

// Add custom matchers for MCP-specific assertions
expect.extend({
  toBeValidMCPResponse(received: any) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      ('result' in received || 'error' in received);

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid MCP response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid MCP response with 'result' or 'error'`,
        pass: false,
      };
    }
  },

  toHaveMCPError(received: any) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      'error' in received &&
      typeof received.error === 'object' &&
      'code' in received.error &&
      'message' in received.error;

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to have MCP error`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to have MCP error with code and message`,
        pass: false,
      };
    }
  },

  toMatchMCPSchema(received: any, expected: any) {
    // Simple schema matching - can be enhanced with JSON Schema validator
    const receivedKeys = Object.keys(received || {}).sort();
    const expectedKeys = Object.keys(expected || {}).sort();
    const pass = JSON.stringify(receivedKeys) === JSON.stringify(expectedKeys);

    if (pass) {
      return {
        message: () => `expected schema not to match`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(receivedKeys)} to match ${JSON.stringify(expectedKeys)}`,
        pass: false,
      };
    }
  },
});

// Type augmentation for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidMCPResponse(): R;
      toHaveMCPError(): R;
      toMatchMCPSchema(schema: any): R;
    }
  }
}

// Setup global test utilities
beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  jest.clearAllMocks();
});
