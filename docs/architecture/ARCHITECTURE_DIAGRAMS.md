# MCP Integration Architecture - Visual Diagrams

**Project:** Gemini Flow MCP Implementation
**Date:** October 6, 2025

---

## Table of Contents

1. [System Context (C4 Level 1)](#system-context-c4-level-1)
2. [Container Diagram (C4 Level 2)](#container-diagram-c4-level-2)
3. [Component Diagram (C4 Level 3)](#component-diagram-c4-level-3)
4. [Sequence Diagrams](#sequence-diagrams)
5. [State Diagrams](#state-diagrams)
6. [Data Flow Diagrams](#data-flow-diagrams)

---

## System Context (C4 Level 1)

### High-Level System View

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Gemini Flow Ecosystem                        │
│                                                                      │
│  ┌────────────────────┐                                             │
│  │                    │                                             │
│  │  User/Developer    │                                             │
│  │                    │                                             │
│  └────────┬───────────┘                                             │
│           │                                                          │
│           │ CLI Commands / API Calls                                │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Gemini Flow Core Engine                        │   │
│  │  - Workflow orchestration                                   │   │
│  │  - AI model integration                                     │   │
│  │  - Task management                                          │   │
│  └────────┬────────────────────────────────────────────────────┘   │
│           │                                                          │
│           │ Uses                                                     │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │           MCP Integration Layer (NEW)                       │   │
│  │  - Official SDK based                                       │   │
│  │  - Multi-server management                                  │   │
│  │  - Protocol implementations                                 │   │
│  └────────┬────────────────────────────────────────────────────┘   │
│           │                                                          │
└───────────┼──────────────────────────────────────────────────────────┘
            │
            │ Connects via Transports
            │
┌───────────┼───────────────────────────────────────────────────┐
│           │          MCP Server Ecosystem                      │
│           │                                                    │
│  ┌────────▼──────┐     ┌──────────────┐     ┌──────────────┐ │
│  │   Stdio MCP   │     │  HTTP MCP    │     │  HTTP MCP    │ │
│  │   Server A    │     │  Server B    │     │  Server C    │ │
│  │   (Local)     │     │  (Remote)    │     │  (Remote)    │ │
│  │               │     │              │     │              │ │
│  │  - Tools      │     │  - Tools     │     │  - Tools     │ │
│  │  - Prompts    │     │  - Prompts   │     │  - Resources │ │
│  │  - Resources  │     │  - Resources │     │  - Sampling  │ │
│  └───────────────┘     └──────────────┘     └──────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘

External Services:
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  OAuth Provider │     │  Gemini AI API   │     │  File System│
│  (Dynamic)      │     │  (Google)        │     │  (Roots)    │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

---

## Container Diagram (C4 Level 2)

### MCP Integration Layer Internal Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MCP Integration Layer                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Client Manager                                  │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │  │
│  │  │  McpClient       │  │  Lifecycle       │  │  Discovery       │   │  │
│  │  │  Manager         │  │  Manager         │  │  Manager         │   │  │
│  │  │                  │  │                  │  │                  │   │  │
│  │  │  - Multi-server  │  │  - Connect       │  │  - Tools/list    │   │  │
│  │  │  - Registry      │  │  - Disconnect    │  │  - Prompts/list  │   │  │
│  │  │  - Routing       │  │  - Status        │  │  - Resources/list│   │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘   │  │
│  └────────────────────────────────┬──────────────────────────────────────┘  │
│                                   │                                          │
│  ┌────────────────────────────────▼──────────────────────────────────────┐  │
│  │                        Protocol Layer                                  │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│  │  │  Tools Protocol │  │ Prompts Protocol│  │Resources Protocol│       │  │
│  │  │                 │  │                 │  │                  │       │  │
│  │  │  - tools/list   │  │  - prompts/list │  │  - resources/list│       │  │
│  │  │  - tools/call   │  │  - prompts/get  │  │  - resources/read│       │  │
│  │  │  - Sanitization │  │  - Arguments    │  │  - Subscriptions │       │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│  │                                                                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│  │  │  Roots Protocol │  │Sampling Protocol│  │Elicit. Protocol  │       │  │
│  │  │                 │  │                 │  │                  │       │  │
│  │  │  - roots/list   │  │  - LLM requests │  │  - User input    │       │  │
│  │  │  - Enforcement  │  │  - Human review │  │  - Interactive   │       │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│  └────────────────────────────────┬──────────────────────────────────────┘  │
│                                   │                                          │
│  ┌────────────────────────────────▼──────────────────────────────────────┐  │
│  │                        Transport Layer                                 │  │
│  │                                                                         │  │
│  │  ┌──────────────────────────┐         ┌──────────────────────────┐   │  │
│  │  │   Stdio Transport        │         │  Streamable HTTP         │   │  │
│  │  │                          │         │  Transport               │   │  │
│  │  │  - Process spawn         │         │  - HTTP POST             │   │  │
│  │  │  - stdin/stdout pipes    │         │  - Bidirectional stream  │   │  │
│  │  │  - Process lifecycle     │         │  - Custom headers        │   │  │
│  │  │  - Environment vars      │         │  - OAuth integration     │   │  │
│  │  │  - Working directory     │         │  - Timeout management    │   │  │
│  │  └──────────────────────────┘         └──────────────────────────┘   │  │
│  │                                                                         │  │
│  └────────────────────────────────┬──────────────────────────────────────┘  │
│                                   │                                          │
│  ┌────────────────────────────────▼──────────────────────────────────────┐  │
│  │                    Authentication & Security Layer                     │  │
│  │                                                                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│  │  │  OAuth Provider │  │  Token Storage  │  │  Trust Manager  │       │  │
│  │  │                 │  │                 │  │                  │       │  │
│  │  │  - PKCE flow    │  │  - Encryption   │  │  - Trust levels  │       │  │
│  │  │  - Discovery    │  │  - Refresh      │  │  - Allowlists    │       │  │
│  │  │  - Google ADC   │  │  - Cache        │  │  - Audit logs    │       │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│  │                                                                         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    Observability & Debugging                            │  │
│  │                                                                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│  │  │  Logger         │  │ Metrics         │  │  Debug          │       │  │
│  │  │                 │  │ Collector       │  │  Inspector      │       │  │
│  │  │  - Structured   │  │                 │  │                  │       │  │
│  │  │  - Levels       │  │  - Performance  │  │  - Message log   │       │  │
│  │  │  - Context      │  │  - Prometheus   │  │  - Analysis      │       │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│  │                                                                         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Diagram (C4 Level 3)

### Client Manager Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        McpClientManager                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Server Registry                                           │    │
│  │  Map<serverName, McpClient>                                │    │
│  │                                                            │    │
│  │  - addServer(name, config)                                 │    │
│  │  - removeServer(name)                                      │    │
│  │  - getClient(name): McpClient                              │    │
│  │  - listServers(): string[]                                 │    │
│  │  - getConnectedServers(): string[]                         │    │
│  └────────────────────────────────────────────────────────────┘    │
│                           │                                          │
│                           │ Creates                                  │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  McpClient (per server)                                    │    │
│  │                                                            │    │
│  │  Properties:                                               │    │
│  │  - serverName: string                                      │    │
│  │  - serverConfig: MCPServerConfig                           │    │
│  │  - client: Client (from SDK)                               │    │
│  │  - transport: Transport                                    │    │
│  │  - status: MCPServerStatus                                 │    │
│  │  - discoveredTools: Map<name, Tool>                        │    │
│  │  - discoveredPrompts: Map<name, Prompt>                    │    │
│  │                                                            │    │
│  │  Methods:                                                  │    │
│  │  - connect(): Promise<void>                                │    │
│  │  - disconnect(): Promise<void>                             │    │
│  │  - discoverTools(): Promise<Tool[]>                        │    │
│  │  - callTool(name, args): Promise<ToolCallResult>           │    │
│  │  - discoverPrompts(): Promise<Prompt[]>                    │    │
│  │  - getPrompt(name, args): Promise<GetPromptResult>         │    │
│  │  - discoverResources(): Promise<Resource[]>                │    │
│  │  - readResource(uri): Promise<ResourceContents>            │    │
│  │  - getStatus(): MCPServerStatus                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                           │                                          │
│                           │ Uses                                     │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  TransportFactory                                          │    │
│  │                                                            │    │
│  │  + create(config): Promise<Transport>                      │    │
│  │  - createStdioTransport(config): Transport                 │    │
│  │  - createHttpTransport(config): Transport                  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagrams

### 1. Tool Discovery and Execution

```
User          ClientManager    McpClient     Transport     MCP Server
 │                 │               │             │              │
 │  callTool()     │               │             │              │
 ├────────────────►│               │             │              │
 │                 │ getClient()   │             │              │
 │                 ├──────────────►│             │              │
 │                 │               │ tools/list  │              │
 │                 │               ├────────────►│──────────────►
 │                 │               │             │ [List tools] │
 │                 │               │             │◄──────────────
 │                 │               │◄────────────┤              │
 │                 │               │ Store tools │              │
 │                 │               │             │              │
 │                 │               │ tools/call  │              │
 │                 │               ├────────────►│──────────────►
 │                 │               │             │ [Execute]    │
 │                 │               │             │◄──────────────
 │                 │               │◄────────────┤              │
 │                 │               │ Sanitize    │              │
 │                 │               │ Transform   │              │
 │                 │◄──────────────┤             │              │
 │◄────────────────┤               │             │              │
 │  Result         │               │             │              │
```

### 2. OAuth Authentication Flow

```
Client       McpClient    OAuthProvider   Browser   OAuth Server   Token Storage
 │               │             │             │            │              │
 │  connect()    │             │             │            │              │
 ├──────────────►│             │             │            │              │
 │               │ Attempt     │             │            │              │
 │               ├────────────────────────────────────────►              │
 │               │             │             │  401 Unauth│              │
 │               │◄────────────────────────────────────────              │
 │               │ Detect OAuth│             │            │              │
 │               ├────────────►│             │            │              │
 │               │             │ Discovery   │            │              │
 │               │             ├─────────────────────────►│              │
 │               │             │◄─────────────────────────┤              │
 │               │             │ Authorize   │            │              │
 │               │             ├────────────►│            │              │
 │               │             │             │ OAuth Flow │              │
 │               │             │             ├───────────►│              │
 │               │             │             │◄───────────┤              │
 │               │             │◄────────────┤ Auth Code  │              │
 │               │             │ Exchange    │            │              │
 │               │             ├─────────────────────────►│              │
 │               │             │◄─────────────────────────┤ Access Token │
 │               │             │ Store Token │            │              │
 │               │             ├────────────────────────────────────────►│
 │               │             │             │            │              │
 │               │ Retry with  │             │            │              │
 │               │ Token       │             │            │              │
 │               ├────────────────────────────────────────►              │
 │               │             │             │  Success   │              │
 │               │◄────────────────────────────────────────              │
 │◄──────────────┤             │             │            │              │
 │  Connected    │             │             │            │              │
```

### 3. Resource Subscription and Updates

```
Client       ResourcesProtocol   McpClient   Transport   MCP Server
 │                 │                 │           │            │
 │  subscribe()    │                 │           │            │
 ├────────────────►│                 │           │            │
 │                 │ resources/list  │           │            │
 │                 ├────────────────►│──────────►│───────────►│
 │                 │                 │           │◄───────────│
 │                 │◄────────────────│◄──────────┤            │
 │                 │ resources/read  │           │            │
 │                 ├────────────────►│──────────►│───────────►│
 │                 │                 │           │◄───────────│
 │                 │◄────────────────│◄──────────┤            │
 │◄────────────────┤ Initial content │           │            │
 │                 │                 │           │            │
 │                 │                 │           │  [Update]  │
 │                 │                 │           │◄───────────│
 │                 │                 │◄──────────┤ Notification│
 │                 │◄────────────────┤           │            │
 │                 │ Invalidate cache│           │            │
 │                 │ resources/read  │           │            │
 │                 ├────────────────►│──────────►│───────────►│
 │                 │                 │           │◄───────────│
 │                 │◄────────────────│◄──────────┤            │
 │◄────────────────┤ Updated content │           │            │
```

---

## State Diagrams

### MCP Client Connection State

```
                    ┌─────────────┐
                    │             │
         ┌──────────┤ DISCONNECTED├──────────┐
         │          │             │          │
         │          └──────┬──────┘          │
         │                 │                 │
         │         connect()                 │
         │                 │                 │
         │                 ▼                 │
         │          ┌─────────────┐          │
         │          │             │          │
         │          │ CONNECTING  │          │
         │          │             │          │
         │          └──────┬──────┘          │
         │                 │                 │
         │         success │ failure         │
         │                 │ └───────────────┘
         │                 ▼
         │          ┌─────────────┐
         │          │             │
         │          │  CONNECTED  │
         │          │             │
         │          └──────┬──────┘
         │                 │
         │         disconnect()
         │                 │
         │                 ▼
         │          ┌─────────────┐
         │          │             │
         └─────────►│DISCONNECTING├──────────┐
                    │             │          │
                    └─────────────┘          │
                            │                │
                          done               │
                            │                │
                            └────────────────┘
```

### OAuth Token Lifecycle

```
                 ┌──────────────┐
                 │              │
        ┌────────┤  NO TOKEN    ├────────┐
        │        │              │        │
        │        └──────────────┘        │
        │                                │
        │        authorize()             │
        │                                │
        │                                ▼
        │        ┌──────────────┐   ┌──────────────┐
        │        │              │   │              │
        │        │ VALID TOKEN  │◄──┤  REFRESHING  │
        │        │              │   │              │
        │        └──────┬───────┘   └──────▲───────┘
        │               │                  │
        │         check expiry       refresh()
        │               │                  │
        │               ▼                  │
        │        ┌──────────────┐          │
        │        │              │          │
        └───────►│ EXPIRED TOKEN├──────────┘
                 │              │
                 └──────────────┘
```

### Trust Level State Machine

```
                    ┌──────────────┐
                    │              │
         ┌──────────┤  UNTRUSTED   │
         │          │              │
         │          └──────┬───────┘
         │                 │
         │         allowlist tool
         │                 │
         │                 ▼
         │          ┌──────────────┐
         │          │     TOOL     │
         │          │ ALLOWLISTED  │
         │          └──────┬───────┘
         │                 │
         │         trust server
         │                 │
         │                 ▼
         │          ┌──────────────┐
         │          │   SERVER     │
         │          │   TRUSTED    │
         │          └──────┬───────┘
         │                 │
         │         trusted folder
         │                 │
         │                 ▼
         │          ┌──────────────┐
         │          │   TRUSTED    │
         │          │    FOLDER    │
         │          └──────┬───────┘
         │                 │
         │         revoke  │
         │                 │
         └─────────────────┘
```

---

## Data Flow Diagrams

### Tool Execution Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│             │     │              │     │              │
│  User Input │────►│  Gemini Flow │────►│ McpClient    │
│  - Tool name│     │  Core        │     │ Manager      │
│  - Arguments│     │              │     │              │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                                 ▼
                                         ┌──────────────┐
                                         │              │
                                         │  McpClient   │
                                         │              │
                                         └──────┬───────┘
                                                │
                      ┌─────────────────────────┴─────────────────┐
                      ▼                                           ▼
              ┌──────────────┐                          ┌──────────────┐
              │              │                          │              │
              │  Schema      │                          │  Transport   │
              │  Sanitizer   │                          │              │
              └──────┬───────┘                          └──────┬───────┘
                     │                                         │
                     │ Sanitized                               │
                     │ Schema                                  ▼
                     │                              ┌──────────────────┐
                     └─────────────────────────────►│                  │
                                                    │  MCP Server      │
                                                    │  (stdio/HTTP)    │
                                                    └──────┬───────────┘
                                                           │
                                                  Raw MCP  │ Response
                                                  Response │
                                                           ▼
                                                  ┌──────────────┐
                                                  │              │
                                                  │  Response    │
                                                  │ Transformer  │
                                                  │              │
                                                  └──────┬───────┘
                                                         │
                                                Gemini   │ Format
                                                Format   │
                                                         ▼
┌─────────────┐     ┌──────────────┐           ┌──────────────┐
│             │     │              │           │              │
│  User       │◄────│  Gemini Flow │◄──────────│  Result      │
│  Response   │     │  Core        │           │              │
└─────────────┘     └──────────────┘           └──────────────┘
```

### Resource Context Integration Flow

```
┌──────────────┐
│              │
│  User Query  │
│              │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│                      │
│  Resource Context    │
│  Provider            │
│                      │
└──────┬───────────────┘
       │
       │ getRelevantResources()
       │
       ▼
┌──────────────────────┐     ┌──────────────────┐
│                      │     │                  │
│  ResourcesProtocol   │────►│  MCP Server      │
│  - discoverResources │     │  - List resources│
│                      │     │                  │
└──────┬───────────────┘     └──────────────────┘
       │
       │ Relevance scoring
       │
       ▼
┌──────────────────────┐
│                      │
│  Top 5 Resources     │
│  Selected            │
│                      │
└──────┬───────────────┘
       │
       │ readResource() for each
       │
       ▼
┌──────────────────────┐     ┌──────────────────┐
│                      │     │                  │
│  Cache Manager       │────►│  MCP Server      │
│  - Check cache       │     │  - Read content  │
│  - Store results     │     │                  │
└──────┬───────────────┘     └──────────────────┘
       │
       │ Format as context
       │
       ▼
┌──────────────────────┐
│                      │
│  Context String      │
│  [Resource: uri]     │
│  Content...          │
│                      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│                      │
│  Gemini Request      │
│  with Resource       │
│  Context             │
│                      │
└────────────────────────
```

### Authentication Data Flow

```
┌──────────────┐
│              │
│  Connection  │
│  Attempt     │
│              │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│                      │     401 Response
│  HTTP Transport      ├────────────────┐
│                      │                │
└──────────────────────┘                │
                                        ▼
                                ┌──────────────────┐
                                │                  │
                                │  OAuth Discovery │
                                │  - Detect 401    │
                                │  - Get metadata  │
                                └──────┬───────────┘
                                       │
                                       ▼
                                ┌──────────────────┐
                                │                  │
                                │  OAuth Provider  │
                                │  - Generate PKCE │
                                │  - Start browser │
                                └──────┬───────────┘
                                       │
       ┌───────────────────────────────┘
       │
       ▼
┌──────────────────┐          ┌──────────────────┐
│                  │          │                  │
│  Browser         │─────────►│  OAuth Server    │
│  - User auth     │  Code    │  - Verify user   │
│                  │◄─────────│  - Issue code    │
└──────────────────┘          └──────────────────┘
       │
       │ Callback
       │
       ▼
┌──────────────────────┐
│                      │
│  Local Server        │
│  :7777/oauth/callback│
│                      │
└──────┬───────────────┘
       │
       │ Authorization code
       │
       ▼
┌──────────────────────┐     ┌──────────────────┐
│                      │     │                  │
│  OAuth Provider      │────►│  OAuth Server    │
│  - Exchange code     │Token│  - Issue token   │
│  - PKCE verify       │◄────│  - Refresh token │
└──────┬───────────────┘     └──────────────────┘
       │
       │ Store encrypted
       │
       ▼
┌──────────────────────┐
│                      │
│  Token Storage       │
│  - Encrypt token     │
│  - Set expiry        │
│  - Store refresh     │
└──────┬───────────────┘
       │
       │ Token
       │
       ▼
┌──────────────────────┐
│                      │
│  Retry Connection    │
│  with Bearer Token   │
│                      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│                      │
│  Connected to        │
│  MCP Server          │
│                      │
└────────────────────────
```

---

## Component Interaction Matrix

### Who Calls What

```
┌────────────────────┬──────┬────────┬─────────┬────────┬──────┬─────┐
│                    │Client│Protocol│Transport│ Auth   │Trust │Debug│
│                    │Mgr   │Handler │Factory  │Provider│Mgr   │     │
├────────────────────┼──────┼────────┼─────────┼────────┼──────┼─────┤
│ ClientManager      │  -   │  Uses  │  Uses   │  Uses  │ Uses │Uses │
│ McpClient          │  -   │  Uses  │  Uses   │  Uses  │ Uses │Uses │
│ ProtocolHandlers   │  -   │   -    │   -     │   -    │ Uses │Uses │
│ TransportFactory   │  -   │   -    │   -     │  Uses  │  -   │Uses │
│ OAuthProvider      │  -   │   -    │   -     │   -    │  -   │Uses │
│ TrustManager       │  -   │   -    │   -     │   -    │  -   │Uses │
│ DebugInspector     │  -   │   -    │   -     │   -    │  -   │  -  │
└────────────────────┴──────┴────────┴─────────┴────────┴──────┴─────┘
```

---

## Deployment Architecture

### Production Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Application Server                        │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  Gemini Flow                                 │   │  │
│  │  │  - Core engine                               │   │  │
│  │  │  - MCP integration layer                     │   │  │
│  │  │  - API endpoints                             │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  Local MCP Servers (stdio)                   │   │  │
│  │  │  - File system server                        │   │  │
│  │  │  - Database server                           │   │  │
│  │  │  - Custom tool servers                       │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           │ HTTPS                           │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Remote MCP Servers                        │  │
│  │                                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │  │
│  │  │  API Server  │  │  Cloud MCP   │  │  Third    │  │  │
│  │  │  (HTTP)      │  │  (HTTP)      │  │  Party    │  │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

External Services:
┌─────────────────┐     ┌──────────────────┐
│  OAuth Provider │     │  Gemini AI API   │
│  (Google, etc.) │     │  (Google AI)     │
└─────────────────┘     └──────────────────┘
```

---

## Migration Path Visualization

### Phase-by-Phase Component Addition

```
CURRENT STATE (Pre-Phase 1):
┌─────────────────────────┐
│  MCPToGeminiAdapter     │  Custom adapter
│  (No official SDK)      │  Limited functionality
└─────────────────────────┘

PHASE 1 (Critical Foundation):
┌─────────────────────────┐
│  AdapterCompat Layer    │  Backward compatibility
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│  McpClient + SDK        │  Official SDK integration
│  Transport Layer        │  stdio + HTTP
│  Tools Protocol         │  Complete implementation
└─────────────────────────┘

PHASE 2 (High Priority):
┌─────────────────────────┐
│  AdapterCompat Layer    │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│  McpClient + SDK        │
│  Transport Layer        │
│  Tools Protocol         │
│  + Prompts Protocol     │  NEW
│  + Resources Protocol   │  NEW
│  + OAuth Provider       │  NEW
└─────────────────────────┘

PHASE 3 (Medium Priority):
┌─────────────────────────┐
│  AdapterCompat Layer    │  (Deprecated)
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│  Full MCP Stack         │
│  + Roots Protocol       │  NEW
│  + Sampling Protocol    │  NEW
│  + Trust Manager        │  NEW
│  + Audit Logger         │  NEW
└─────────────────────────┘

PHASE 4 (Advanced):
┌─────────────────────────┐
│  Complete MCP Client    │
│  All Protocols          │
│  + Elicitation          │  NEW
│  + Conformance Tests    │  NEW
│  + Debug Tools          │  NEW
└─────────────────────────┘
(AdapterCompat removed)
```

---

**This completes the visual architecture documentation for MCP integration in Gemini Flow.**

All diagrams follow industry-standard notations (C4 model, UML) and provide clear visualization of:
- System architecture at multiple levels
- Component interactions and dependencies
- Data flows and state transitions
- Migration path from current to target state
- Deployment architecture

These diagrams should be used alongside the detailed architecture document (`MCP_INTEGRATION_ARCHITECTURE.md`) for implementation guidance.
