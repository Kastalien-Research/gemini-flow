/**
 * Test Message Factories
 * 
 * Provides factory functions for creating test A2A messages
 */

import { A2AMessage } from "../../src/types/a2a.js";

/**
 * Create a basic test A2A message
 */
export function createTestMessage(
  overrides: Partial<A2AMessage> = {},
): A2AMessage {
  return {
    jsonrpc: "2.0",
    method: "test.method",
    params: { test: "data" },
    id: "test-msg-001",
    from: "test-agent-001",
    to: "test-agent-002",
    timestamp: Date.now(),
    messageType: "request",
    ...overrides,
  };
}

/**
 * Create a message with custom params
 */
export function createTaskRequestMessage(
  from: string,
  to: string,
  task: any,
): A2AMessage {
  return createTestMessage({
    method: "task.request",
    from,
    to,
    params: { task },
    id: `task-${Date.now()}`,
  });
}

/**
 * Create an authentication message
 */
export function createAuthMessage(from: string, to: string): A2AMessage {
  return createTestMessage({
    method: "auth.authenticate",
    from,
    to,
    params: {
      provider: "test-provider",
      credentials: {
        type: "test",
      },
    },
    id: `auth-${Date.now()}`,
  });
}

/**
 * Create a ping message
 */
export function createPingMessage(from: string, to: string): A2AMessage {
  return createTestMessage({
    method: "system.ping",
    from,
    to,
    params: {},
    id: `ping-${Date.now()}`,
  });
}

/**
 * Create a message with old timestamp (for replay attack testing)
 */
export function createExpiredMessage(
  ageMinutes: number = 10,
): A2AMessage {
  return createTestMessage({
    timestamp: Date.now() - ageMinutes * 60 * 1000,
  });
}

/**
 * Create a message with future timestamp
 */
export function createFutureMessage(
  minutesInFuture: number = 10,
): A2AMessage {
  return createTestMessage({
    timestamp: Date.now() + minutesInFuture * 60 * 1000,
  });
}

/**
 * Create multiple test messages
 */
export function createMultipleMessages(
  count: number,
  fromAgent: string,
  toAgent: string,
): A2AMessage[] {
  const messages: A2AMessage[] = [];

  for (let i = 0; i < count; i++) {
    messages.push(
      createTestMessage({
        id: `msg-${i.toString().padStart(3, "0")}`,
        from: fromAgent,
        to: toAgent,
        params: { index: i },
      }),
    );
  }

  return messages;
}
