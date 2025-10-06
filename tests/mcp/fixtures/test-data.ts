/**
 * Test Data and Fixtures for MCP Conformance Tests
 */

export const MOCK_TOOLS = {
  simple: {
    name: 'test_tool',
    description: 'A simple test tool',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' },
      },
      required: ['input'],
    },
  },
  complex: {
    name: 'complex_tool',
    description: 'A complex tool with nested schema',
    inputSchema: {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['fast', 'slow'] },
            retries: { type: 'number', minimum: 0, maximum: 10 },
          },
          required: ['mode'],
        },
        data: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['config'],
    },
  },
  multiPart: {
    name: 'multipart_tool',
    description: 'Tool that returns multiple content types',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
};

export const MOCK_PROMPTS = {
  simple: {
    name: 'test_prompt',
    description: 'A simple test prompt',
    arguments: [],
  },
  withArgs: {
    name: 'parameterized_prompt',
    description: 'A prompt with arguments',
    arguments: [
      {
        name: 'topic',
        description: 'The topic to write about',
        required: true,
      },
      {
        name: 'style',
        description: 'Writing style',
        required: false,
      },
    ],
  },
};

export const MOCK_RESOURCES = {
  text: {
    uri: 'file:///test/document.txt',
    name: 'Test Document',
    mimeType: 'text/plain',
    description: 'A test text document',
  },
  json: {
    uri: 'file:///test/data.json',
    name: 'Test Data',
    mimeType: 'application/json',
    description: 'A test JSON document',
  },
  binary: {
    uri: 'file:///test/image.png',
    name: 'Test Image',
    mimeType: 'image/png',
    description: 'A test image',
  },
  template: {
    uri: 'file:///test/{id}/data',
    name: 'Templated Resource',
    mimeType: 'application/json',
    description: 'A resource with URI template',
  },
};

export const MOCK_SERVER_CONFIGS = {
  stdio: {
    command: 'node',
    args: ['mock-server.js'],
    env: {
      TEST_MODE: 'true',
    },
  },
  http: {
    url: 'http://localhost:8080/mcp',
    headers: {
      'Authorization': 'Bearer test-token',
    },
  },
  withEnvVars: {
    command: 'python',
    args: ['-m', 'test_server'],
    env: {
      DATABASE_URL: 'sqlite:///test.db',
      API_KEY: 'test-key-12345',
    },
    cwd: '/tmp/mcp-test',
  },
};

export const MOCK_OAUTH_CONFIG = {
  authorizationEndpoint: 'https://auth.example.com/authorize',
  tokenEndpoint: 'https://auth.example.com/token',
  clientId: 'test-client-id',
  scopes: ['mcp.read', 'mcp.write'],
  redirectUri: 'http://localhost:7777/oauth/callback',
};

export const MOCK_TOKENS = {
  valid: {
    access_token: 'mock-access-token-abc123',
    refresh_token: 'mock-refresh-token-xyz789',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'mcp.read mcp.write',
  },
  expired: {
    access_token: 'expired-token',
    refresh_token: 'refresh-token',
    token_type: 'Bearer',
    expires_in: -1,
    scope: 'mcp.read',
  },
};

export const MOCK_RESPONSES = {
  toolSuccess: {
    content: [
      {
        type: 'text',
        text: 'Tool executed successfully',
      },
    ],
  },
  toolWithImage: {
    content: [
      {
        type: 'text',
        text: 'Generated image:',
      },
      {
        type: 'image',
        data: 'base64-encoded-image-data',
        mimeType: 'image/png',
      },
    ],
  },
  toolWithResource: {
    content: [
      {
        type: 'resource',
        resource: {
          uri: 'file:///output/result.txt',
          text: 'Result content',
          mimeType: 'text/plain',
        },
      },
    ],
  },
  error: {
    error: {
      code: -32000,
      message: 'Tool execution failed',
      data: {
        details: 'Additional error information',
      },
    },
  },
};

export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000,
};

export const ENV_VAR_TEST_CASES = [
  { input: '$VAR', env: { VAR: 'value' }, expected: 'value' },
  { input: '${VAR}', env: { VAR: 'value' }, expected: 'value' },
  { input: '${VAR:-default}', env: {}, expected: 'default' },
  { input: 'prefix-$VAR-suffix', env: { VAR: 'mid' }, expected: 'prefix-mid-suffix' },
  { input: '$MISSING', env: {}, expected: '$MISSING' },
];
