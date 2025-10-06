# MCP Phase 2 Implementation - Prompts, Resources, and OAuth

## Overview

Phase 2 of the MCP (Model Context Protocol) implementation for gemini-flow introduces three critical primitives:

1. **Prompts** - Reusable message templates with argument support
2. **Resources** - File and data source exposure with subscriptions
3. **OAuth 2.0** - Secure authentication for remote MCP servers

This implementation bridges the gap identified in the MCP Feature Gap Analysis, bringing gemini-flow closer to full MCP specification compliance.

## Implementation Status

### ✅ Completed Features

#### 1. Prompts Primitive
- **prompt-discovery.ts** - Implements `prompts/list` for discovering available prompts
- **prompt-retrieval.ts** - Implements `prompts/get` for retrieving prompt templates
- **prompt-registry.ts** - Manages discovered prompts with conflict resolution
- Support for prompt arguments (positional and named)
- Template rendering with parameter substitution
- Server-based prompt organization

#### 2. Resources Primitive
- **resource-discovery.ts** - Implements `resources/list` for discovering resources
- **resource-reader.ts** - Implements `resources/read` for reading resource content
- **resource-subscriptions.ts** - Real-time resource update subscriptions
- Resource template support with URI parameters (e.g., `{param}`)
- MIME type handling for text and binary resources
- Custom URI scheme support (file://, http://, custom://)
- Resource grouping by scheme and MIME type

#### 3. OAuth 2.0 Authentication
- **oauth-provider.ts** - Complete OAuth 2.0 flow with PKCE
- **oauth-token-storage.ts** - Secure token persistence
- **oauth-utils.ts** - OAuth discovery and utilities (copied from gemini-cli)
- Automatic OAuth discovery (401 response detection)
- Dynamic client registration
- Token refresh mechanism
- Browser-based authentication flow
- Secure token storage in `~/.gemini-flow/mcp-oauth-tokens.json`

## Architecture

### File Structure

```
src/mcp/
├── prompts/
│   ├── prompt-discovery.ts      # Discover prompts from MCP servers
│   ├── prompt-retrieval.ts      # Retrieve and render prompts
│   ├── prompt-registry.ts       # Manage discovered prompts
│   └── index.ts                 # Module exports
├── resources/
│   ├── resource-discovery.ts    # Discover resources
│   ├── resource-reader.ts       # Read resource content
│   ├── resource-subscriptions.ts # Real-time updates
│   └── index.ts                 # Module exports
├── auth/
│   ├── oauth-provider.ts        # OAuth 2.0 authentication
│   ├── oauth-token-storage.ts   # Token persistence
│   ├── oauth-utils.ts           # OAuth utilities
│   └── index.ts                 # Module exports
├── mcp-client-wrapper.ts        # Basic MCP client
├── mcp-enhanced-client.ts       # Enhanced client with Phase 2
└── index.ts                     # Main module exports
```

### Enhanced MCP Client

The `EnhancedMCPClient` extends the basic `MCPClientWrapper` with Phase 2 features:

```typescript
import { enhancedMCP } from "./mcp/index.js";

// Connect with OAuth
await enhancedMCP.connectWithOAuth("my-server", {
  command: "npx",
  args: ["my-mcp-server"],
  oauth: {
    clientId: "your-client-id",
    authorizationUrl: "https://auth.example.com/authorize",
    tokenUrl: "https://auth.example.com/token",
    scopes: ["read", "write"],
  },
});

// Discover all features
const features = await enhancedMCP.discoverAll("my-server");

// Use prompts
const prompt = await enhancedMCP.getPrompt("my-server", "code-review", {
  language: "typescript",
  style: "detailed",
});

// Use resources
const resources = await enhancedMCP.discoverResources("my-server");
const content = await enhancedMCP.readResource(
  "my-server",
  "file:///path/to/file.txt"
);

// Subscribe to resource updates
await enhancedMCP.subscribeToResource(
  "my-server",
  "file:///logs/app.log",
  5000 // Poll every 5 seconds
);
```

## Prompts Implementation

### Discovery

```typescript
import { promptDiscovery, promptRegistry } from "./mcp/prompts/index.js";

// Discover from a single server
const prompts = await promptDiscovery.discoverPrompts(serverName, client);

// Register for easy lookup
promptRegistry.registerMultiple(prompts);

// Search prompts
const results = promptRegistry.search("code review");
```

### Retrieval

```typescript
import { promptRetrieval } from "./mcp/prompts/index.js";

// Get with named arguments
const prompt = await promptRetrieval.getPrompt(
  serverName,
  client,
  "poem-writer",
  { title: "Gemini Flow", mood: "inspired" }
);

// Parse arguments from string
const args = promptRetrieval.parseArguments(
  '--title="Gemini Flow" --mood=inspired'
);

// Extract text content
const text = promptRetrieval.extractTextContent(prompt);
```

### Integration as Slash Commands

Prompts can be integrated as slash commands in gemini-flow's command system:

```typescript
// Example integration (to be implemented in CLI)
/code-review --language=typescript --style=detailed
/poem-writer "Gemini Flow" inspired
```

## Resources Implementation

### Discovery

```typescript
import { resourceDiscovery } from "./mcp/resources/index.js";

// Discover all resources
const resources = await resourceDiscovery.discoverResources(serverName, client);

// Filter by MIME type
const textFiles = resourceDiscovery.filterByMimeType(resources, "text/plain");

// Extract templates
const templates = resourceDiscovery.extractTemplates(resources);

// Resolve template
const uri = resourceDiscovery.resolveTemplate(
  "file:///{project}/src/{file}",
  { project: "gemini-flow", file: "index.ts" }
);
```

### Reading

```typescript
import { resourceReader } from "./mcp/resources/index.js";

// Read a resource
const content = await resourceReader.readResource(serverName, client, uri);

// Get text content
const text = resourceReader.getTextContent(content);

// Get binary content
const buffer = resourceReader.getBinaryContent(content);

// Check resource type
if (resourceReader.isTextResource(content.mimeType)) {
  console.log("Text resource:", text);
}
```

### Subscriptions

```typescript
import { resourceSubscriptionManager } from "./mcp/resources/index.js";

// Subscribe to updates
const subscriptionId = await resourceSubscriptionManager.subscribe(
  serverName,
  client,
  "file:///logs/app.log",
  5000 // Poll interval
);

// Listen for updates
resourceSubscriptionManager.on("update", (event) => {
  console.log("Resource updated:", event.uri);
});

// Unsubscribe
resourceSubscriptionManager.unsubscribe(subscriptionId);
```

## OAuth 2.0 Implementation

### Automatic Discovery

```typescript
import { oauthProvider } from "./mcp/auth/index.js";

// Authenticate (discovers OAuth endpoints automatically)
const token = await oauthProvider.authenticate(serverName, {
  clientId: "your-client-id",
  authorizationUrl: "https://auth.example.com/authorize",
  tokenUrl: "https://auth.example.com/token",
  scopes: ["read", "write"],
});
```

### Token Management

```typescript
import { tokenStorage } from "./mcp/auth/index.js";

// Save token
await tokenStorage.saveToken(serverName, token, clientId, tokenUrl);

// Get credentials
const credentials = await tokenStorage.getCredentials(serverName);

// Check if expired
const expired = tokenStorage.isTokenExpired(token);

// Refresh token
const refreshed = await oauthProvider.refreshAccessToken(
  config,
  token.refreshToken
);
```

### OAuth Discovery from WWW-Authenticate

```typescript
import { OAuthUtils } from "./mcp/auth/index.js";

// Discover from 401 response header
const config = await OAuthUtils.discoverOAuthFromWWWAuthenticate(
  wwwAuthenticateHeader
);

// Discover from server URL
const config2 = await OAuthUtils.discoverOAuthConfig(serverUrl);
```

## Integration with Existing Code

### MCP Client Wrapper Enhancement

The existing `MCPClientWrapper` remains unchanged, ensuring backward compatibility. The new `EnhancedMCPClient` extends it with Phase 2 features.

### Adapter Compatibility

The implementation works seamlessly with the existing `MCPToGeminiAdapter`:

```typescript
import { enhancedMCP } from "./mcp/index.js";
import { MCPToGeminiAdapter } from "./core/mcp-adapter.js";

// Connect and discover
await enhancedMCP.connectWithOAuth("my-server", spec);
const features = await enhancedMCP.discoverAll("my-server");

// Use with adapter
const adapter = new MCPToGeminiAdapter(apiKey);
// ... adapter usage
```

## Testing

### Manual Testing

```bash
# Test prompts
node -e "
import('./src/mcp/index.js').then(async ({ enhancedMCP, promptRegistry }) => {
  await enhancedMCP.connect('test-server', { command: 'npx', args: ['my-server'] });
  const prompts = await enhancedMCP.discoverPrompts('test-server');
  console.log('Discovered prompts:', prompts);
});
"

# Test resources
node -e "
import('./src/mcp/index.js').then(async ({ enhancedMCP }) => {
  await enhancedMCP.connect('test-server', { command: 'npx', args: ['my-server'] });
  const resources = await enhancedMCP.discoverResources('test-server');
  console.log('Discovered resources:', resources);
});
"
```

## Known Limitations

1. **Slash Command Integration** - Prompts are not yet integrated as slash commands in the CLI (pending)
2. **OAuth Browser Opening** - Relies on `open` package which may not work on all platforms
3. **Resource Subscriptions** - Uses polling instead of true push notifications (MCP spec doesn't define push)
4. **Dynamic Client Registration** - Not yet implemented (marked as pending in OAuth utils)

## Next Steps

### Phase 3 (Future)

1. **Sampling** - Allow MCP servers to request LLM completions
2. **Roots** - Filesystem boundary enforcement
3. **Elicitation** - Interactive user input during tool execution

### Immediate Improvements

1. Integrate prompts as slash commands in gemini-flow CLI
2. Add comprehensive unit tests for all modules
3. Implement dynamic client registration for OAuth
4. Add examples and documentation for each feature
5. Create integration tests with real MCP servers

## References

- [MCP Specification](https://modelcontextprotocol.io/docs/)
- [MCP Feature Gap Analysis](../../MCP_FEATURE_GAP_ANALYSIS.md)
- [Gemini CLI OAuth Implementation](../../gemini-cli/packages/core/src/mcp/)

## Contributing

To extend Phase 2 implementation:

1. Follow the existing patterns in `prompts/`, `resources/`, and `auth/` directories
2. Use the official `@modelcontextprotocol/sdk` types
3. Maintain backward compatibility with existing code
4. Add exports to the respective `index.ts` files
5. Document new features in this file

## License

Same as gemini-flow project license (MIT)
