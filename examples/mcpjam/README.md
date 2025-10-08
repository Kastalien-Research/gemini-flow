# MCPJam Example Configurations

This directory contains example configuration files and workflows for the MCPJam evaluation framework integrated into Gemini Flow.

## Files

### Configuration Examples

1. **`environment.example.json`** - Example MCP server configurations
   - Demonstrates STDIO server setup
   - Shows environment variable configuration
   - Includes popular MCP servers (filesystem, sequential-thinking, brave-search, github, postgres)
   - Contains custom server example

2. **`tests.example.json`** - Example test suite definitions
   - 16 comprehensive test examples
   - Covers single-step and multi-step workflows
   - Demonstrates cross-provider comparison
   - Includes consistency testing patterns
   - Shows performance testing configurations

3. **`workflows.example.md`** - Complete workflow examples
   - 8 end-to-end workflow guides
   - Step-by-step instructions with commands
   - Expected outputs and success criteria
   - Troubleshooting and optimization tips

## Quick Start

### 1. Copy Example Configurations

```bash
# Initialize MCPJam
gemini-flow mcp evals init

# Copy example configurations
cp examples/mcpjam/environment.example.json .mcpjam/environment.json
cp examples/mcpjam/tests.example.json .mcpjam/tests.json
```

### 2. Configure Sensitive Data

Edit the copied files to add your actual credentials:

**`.mcpjam/environment.json`:**
```json
{
  "servers": {
    "brave-search": {
      "env": {
        "BRAVE_API_KEY": "your-actual-brave-api-key"
      }
    },
    "github": {
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-actual-github-token"
      }
    }
  }
}
```

**API Keys (encrypted storage):**
```bash
gemini-flow mcp evals config llm anthropic YOUR_ANTHROPIC_API_KEY
gemini-flow mcp evals config llm openai YOUR_OPENAI_API_KEY
gemini-flow mcp evals config llm gemini YOUR_GEMINI_API_KEY
```

### 3. Customize Tests

Edit `.mcpjam/tests.json` to:
- Remove tests for servers you don't have configured
- Add your own test cases
- Adjust `runs`, `temperature`, and `maxTokens` as needed

### 4. Run Tests

```bash
# Run all tests
gemini-flow mcp evals run

# Run with JSON output
gemini-flow mcp evals run --json > results.json

# Run specific test file
gemini-flow mcp evals run -t custom-tests.json
```

## Example Configurations Explained

### Environment Configuration

The `environment.example.json` demonstrates:

**STDIO Server (No Credentials):**
```json
{
  "sequential-thinking": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
  }
}
```

**STDIO Server with Environment Variables:**
```json
{
  "brave-search": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    "env": {
      "BRAVE_API_KEY": "your-api-key"
    }
  }
}
```

**Custom Server:**
```json
{
  "custom-mcp-server": {
    "command": "node",
    "args": ["dist/custom-server.js"],
    "env": {
      "API_KEY": "custom-api-key",
      "LOG_LEVEL": "info",
      "DATABASE_URL": "sqlite://./data.db"
    }
  }
}
```

### Test Configuration

The `tests.example.json` demonstrates:

**Basic Test:**
```json
{
  "title": "Basic file listing",
  "query": "List all files in the current directory",
  "runs": 1,
  "model": "claude-3-5-sonnet-latest",
  "provider": "anthropic",
  "expectedToolCalls": ["list_directory"],
  "temperature": 0
}
```

**Multi-Run Consistency Test:**
```json
{
  "title": "Consistency test: File reading",
  "query": "Read the README.md file and summarize the project",
  "runs": 5,
  "model": "claude-3-5-sonnet-latest",
  "provider": "anthropic",
  "expectedToolCalls": ["read_file"],
  "temperature": 0
}
```

**Cross-Provider Comparison:**
```json
[
  {
    "title": "Cross-provider comparison: Code search (Claude)",
    "query": "Find all files that export a class",
    "runs": 3,
    "model": "claude-3-5-sonnet-latest",
    "provider": "anthropic",
    "expectedToolCalls": ["search_files"]
  },
  {
    "title": "Cross-provider comparison: Code search (GPT-4)",
    "query": "Find all files that export a class",
    "runs": 3,
    "model": "gpt-4-turbo",
    "provider": "openai",
    "expectedToolCalls": ["search_files"]
  }
]
```

**No Expected Tools (General Quality):**
```json
{
  "title": "General response quality (no expected tools)",
  "query": "Explain the benefits of using MCP for AI applications",
  "runs": 1,
  "model": "gpt-4-turbo",
  "provider": "openai",
  "expectedToolCalls": [],
  "temperature": 0.7
}
```

## Customization Guide

### Adding Your Own Server

1. **Add to environment.json:**
   ```json
   {
     "servers": {
       "my-server": {
         "command": "node",
         "args": ["path/to/server.js"],
         "env": {
           "MY_API_KEY": "secret-key"
         }
       }
     }
   }
   ```

2. **Or use CLI:**
   ```bash
   gemini-flow mcp evals config server add my-server \
     --command node \
     --args path/to/server.js \
     --env MY_API_KEY=secret-key
   ```

### Creating Custom Tests

1. **Single-step test:**
   ```json
   {
     "title": "Test my custom tool",
     "query": "Use my custom tool to process data",
     "model": "claude-3-5-sonnet-latest",
     "provider": "anthropic",
     "expectedToolCalls": ["my_custom_tool"]
   }
   ```

2. **Multi-step test:**
   ```json
   {
     "title": "Complex workflow",
     "query": "First read the config, then process it, and save the results",
     "model": "gpt-4-turbo",
     "provider": "openai",
     "expectedToolCalls": ["read_config", "process_data", "save_results"]
   }
   ```

3. **Performance test:**
   ```json
   {
     "title": "Performance benchmark",
     "query": "List all files",
     "runs": 10,
     "model": "gemini-2.0-flash-exp",
     "provider": "gemini",
     "expectedToolCalls": ["list_files"]
   }
   ```

## Common Use Cases

### 1. Filesystem Testing
Use `environment.example.json` + tests 1-6 from `tests.example.json`

### 2. Sequential Reasoning
Use test 5 from `tests.example.json`

### 3. Database Operations
Use test 8 from `tests.example.json` + configure postgres server

### 4. Web Search
Use test 9 from `tests.example.json` + configure brave-search server

### 5. GitHub Integration
Use test 7 from `tests.example.json` + configure github server

### 6. Cross-Provider Benchmarking
Use tests 11-13 from `tests.example.json`

### 7. Performance Testing
Use test 14 from `tests.example.json`

### 8. Complex Multi-Step Workflows
Use tests 6 and 15 from `tests.example.json`

## Best Practices

### Configuration Management

1. **Keep sensitive data separate:**
   - Use environment variables for API keys
   - Don't commit `.mcpjam/llms.encrypted.json` to git
   - Use `.gitignore` to exclude credentials

2. **Version control your test definitions:**
   - Commit `tests.json` to track test evolution
   - Use descriptive test titles
   - Document expected behavior in comments

3. **Organize tests by category:**
   ```
   .mcpjam/
   ├── tests.json                 # All tests
   ├── filesystem-tests.json      # Filesystem-specific
   ├── reasoning-tests.json       # Sequential thinking
   ├── integration-tests.json     # Multi-server tests
   └── performance-tests.json     # Benchmarks
   ```

### Test Design

1. **Start simple, increase complexity:**
   - Test one tool at a time
   - Verify basic functionality before complex workflows
   - Use multiple runs for consistency validation

2. **Use appropriate models:**
   - Claude 3.5 Sonnet: Best tool-use accuracy
   - GPT-4 Turbo: Good for OpenAI ecosystem testing
   - Gemini 2.0 Flash: Fast and cost-effective

3. **Set realistic expectations:**
   - Don't expect 100% success on ambiguous queries
   - Use explicit language for tool invocation
   - Test with temperature=0 for deterministic behavior

4. **Monitor costs:**
   - Use Gemini Flash for repetitive tests
   - Limit `runs` for expensive models
   - Optimize `maxTokens` to minimum needed

## Troubleshooting

### Issue: Server fails to start

**Check:**
```bash
# Manually test server command
npx -y @modelcontextprotocol/server-filesystem /workspace

# Verify environment variables
cat .mcpjam/environment.json | jq '.servers.my_server.env'
```

### Issue: Test fails with "No expected tools"

**Solutions:**
- Make query more explicit about needing tools
- Verify server provides the expected tool: `gemini-flow mcp list`
- Check model supports tool calling
- Review actual tool calls in output

### Issue: Encrypted config error

**Solutions:**
```bash
# Remove corrupted file
rm .mcpjam/llms.encrypted.json

# Re-add API keys
gemini-flow mcp evals config llm anthropic $ANTHROPIC_API_KEY
```

### Issue: High test failure rate

**Analysis:**
```bash
# Get detailed failure info
gemini-flow mcp evals run --json | jq '.results[] | select(.success == false)'

# Check for patterns in failures
gemini-flow mcp evals run --json | jq '.results | group_by(.provider) | map({
  provider: .[0].provider,
  failures: map(select(.success == false)) | length
})'
```

## Integration with Workflows

The `workflows.example.md` file provides 8 complete workflows:

1. **Initial Setup and Validation** - Get started quickly
2. **Testing Filesystem Operations** - Validate file tools
3. **Cross-Provider Comparison** - Compare LLM performance
4. **CI/CD Integration** - Automate testing in GitHub Actions
5. **Performance Benchmarking** - Measure and optimize
6. **Agent-Assisted Test Generation** - Use Gemini Flow agents
7. **Debugging Failed Tests** - Troubleshoot issues
8. **Cost Optimization** - Minimize API expenses

Each workflow includes:
- Clear objectives
- Step-by-step commands
- Expected outputs
- Success criteria
- Analysis techniques

## Additional Resources

- **User Guide**: `docs/api/mcpjam-user-guide.md` - Comprehensive documentation
- **Integration Guide**: `docs/mcp-mcpjam-integration.md` - Architecture details
- **MCP Setup**: `docs/mcp-api-setup-guide.md` - MCP server configuration
- **CLI Reference**: `docs/api/gemini-cli-commands.md` - All CLI commands

## Contributing

To add new examples:

1. Create your configuration
2. Test it thoroughly
3. Document in this README
4. Submit PR with:
   - New example file(s)
   - Updated README
   - Test results showing it works

## License

Same as Gemini Flow project.

---

**Last Updated**: 2025-10-07
**Gemini Flow Version**: 1.3.3
