# Firecrawl Documentation Tags Guide

This document explains the tag taxonomy used in `firecrawl-urls.json` to help agents and developers quickly locate relevant documentation.

## Tag Statistics

Based on 163 documentation URLs:

| Tag | Count | Description |
|-----|-------|-------------|
| `api-reference` | 65 | API endpoint documentation |
| `features` | 25 | Feature guides and explanations |
| `use-cases` | 24 | Real-world use case examples |
| `crawling` | 20 | Website crawling functionality |
| `v1` | 19 | API v1 endpoints |
| `scraping` | 19 | Web scraping functionality |
| `batch-operations` | 14 | Batch scraping operations |
| `billing` | 12 | Credit/token usage and billing |
| `extraction` | 11 | Data extraction with LLMs |
| `ai-integration` | 9 | AI platform integrations |
| `guides` | 9 | Getting started and how-to guides |
| `integrations` | 8 | Third-party integrations |
| `webhooks` | 8 | Webhook functionality |

## Tag Categories

### API Functionality Tags

**Core Operations:**
- `scraping` - Single-page web scraping
- `crawling` - Multi-page website crawling
- `batch-operations` - Batch scraping multiple URLs
- `extraction` - Structured data extraction with LLMs
- `mapping` - URL mapping/discovery
- `search` - Web search functionality

**Infrastructure:**
- `queue` - Queue status monitoring
- `billing` - Credit and token usage tracking
- `proxies` - Proxy configuration and management
- `webhooks` - Webhook events and security

### Version Tags
- `v0` - API version 0 (legacy)
- `v1` - API version 1
- `v2` - API version 2 (latest)

### Feature Tags
- `performance` - Performance optimization features
- `stealth-mode` - Anti-bot evasion
- `monitoring` - Change tracking and observability

### Integration Tags
- `langchain` - LangChain integration
- `llamaindex` - LlamaIndex integration
- `crewai` - CrewAI integration
- `flowise` - Flowise integration
- `langflow` - Langflow integration
- `dify` - Dify integration
- `mcp` - Model Context Protocol
- `ai-integration` - General AI platform integration

### Use Case Tags
- `research` - Deep research applications
- `monitoring` - Website monitoring and tracking
- `content` - Content generation
- `finance` - Financial/investment use cases
- `sales` - Lead enrichment and sales
- `ecommerce` - Product/e-commerce monitoring
- `seo` - SEO optimization
- `data-management` - Data migration and management

### Documentation Type Tags
- `guides` - Tutorial and guide content
- `getting-started` - Quickstart documentation
- `advanced` - Advanced topics
- `migration` - Version migration guides
- `rate-limits` - Rate limiting documentation
- `contributing` - Contribution guides
- `self-hosting` - Self-hosting documentation
- `open-source` - Open source vs cloud comparison

### SDK Tags
- `sdks` - SDK documentation
- `node` - Node.js SDK
- `typescript` - TypeScript examples/docs
- `overview` - SDK overview

### Special Tags
- `agents` - AI agent functionality
- `security` - Security best practices
- `testing` - Testing and debugging
- `events` - Event types and handling

## Usage Examples

### Finding Scraping Documentation
Look for entries with tags: `["api-reference", "scraping"]` or `["features", "scraping"]`

### Finding Batch Operations
Look for entries with tags: `["batch-operations"]`

### Finding AI/MCP Integration Docs
Look for entries with tags: `["mcp"]` or `["ai-integration"]`

### Finding Getting Started Guides
Look for entries with tags: `["guides", "getting-started"]`

### Finding v1 API Endpoints
Look for entries with tags: `["api-reference", "v1"]`

### Finding Webhook Documentation
Look for entries with tags: `["webhooks"]`

## Empty Tags

Some URLs have empty tags arrays (`[]`). These include:
- Legacy documentation paths
- Sitemap files
- Miscellaneous learning resources
- Welcome pages that don't fit specific categories

## Tag Combination Patterns

Common tag combinations that appear together:

1. **API Endpoints:** `["api-reference", "scraping"|"crawling"|"extraction", "v1"|"v2"]`
2. **Features:** `["features", "scraping"|"crawling"|"extraction"]`
3. **Use Cases:** `["use-cases", "ai-integration"|"monitoring"|"research"]`
4. **Integrations:** `["integrations", "<integration-name>"]`
5. **Guides:** `["guides", "getting-started"|"advanced"|"migration"]`

## Recommendation for Agents

When searching for documentation:

1. **For API endpoints:** Filter by `api-reference` + operation type (scraping/crawling/etc.)
2. **For how-to guides:** Filter by `features` or `guides`
3. **For examples:** Filter by `use-cases`
4. **For specific versions:** Add `v1` or `v2` to your filter
5. **For integrations:** Start with `integrations` or `ai-integration`
