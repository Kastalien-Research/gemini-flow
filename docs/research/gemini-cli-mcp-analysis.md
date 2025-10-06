# Gemini CLI MCP Implementation Analysis

**Analysis Date:** 2025-10-06
**Analyst:** MCP Specification Analyst Agent
**Target:** gemini-cli MCP implementation for replication in gemini-flow

## Executive Summary

The gemini-cli implements a comprehensive MCP integration using `@modelcontextprotocol/sdk ^1.11.0` with sophisticated OAuth support, multi-transport capabilities, and prompt-as-slash-command functionality. This analysis identifies key patterns and architecture decisions to replicate in gemini-flow.

---

## 1. SDK Version & Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.11.0",
  "@google/genai": "1.16.0",
  "google-auth-library": "^9.11.0"
}
```

**Key Dependencies:**
- **MCP SDK**: Official SDK for Model Context Protocol
- **@google/genai**: Provides `mcpToTool()` converter for Gemini API
- **google-auth-library**: Google Cloud authentication
- Node.js: >=20

---

## 2. Architecture Overview

### Core Components

1. **mcp-client.ts** - Client lifecycle and discovery
2. **oauth-provider.ts** - OAuth PKCE flow implementation
3. **oauth-utils.ts** - OAuth discovery utilities
4. **oauth-token-storage.ts** - Secure token persistence
5. **mcp-tool.ts** - Tool execution and content transformation
6. **prompt-registry.ts** - MCP prompts as slash commands

---

## 3. Transport Layer Architecture

### Transport Selection Logic

```typescript
async function createTransport(
  mcpServerName: string,
  mcpServerConfig: MCPServerConfig,
  debugMode: boolean
): Promise<Transport> {
  // 1. Check for Google Cloud auth providers
  if (mcpServerConfig.authProviderType === AuthProviderType.SERVICE_ACCOUNT_IMPERSONATION) {
    const provider = new ServiceAccountImpersonationProvider(mcpServerConfig);
    const transportOptions = { authProvider: provider };

    if (mcpServerConfig.httpUrl) {
      return new StreamableHTTPClientTransport(new URL(mcpServerConfig.httpUrl), transportOptions);
    } else if (mcpServerConfig.url) {
      return new SSEClientTransport(new URL(mcpServerConfig.url), transportOptions);
    }
  }

  // 2. Check for OAuth tokens
  const tokenStorage = new MCPOAuthTokenStorage();
  const authProvider = new MCPOAuthProvider(tokenStorage);
  const accessToken = await authProvider.getValidToken(mcpServerName, mcpServerConfig.oauth);

  // 3. Create transport with OAuth headers
  if (mcpServerConfig.httpUrl) {
    return new StreamableHTTPClientTransport(new URL(mcpServerConfig.httpUrl), {
      requestInit: {
        headers: {
          ...mcpServerConfig.headers,
          Authorization: `Bearer ${accessToken}`
        }
      }
    });
  }

  if (mcpServerConfig.url) {
    return new SSEClientTransport(new URL(mcpServerConfig.url), {
      requestInit: {
        headers: {
          ...mcpServerConfig.headers,
          Authorization: `Bearer ${accessToken}`
        }
      }
    });
  }

  // 4. Stdio transport for local processes
  if (mcpServerConfig.command) {
    return new StdioClientTransport({
      command: mcpServerConfig.command,
      args: mcpServerConfig.args || [],
      env: { ...process.env, ...(mcpServerConfig.env || {}) },
      cwd: mcpServerConfig.cwd,
      stderr: 'pipe'
    });
  }

  throw new Error('Invalid configuration');
}
```

### Supported Transports

| Transport | Use Case | Config Property |
|-----------|----------|-----------------|
| **StreamableHTTPClientTransport** | HTTP streaming endpoints | `httpUrl` |
| **SSEClientTransport** | Server-Sent Events | `url` |
| **StdioClientTransport** | Local subprocess | `command` + `args` |

---

## 4. OAuth Implementation Deep Dive

### OAuth Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Client Connects                      │
│                            ↓                                 │
│                       401 Received                           │
│                            ↓                                 │
│            Extract WWW-Authenticate Header                   │
│                            ↓                                 │
│     ┌──────────────────────┴──────────────────────┐         │
│     ↓                                              ↓         │
│ Header Has                                    No Header      │
│ resource_metadata                                ↓           │
│     ↓                                    Try Well-Known      │
│ Fetch Protected                          Endpoints Discovery │
│ Resource Metadata                               ↓            │
│     ↓                                    /.well-known/       │
│ Get Authorization                        oauth-protected-    │
│ Server URL                               resource            │
│     ↓                                           ↓            │
│     └──────────────────────┬────────────────────┘            │
│                            ↓                                 │
│              Fetch Authorization Server Metadata             │
│     (/.well-known/oauth-authorization-server)                │
│                            ↓                                 │
│              Dynamic Client Registration?                    │
│     (if no clientId and registration_endpoint exists)        │
│                            ↓                                 │
│                    Generate PKCE Params                      │
│        (codeVerifier, codeChallenge, state)                 │
│                            ↓                                 │
│              Build Authorization URL                         │
│     (with resource parameter for MCP spec compliance)        │
│                            ↓                                 │
│           Start Local Callback Server (port 7777)            │
│                            ↓                                 │
│                  Open Browser for User Auth                  │
│                            ↓                                 │
│              Receive Authorization Code                      │
│                            ↓                                 │
│          Exchange Code for Tokens (with PKCE)                │
│                            ↓                                 │
│              Store Tokens in Token Storage                   │
│                            ↓                                 │
│              Retry Connection with Bearer Token              │
└─────────────────────────────────────────────────────────────┘
```

### PKCE Implementation

```typescript
private generatePKCEParams(): PKCEParams {
  // Generate code verifier (43-128 characters)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');

  // Generate code challenge using SHA256
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString('base64url');

  return { codeVerifier, codeChallenge, state };
}
```

### OAuth Discovery Strategy

**Well-Known Endpoint Discovery Order:**

For URLs with path components (e.g., `https://api.example.com/mcp/v1`):
1. `/.well-known/oauth-authorization-server/mcp/v1` (path insertion)
2. `/.well-known/openid-configuration/mcp/v1` (path insertion)
3. `/mcp/v1/.well-known/openid-configuration` (path appending)
4. `/.well-known/oauth-authorization-server` (root)
5. `/.well-known/openid-configuration` (root)

For root URLs (e.g., `https://auth.example.com`):
1. `/.well-known/oauth-authorization-server`
2. `/.well-known/openid-configuration`

### MCP OAuth Spec Compliance

**Resource Parameter:**
```typescript
// Include resource parameter per MCP OAuth spec
if (mcpServerUrl) {
  params.append('resource', OAuthUtils.buildResourceParameter(mcpServerUrl));
  // buildResourceParameter extracts: protocol://host from URL
}
```

This is included in:
- Authorization URL query parameters
- Token exchange request body
- Token refresh request body

### Token Storage Structure

**Location:** `~/.gemini/mcp-oauth-tokens.json`

```json
{
  "serverName": {
    "token": {
      "accessToken": "eyJhbGciOiJSUzI1NiIs...",
      "tokenType": "Bearer",
      "expiresAt": 1735689600000,
      "refreshToken": "1//0gB3...",
      "scope": "scope1 scope2"
    },
    "clientId": "abc123.apps.googleusercontent.com",
    "tokenUrl": "https://oauth2.googleapis.com/token",
    "mcpServerUrl": "https://api.example.com/sse"
  }
}
```

### Token Refresh Logic

```typescript
async getValidToken(serverName: string, config: MCPOAuthConfig): Promise<string | null> {
  const credentials = await this.tokenStorage.getCredentials(serverName);

  if (!credentials) return null;

  const { token } = credentials;

  // Return valid token
  if (!this.tokenStorage.isTokenExpired(token)) {
    return token.accessToken;
  }

  // Refresh expired token
  if (token.refreshToken && config.clientId && credentials.tokenUrl) {
    const newTokenResponse = await this.refreshAccessToken(
      config,
      token.refreshToken,
      credentials.tokenUrl,
      credentials.mcpServerUrl
    );

    // Update stored token
    const newToken: OAuthToken = {
      accessToken: newTokenResponse.access_token,
      tokenType: newTokenResponse.token_type,
      refreshToken: newTokenResponse.refresh_token || token.refreshToken,
      scope: newTokenResponse.scope || token.scope
    };

    if (newTokenResponse.expires_in) {
      newToken.expiresAt = Date.now() + newTokenResponse.expires_in * 1000;
    }

    await this.tokenStorage.saveToken(serverName, newToken, config.clientId, credentials.tokenUrl, credentials.mcpServerUrl);

    return newToken.accessToken;
  }

  return null;
}
```

---

## 5. Discovery Process

### Discovery Flow Diagram

```
discoverMcpTools()
  │
  ├─► For each server in mcpServers:
  │     │
  │     ├─► connectToMcpServer()
  │     │     │
  │     │     ├─► createTransport() (stdio/SSE/HTTP)
  │     │     ├─► new Client({ name, version })
  │     │     ├─► mcpClient.registerCapabilities({ roots })
  │     │     ├─► mcpClient.setRequestHandler(ListRootsRequestSchema)
  │     │     ├─► mcpClient.connect(transport, { timeout })
  │     │     └─► Return connected client
  │     │
  │     ├─► discoverPrompts(client, promptRegistry)
  │     │     │
  │     │     ├─► Check if server supports prompts capability
  │     │     ├─► mcpClient.request({ method: 'prompts/list' })
  │     │     ├─► For each prompt: promptRegistry.registerPrompt()
  │     │     └─► Return prompts array
  │     │
  │     ├─► discoverTools(client, toolRegistry)
  │     │     │
  │     │     ├─► Check if server supports tools capability
  │     │     ├─► mcpToTool(mcpClient, { timeout })
  │     │     ├─► mcpCallableTool.tool() → { functionDeclarations }
  │     │     ├─► Filter by includeTools/excludeTools
  │     │     ├─► Sanitize tool names
  │     │     ├─► Create DiscoveredMCPTool instances
  │     │     └─► Return tools array
  │     │
  │     └─► Register tools in toolRegistry
  │
  └─► All servers processed
```

### Tool Discovery via @google/genai

```typescript
import { mcpToTool } from '@google/genai';

async function discoverTools(
  mcpServerName: string,
  mcpServerConfig: MCPServerConfig,
  mcpClient: Client,
  cliConfig: Config
): Promise<DiscoveredMCPTool[]> {
  // Check if server supports tools
  if (mcpClient.getServerCapabilities()?.tools == null) return [];

  // Convert MCP client to callable tool
  const mcpCallableTool = mcpToTool(mcpClient, {
    timeout: mcpServerConfig.timeout ?? MCP_DEFAULT_TIMEOUT_MSEC
  });

  // Get function declarations
  const tool = await mcpCallableTool.tool();

  if (!Array.isArray(tool.functionDeclarations)) return [];

  // Process each function declaration
  const discoveredTools: DiscoveredMCPTool[] = [];
  for (const funcDecl of tool.functionDeclarations) {
    // Filter by includeTools/excludeTools
    if (!isEnabled(funcDecl, mcpServerName, mcpServerConfig)) continue;

    // Create wrapped tool
    discoveredTools.push(new DiscoveredMCPTool(
      mcpCallableTool,
      mcpServerName,
      funcDecl.name!,
      funcDecl.description ?? '',
      funcDecl.parametersJsonSchema ?? { type: 'object', properties: {} },
      mcpServerConfig.trust,
      undefined, // nameOverride (conflict resolution)
      cliConfig
    ));
  }

  return discoveredTools;
}
```

### Workspace Roots Capability

```typescript
const mcpClient = new Client({
  name: 'gemini-cli-mcp-client',
  version: '0.0.1'
});

// Register workspace roots capability
mcpClient.registerCapabilities({
  roots: {
    listChanged: true
  }
});

// Handle roots list requests
mcpClient.setRequestHandler(ListRootsRequestSchema, async () => {
  const roots = [];
  for (const dir of workspaceContext.getDirectories()) {
    roots.push({
      uri: pathToFileURL(dir).toString(),
      name: basename(dir)
    });
  }
  return { roots };
});

// Notify on workspace changes
const unlistenDirectories = workspaceContext.onDirectoriesChanged(async () => {
  try {
    await mcpClient.notification({
      method: 'notifications/roots/list_changed'
    });
  } catch (_) {
    unlistenDirectories?.();
  }
});
```

---

## 6. Tool Execution & Content Transformation

### Tool Invocation Pattern

```typescript
class DiscoveredMCPToolInvocation {
  async execute(signal: AbortSignal): Promise<ToolResult> {
    const functionCalls: FunctionCall[] = [{
      name: this.serverToolName,
      args: this.params
    }];

    // Call MCP tool via @google/genai
    const rawResponseParts = await this.mcpTool.callTool(functionCalls);

    // Check for MCP errors
    if (this.isMCPToolError(rawResponseParts)) {
      return {
        llmContent: errorMessage,
        returnDisplay: `Error: MCP tool '${this.serverToolName}' reported an error.`,
        error: { message: errorMessage, type: ToolErrorType.MCP_TOOL_ERROR }
      };
    }

    // Transform MCP content to Gemini Parts
    const transformedParts = transformMcpContentToParts(rawResponseParts);

    return {
      llmContent: transformedParts,
      returnDisplay: getStringifiedResultForDisplay(rawResponseParts)
    };
  }
}
```

### Content Block Transformation

**MCP Content Types → Gemini Parts:**

| MCP Content Type | Gemini Part Format |
|------------------|-------------------|
| `{ type: 'text', text: string }` | `{ text: string }` |
| `{ type: 'image', data: base64, mimeType }` | `{ inlineData: { mimeType, data } }` |
| `{ type: 'audio', data: base64, mimeType }` | `{ inlineData: { mimeType, data } }` |
| `{ type: 'resource', resource: { text } }` | `{ text: string }` |
| `{ type: 'resource', resource: { blob } }` | `{ inlineData: { mimeType, data } }` |
| `{ type: 'resource_link', uri, title }` | `{ text: 'Resource Link: ...' }` |

**Implementation:**

```typescript
function transformMcpContentToParts(sdkResponse: Part[]): Part[] {
  const funcResponse = sdkResponse?.[0]?.functionResponse;
  const mcpContent = funcResponse?.response?.['content'] as McpContentBlock[];

  if (!Array.isArray(mcpContent)) {
    return [{ text: '[Error: Could not parse tool response]' }];
  }

  const transformed = mcpContent.flatMap((block: McpContentBlock) => {
    switch (block.type) {
      case 'text':
        return { text: block.text };

      case 'image':
      case 'audio':
        return [
          { text: `[Tool provided ${block.type} with mime-type: ${block.mimeType}]` },
          { inlineData: { mimeType: block.mimeType, data: block.data } }
        ];

      case 'resource':
        if (block.resource?.text) return { text: block.resource.text };
        if (block.resource?.blob) return [
          { text: `[Embedded resource: ${block.resource.mimeType}]` },
          { inlineData: { mimeType: block.resource.mimeType, data: block.resource.blob } }
        ];
        return null;

      case 'resource_link':
        return { text: `Resource Link: ${block.title || block.name} at ${block.uri}` };

      default:
        return null;
    }
  });

  return transformed.filter((part): part is Part => part !== null);
}
```

### Trust-based Confirmation

```typescript
async shouldConfirmExecute(abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false> {
  const serverAllowListKey = this.serverName;
  const toolAllowListKey = `${this.serverName}.${this.serverToolName}`;

  // Trusted folder bypass
  if (this.cliConfig?.isTrustedFolder() && this.trust) {
    return false;
  }

  // Check allowlists
  if (
    DiscoveredMCPToolInvocation.allowlist.has(serverAllowListKey) ||
    DiscoveredMCPToolInvocation.allowlist.has(toolAllowListKey)
  ) {
    return false;
  }

  // Return confirmation details
  return {
    type: 'mcp',
    title: 'Confirm MCP Tool Execution',
    serverName: this.serverName,
    toolName: this.serverToolName,
    toolDisplayName: this.displayName,
    onConfirm: async (outcome: ToolConfirmationOutcome) => {
      if (outcome === ToolConfirmationOutcome.ProceedAlwaysServer) {
        DiscoveredMCPToolInvocation.allowlist.add(serverAllowListKey);
      } else if (outcome === ToolConfirmationOutcome.ProceedAlwaysTool) {
        DiscoveredMCPToolInvocation.allowlist.add(toolAllowListKey);
      }
    }
  };
}
```

---

## 7. Prompts as Slash Commands

### Prompt Discovery

```typescript
async function discoverPrompts(
  mcpServerName: string,
  mcpClient: Client,
  promptRegistry: PromptRegistry
): Promise<Prompt[]> {
  // Check if server supports prompts
  if (mcpClient.getServerCapabilities()?.prompts == null) return [];

  const response = await mcpClient.request(
    { method: 'prompts/list', params: {} },
    ListPromptsResultSchema
  );

  for (const prompt of response.prompts) {
    promptRegistry.registerPrompt({
      ...prompt,
      serverName: mcpServerName,
      invoke: (params: Record<string, unknown>) =>
        invokeMcpPrompt(mcpServerName, mcpClient, prompt.name, params)
    });
  }

  return response.prompts;
}
```

### Prompt Invocation

```typescript
async function invokeMcpPrompt(
  mcpServerName: string,
  mcpClient: Client,
  promptName: string,
  promptParams: Record<string, unknown>
): Promise<GetPromptResult> {
  const response = await mcpClient.request({
    method: 'prompts/get',
    params: {
      name: promptName,
      arguments: promptParams
    }
  }, GetPromptResultSchema);

  return response;
}
```

### Prompt Registry with Conflict Resolution

```typescript
class PromptRegistry {
  private prompts: Map<string, DiscoveredMCPPrompt> = new Map();

  registerPrompt(prompt: DiscoveredMCPPrompt): void {
    if (this.prompts.has(prompt.name)) {
      const newName = `${prompt.serverName}_${prompt.name}`;
      console.warn(`Prompt "${prompt.name}" already registered. Renaming to "${newName}".`);
      this.prompts.set(newName, { ...prompt, name: newName });
    } else {
      this.prompts.set(prompt.name, prompt);
    }
  }

  getPromptsByServer(serverName: string): DiscoveredMCPPrompt[] {
    return Array.from(this.prompts.values())
      .filter(p => p.serverName === serverName)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
```

---

## 8. Configuration Schema

### Complete settings.json Structure

```json
{
  "mcpServers": {
    "serverName": {
      // ===== TRANSPORT (one required) =====
      "command": "path/to/server",
      "args": ["--arg1", "value1"],
      "url": "https://api.example.com/sse",
      "httpUrl": "https://api.example.com/mcp",

      // ===== OPTIONAL COMMON =====
      "env": {
        "API_KEY": "$MY_API_TOKEN",
        "DATABASE_URL": "${DB_CONNECTION_STRING}"
      },
      "cwd": "./server-directory",
      "timeout": 30000,
      "trust": false,

      // ===== TOOL FILTERING =====
      "includeTools": ["safe_tool", "file_reader"],
      "excludeTools": ["dangerous_tool"],

      // ===== HTTP/SSE HEADERS =====
      "headers": {
        "Authorization": "Bearer static-token",
        "X-Custom-Header": "custom-value"
      },

      // ===== OAUTH CONFIGURATION =====
      "oauth": {
        "enabled": true,
        "clientId": "abc123.apps.googleusercontent.com",
        "clientSecret": "GOCSPX-...",
        "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth",
        "tokenUrl": "https://oauth2.googleapis.com/token",
        "scopes": ["https://www.googleapis.com/auth/userinfo.email"],
        "audiences": ["https://api.example.com"],
        "redirectUri": "http://localhost:7777/oauth/callback",
        "tokenParamName": "access_token"
      },

      // ===== GOOGLE CLOUD AUTH =====
      "authProviderType": "dynamic_discovery",
      // Options: "dynamic_discovery" | "google_credentials" | "service_account_impersonation"

      "targetAudience": "client-id.apps.googleusercontent.com",
      "targetServiceAccount": "sa@project.iam.gserviceaccount.com"
    }
  },

  // ===== GLOBAL MCP SETTINGS =====
  "mcp": {
    "allowed": ["trusted-server"],
    "excluded": ["experimental-server"],
    "serverCommand": "global-mcp-server"
  }
}
```

### Environment Variable Expansion

Both `$VAR_NAME` and `${VAR_NAME}` syntax supported:

```json
{
  "env": {
    "API_KEY": "$MY_API_TOKEN",
    "DATABASE_URL": "${DB_CONNECTION_STRING}"
  }
}
```

---

## 9. Status Monitoring

### Status Enumerations

```typescript
enum MCPServerStatus {
  DISCONNECTED = 'disconnected',
  DISCONNECTING = 'disconnecting',
  CONNECTING = 'connecting',
  CONNECTED = 'connected'
}

enum MCPDiscoveryState {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}
```

### Status Tracking System

```typescript
const serverStatuses: Map<string, MCPServerStatus> = new Map();
let mcpDiscoveryState: MCPDiscoveryState = MCPDiscoveryState.NOT_STARTED;

const statusChangeListeners: StatusChangeListener[] = [];

function updateMCPServerStatus(serverName: string, status: MCPServerStatus): void {
  serverStatuses.set(serverName, status);
  for (const listener of statusChangeListeners) {
    listener(serverName, status);
  }
}

function addMCPStatusChangeListener(listener: StatusChangeListener): void {
  statusChangeListeners.push(listener);
}
```

---

## 10. Tool Name Sanitization & Conflict Resolution

### Name Sanitization

```typescript
function generateValidName(name: string): string {
  // Replace invalid characters with underscores
  // Valid: a-zA-Z0-9_.-
  let validToolname = name.replace(/[^a-zA-Z0-9_.-]/g, '_');

  // Max length: 63 characters (Gemini API limit)
  if (validToolname.length > 63) {
    validToolname = validToolname.slice(0, 28) + '___' + validToolname.slice(-32);
  }

  return validToolname;
}
```

### Conflict Resolution

**Pattern:** First server wins unprefixed name, subsequent servers get `serverName__toolName` prefix.

```typescript
class DiscoveredMCPTool {
  asFullyQualifiedTool(): DiscoveredMCPTool {
    return new DiscoveredMCPTool(
      this.mcpTool,
      this.serverName,
      this.serverToolName,
      this.description,
      this.parameterSchema,
      this.trust,
      `${this.serverName}__${this.serverToolName}`, // Prefixed name
      this.cliConfig
    );
  }
}
```

---

## 11. Schema Sanitization

Per documentation, these transformations are applied:

1. **Remove `$schema` properties**
2. **Strip `additionalProperties`**
3. **Remove defaults from `anyOf` schemas** (Vertex AI compatibility)
4. **Recursive processing** for nested schemas

---

## 12. Error Handling

### MCP Tool Error Detection

```typescript
isMCPToolError(rawResponseParts: Part[]): boolean {
  const functionResponse = rawResponseParts?.[0]?.functionResponse;
  const response = functionResponse?.response;

  if (response) {
    const error = response?.error;
    const isError = error?.isError;

    if (error && (isError === true || isError === 'true')) {
      return true;
    }
  }

  return false;
}
```

### Connection Error Handling

```typescript
try {
  mcpClient = await connectToMcpServer(mcpServerName, mcpServerConfig, debugMode, workspaceContext);
} catch (error) {
  const errorString = String(error);

  // Handle 401 → OAuth flow
  if (errorString.includes('401') && hasNetworkTransport(mcpServerConfig)) {
    const wwwAuthenticate = extractWWWAuthenticateHeader(errorString);
    const oauthSuccess = await handleAutomaticOAuth(mcpServerName, mcpServerConfig, wwwAuthenticate);

    if (oauthSuccess) {
      // Retry with OAuth token
      const accessToken = await authProvider.getValidToken(mcpServerName, config);
      const oauthTransport = await createTransportWithOAuth(mcpServerName, mcpServerConfig, accessToken);
      await mcpClient.connect(oauthTransport, { timeout });
    }
  }
}
```

---

## 13. Google Cloud Authentication Providers

### Service Account Impersonation

**Use Case:** Access IAP-protected Cloud Run services

**Configuration:**
```json
{
  "authProviderType": "service_account_impersonation",
  "targetAudience": "YOUR_IAP_CLIENT_ID.apps.googleusercontent.com",
  "targetServiceAccount": "your-sa@your-project.iam.gserviceaccount.com"
}
```

**Implementation:**
```typescript
class ServiceAccountImpersonationProvider {
  async getAuthHeaders(): Promise<Record<string, string>> {
    const client = await auth.getClient();
    const targetClient = new auth.Impersonated({
      sourceClient: client,
      targetPrincipal: this.config.targetServiceAccount,
      delegates: [],
      targetScopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const idToken = await targetClient.fetchIdToken(this.config.targetAudience);

    return {
      Authorization: `Bearer ${idToken}`
    };
  }
}
```

### Google Application Default Credentials

**Configuration:**
```json
{
  "authProviderType": "google_credentials",
  "oauth": {
    "scopes": ["https://www.googleapis.com/auth/userinfo.email"]
  }
}
```

---

## 14. Implementation Recommendations for gemini-flow

### Priority 1: Critical Features

1. **Multi-Transport Support**
   - Implement SSE and HTTP transports (currently only stdio?)
   - Transport factory pattern from gemini-cli
   - OAuth header injection for network transports

2. **OAuth PKCE Flow**
   - Copy oauth-provider.ts architecture
   - Implement automatic discovery via well-known endpoints
   - WWW-Authenticate header parsing
   - Local callback server on port 7777
   - Token storage with refresh logic

3. **Workspace Roots Capability**
   - Register `roots` capability with MCP client
   - Implement `ListRootsRequestSchema` handler
   - Notify on workspace changes

### Priority 2: Enhanced Features

4. **Prompt Integration**
   - Implement prompt discovery via `prompts/list`
   - Prompt registry with conflict resolution
   - Slash command integration for prompts
   - Argument parsing for prompt parameters

5. **Content Transformation**
   - Multi-part response handling
   - MCP content blocks → framework-specific format
   - Support for images, audio, resources

6. **Trust System**
   - Server-level trust configuration
   - Tool-level allowlisting
   - Confirmation dialogs with "always allow" options

### Priority 3: Google Cloud Integration

7. **Google Auth Providers**
   - Application Default Credentials support
   - Service Account Impersonation
   - IAP-protected service access

### Priority 4: Developer Experience

8. **Status Monitoring**
   - Connection state tracking
   - Status change event listeners
   - Discovery state management

9. **Tool Filtering**
   - `includeTools` / `excludeTools` configuration
   - Server-level tool filtering

10. **Configuration Management**
    - Environment variable expansion ($VAR_NAME)
    - Custom headers for network transports
    - Timeout configuration per server

---

## 15. Code Snippets for Direct Implementation

### Complete MCP Client Setup

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ListRootsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { pathToFileURL } from 'node:url';
import { basename } from 'node:path';

async function setupMCPClient(
  serverConfig: MCPServerConfig,
  workspaceContext: WorkspaceContext
): Promise<Client> {
  const mcpClient = new Client({
    name: 'gemini-flow-mcp-client',
    version: '1.0.0'
  });

  // Register capabilities
  mcpClient.registerCapabilities({
    roots: {
      listChanged: true
    }
  });

  // Handle roots list requests
  mcpClient.setRequestHandler(ListRootsRequestSchema, async () => {
    const roots = [];
    for (const dir of workspaceContext.getDirectories()) {
      roots.push({
        uri: pathToFileURL(dir).toString(),
        name: basename(dir)
      });
    }
    return { roots };
  });

  // Notify on workspace changes
  const unlistenDirectories = workspaceContext.onDirectoriesChanged(async () => {
    try {
      await mcpClient.notification({
        method: 'notifications/roots/list_changed'
      });
    } catch (_) {
      unlistenDirectories?.();
    }
  });

  // Create transport
  const transport = await createTransport(serverConfig);

  // Connect with timeout
  await mcpClient.connect(transport, {
    timeout: serverConfig.timeout ?? 600000
  });

  return mcpClient;
}
```

### OAuth Token Refresh

```typescript
async function ensureValidToken(
  serverName: string,
  config: MCPOAuthConfig,
  tokenStorage: MCPOAuthTokenStorage
): Promise<string | null> {
  const credentials = await tokenStorage.getCredentials(serverName);

  if (!credentials) return null;

  const { token } = credentials;

  // Check expiration
  const isExpired = token.expiresAt && Date.now() >= token.expiresAt;

  if (!isExpired) {
    return token.accessToken;
  }

  // Refresh if possible
  if (token.refreshToken && config.clientId && credentials.tokenUrl) {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
        client_id: config.clientId
      });

      if (config.clientSecret) {
        params.append('client_secret', config.clientSecret);
      }

      const response = await fetch(credentials.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json();

      const newToken = {
        accessToken: data.access_token,
        tokenType: data.token_type,
        refreshToken: data.refresh_token || token.refreshToken,
        scope: data.scope || token.scope,
        expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined
      };

      await tokenStorage.saveToken(serverName, newToken, config.clientId, credentials.tokenUrl, credentials.mcpServerUrl);

      return newToken.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await tokenStorage.deleteCredentials(serverName);
      return null;
    }
  }

  return null;
}
```

---

## 16. Testing Strategy

Based on test files observed in gemini-cli:

### Unit Tests
- OAuth flow components (oauth-provider.test.ts)
- OAuth utilities (oauth-utils.test.ts)
- Token storage (oauth-token-storage.test.ts)
- Google auth providers (google-auth-provider.test.ts, sa-impersonation-provider.test.ts)

### Integration Tests
- Mock MCP server responses
- Discovery process validation
- Transport selection logic
- Schema sanitization
- Tool execution flow
- Prompt invocation

### Test Patterns
```typescript
describe('OAuth Discovery', () => {
  it('should discover OAuth config from well-known endpoints', async () => {
    // Mock fetch responses
    // Test discovery flow
    // Verify correct endpoints tried in order
  });

  it('should handle WWW-Authenticate header parsing', async () => {
    // Test header extraction
    // Verify resource metadata URI parsing
  });
});

describe('Token Refresh', () => {
  it('should refresh expired tokens', async () => {
    // Mock token storage with expired token
    // Mock token endpoint response
    // Verify refresh request includes refresh_token grant
  });
});
```

---

## 17. Missing Features Analysis

### Features gemini-flow needs to implement:

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| SSE/HTTP Transports | P0 | Medium | Critical for remote MCP servers |
| OAuth PKCE Flow | P0 | High | Security requirement for auth |
| Token Storage | P0 | Low | File-based JSON storage |
| Token Refresh | P0 | Medium | Automatic refresh logic |
| OAuth Discovery | P1 | Medium | Well-known endpoints |
| Workspace Roots | P1 | Low | MCP capability |
| Prompt Discovery | P1 | Low | MCP prompts/list |
| Prompt Registry | P1 | Low | Slash command integration |
| Content Transformation | P1 | Medium | Multi-part responses |
| Trust System | P2 | Low | Confirmation dialogs |
| Tool Filtering | P2 | Low | include/exclude lists |
| Google Auth | P2 | High | ADC + SA impersonation |
| Status Monitoring | P3 | Low | Connection state tracking |

---

## 18. Integration Checklist

- [ ] Install `@modelcontextprotocol/sdk ^1.11.0`
- [ ] Implement transport factory (stdio/SSE/HTTP)
- [ ] Create OAuth provider with PKCE
- [ ] Implement OAuth discovery utilities
- [ ] Create token storage system
- [ ] Add workspace roots capability
- [ ] Implement prompt discovery
- [ ] Create prompt registry
- [ ] Add content transformation layer
- [ ] Implement trust-based confirmation
- [ ] Add tool name sanitization
- [ ] Implement conflict resolution
- [ ] Add status tracking system
- [ ] Create configuration schema
- [ ] Write unit tests for OAuth
- [ ] Write integration tests
- [ ] Document MCP configuration
- [ ] Add examples for common setups

---

## 19. Critical Code Patterns to Replicate

### Pattern 1: Capability Registration

```typescript
mcpClient.registerCapabilities({
  roots: { listChanged: true }
});

mcpClient.setRequestHandler(ListRootsRequestSchema, async () => ({
  roots: workspaceContext.getDirectories().map(dir => ({
    uri: pathToFileURL(dir).toString(),
    name: basename(dir)
  }))
}));
```

### Pattern 2: Error-Aware Tool Execution

```typescript
const rawResponseParts = await mcpTool.callTool(functionCalls);

if (this.isMCPToolError(rawResponseParts)) {
  return {
    llmContent: errorMessage,
    returnDisplay: `Error: ${message}`,
    error: { message, type: ToolErrorType.MCP_TOOL_ERROR }
  };
}
```

### Pattern 3: Multi-Transport Support

```typescript
if (config.httpUrl) {
  return new StreamableHTTPClientTransport(new URL(config.httpUrl), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } }
  });
} else if (config.url) {
  return new SSEClientTransport(new URL(config.url), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } }
  });
} else if (config.command) {
  return new StdioClientTransport({ command, args, env, cwd });
}
```

---

## 20. Conclusion

The gemini-cli MCP implementation provides a production-ready reference architecture with:

✅ **Comprehensive OAuth support** (PKCE, discovery, refresh)
✅ **Multi-transport flexibility** (stdio, SSE, HTTP)
✅ **Security-first design** (trust system, confirmation dialogs)
✅ **Rich content handling** (images, audio, multi-part responses)
✅ **Workspace integration** (roots capability, workspace changes)
✅ **Prompt system** (slash commands from MCP prompts)
✅ **Google Cloud ready** (ADC, SA impersonation)

**Next Steps for gemini-flow:**
1. Adopt `@modelcontextprotocol/sdk ^1.11.0`
2. Implement OAuth provider system (Priority 1)
3. Add SSE/HTTP transports (Priority 1)
4. Integrate prompt discovery (Priority 2)
5. Add content transformation layer (Priority 2)

This analysis provides all necessary patterns, code snippets, and architectural decisions to successfully close the MCP feature gap in gemini-flow.
