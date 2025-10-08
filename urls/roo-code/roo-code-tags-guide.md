# Roo Code Documentation Tags Guide

This document explains the tag taxonomy used in `roo-code.json` to help agents and developers quickly locate relevant documentation.

## Tag Statistics

Based on 428 documentation URLs:

| Tag | Count | Description |
|-----|-------|-------------|
| `update-notes` | 307 | Version release notes and changelogs |
| `features` | 36 | Feature documentation and guides |
| `api-config` | 35 | API configuration and provider setup |
| `providers` | 35 | AI provider integrations |
| `advanced-usage` | 29 | Advanced features and techniques |
| `major-release` | 27 | Major version releases (x.y.0) |
| `tools` | 21 | Available tools and commands |
| `getting-started` | 10 | Installation and setup guides |
| `mcp` | 9 | Model Context Protocol integration |
| `roo-cloud` | 8 | Roo Code Cloud features |

## Tag Categories

### Documentation Type Tags

**Core Documentation:**
- `getting-started` - Installation, setup, and first steps
- `basic-usage` - Basic features and workflows
- `advanced-usage` - Advanced features and techniques
- `features` - Feature-specific documentation
- `update-notes` - Version release notes
- `faq` - Frequently asked questions
- `tips` - Tips and best practices
- `tutorials` - Tutorial content
- `videos` - Video tutorials

**Version Tags:**
- `major-release` - Major releases (x.y.0)
- `major-version` - Major version changes (x.0.0)

### Feature Category Tags

**Tool Operations:**
- `tools` - Available tools overview
- `file-operations` - File reading, writing, listing
- `editing` - Code editing and modification
- `search` - File and codebase search
- `terminal` - Terminal/shell commands
- `browser` - Browser automation
- `code-analysis` - Code analysis tools
- `task-management` - Todo and task tracking
- `task-orchestration` - Complex task workflows (Boomerang)

**AI & Integration:**
- `mcp` - Model Context Protocol
- `providers` - AI provider configurations
- `api-config` - API setup and configuration
- `local-ai` - Local model support
- `ollama` - Ollama integration
- `lm-studio` - LM Studio integration
- `embeddings` - Semantic search/embeddings
- `semantic-search` - Codebase indexing

**Customization:**
- `modes` - Chat modes and customization
- `customization` - Custom settings and configurations
- `system-prompts` - System prompt overrides
- `slash-commands` - Custom slash commands
- `custom-instructions` - User preferences

**Performance & Optimization:**
- `performance` - Performance features
- `diffs` - Diff-based editing
- `context-management` - Context handling
- `async` - Asynchronous operations

**UI & Workflow:**
- `ui` - User interface features
- `interface` - Chat interface
- `keyboard` - Keyboard shortcuts
- `conversation` - Conversation features
- `suggested-responses` - Quick responses
- `workflow` - Workflow automation

**Integration & Extensions:**
- `vscode-integration` - VS Code features
- `editor` - Editor integration
- `shell-integration` - Shell/terminal integration
- `marketplace` - Extension marketplace
- `extensions` - Community extensions

**Advanced Features:**
- `experimental` - Experimental features
- `automation` - Auto-approval and automation
- `web-automation` - Browser use features
- `checkpoints` - Version control/undo
- `diagnostics-integration` - Error detection

**Security & Configuration:**
- `security` - Security features
- `file-filtering` - .rooignore and access control
- `authentication` - Login and auth
- `import-export` - Settings management

### Provider Tags

**Major Providers:**
- `anthropic` / `claude` - Anthropic Claude models
- `openai` / `gpt` - OpenAI GPT models
- `google` / `gemini` / `vertex-ai` - Google AI services
- `aws` / `bedrock` - Amazon Bedrock
- `groq` - Groq fast inference
- `deepseek` - DeepSeek models
- `mistral` - Mistral AI
- `xai` / `grok` - xAI/Grok models

**Aggregators:**
- `openrouter` - OpenRouter gateway
- `litellm` - LiteLLM proxy
- `requesty` - Requesty API
- `vercel` / `gateway` - Vercel AI Gateway

**Local & Alternative:**
- `local-ai` - Local model support
- `ollama` - Ollama platform
- `lm-studio` - LM Studio
- `cerebras` - Cerebras inference
- `chutes` - Chutes AI (free)
- `claude-code-cli` - Claude Code provider
- `roo-cloud` - Roo Code Cloud
- `human-relay` - Manual relay
- `vscode` / `github-copilot` - VS Code LM API

**Configuration:**
- `openai-compatible` - OpenAI-compatible providers
- `custom` - Custom configurations

### Roo Code Cloud Tags

- `roo-cloud` - Cloud features
- `authentication` - Login/signup
- `sync` - Task synchronization
- `collaboration` - Sharing and teamwork
- `sharing` - Task sharing
- `remote-control` - Roomote control
- `monitoring` - Dashboard and monitoring
- `billing` / `subscription` - Billing and subscriptions

### Best Practices Tags

- `best-practices` - Best practices guides
- `prompting` - Prompt engineering
- `troubleshooting` - Problem solving
- `context-poisoning` - Context management issues
- `large-projects` - Working with large codebases

## Usage Examples

### Finding Installation Docs
```javascript
urls.filter(u => u.tags.includes('getting-started') && u.tags.includes('installation'))
```

### Finding MCP Documentation
```javascript
urls.filter(u => u.tags.includes('mcp'))
```

### Finding Tool Documentation
```javascript
urls.filter(u => u.tags.includes('tools'))
// Or specific tool categories:
urls.filter(u => u.tags.includes('file-operations'))
urls.filter(u => u.tags.includes('editing'))
```

### Finding Provider Setup Guides
```javascript
urls.filter(u => u.tags.includes('providers'))
// Or specific provider:
urls.filter(u => u.tags.includes('anthropic'))
urls.filter(u => u.tags.includes('ollama'))
```

### Finding Advanced Features
```javascript
urls.filter(u => u.tags.includes('advanced-usage'))
```

### Finding Major Releases Only
```javascript
urls.filter(u => u.tags.includes('major-release'))
```

### Finding Experimental Features
```javascript
urls.filter(u => u.tags.includes('experimental'))
```

### Finding Task Orchestration Docs
```javascript
urls.filter(u => u.tags.includes('task-orchestration'))
```

### Finding Customization Options
```javascript
urls.filter(u => u.tags.includes('customization') || u.tags.includes('modes'))
```

## Special Notes

### Update Notes (307 URLs)
72% of the documentation consists of version release notes. These are tagged with:
- `update-notes` - All releases
- `major-release` - Major releases (x.y.0)
- `major-version` - Major version changes (x.0.0)

If you want to exclude version notes from searches:
```javascript
urls.filter(u => !u.tags.includes('update-notes'))
```

### Empty Tags
Very few URLs have empty tags. Most are properly categorized.

### MCP Documentation
MCP (Model Context Protocol) documentation includes:
- Overview and concepts
- Server configuration
- Transport mechanisms
- Recommended servers
- Tool usage
- Resource access

### Tools Documentation
21 tool-specific docs covering:
- File operations (read, write, list)
- Search (files, codebase)
- Editing (diff, replace, insert)
- Terminal commands
- Browser automation
- MCP integration
- Task management
- Code analysis

## Tag Combination Patterns

Common combinations:
1. **Getting Started:** `["getting-started", "installation", "setup"]`
2. **Provider Setup:** `["providers", "api-config", "getting-started"]`
3. **Advanced Tools:** `["advanced-usage", "tools", "file-operations"]`
4. **MCP Integration:** `["features", "mcp", "integration"]`
5. **Customization:** `["features", "customization", "modes"]`
6. **Performance:** `["features", "performance", "diffs"]`
7. **Cloud Features:** `["roo-cloud", "sync", "collaboration"]`

## Recommendations for Agents

When searching Roo Code documentation:

1. **For setup:** Start with `getting-started` or `providers`
2. **For features:** Filter by `features` + specific feature type
3. **For tools:** Use `tools` + operation type (file-operations, editing, etc.)
4. **For MCP:** Filter by `mcp`
5. **For troubleshooting:** Check `troubleshooting`, `best-practices`, or `faq`
6. **For customization:** Look at `modes`, `customization`, or `slash-commands`
7. **Exclude changelogs:** Add `!u.tags.includes('update-notes')` to filters
8. **Major releases only:** Use `major-release` tag to see important updates
