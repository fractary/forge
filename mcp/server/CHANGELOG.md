# Changelog

All notable changes to the @fractary/forge-mcp package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-17

### Added
- Initial release of @fractary/forge-mcp MCP server
- 18 read-focused tools for querying Forge ecosystem:
  - Agent tools (3): list, info, validate
  - Tool tools (3): list, info, validate
  - Plugin tools (3): list, info, search
  - Config tools (3): get, show, registry_list
  - Cache tools (2): stats, clear
  - Fork tools (4): list, info, diff, check
- Integration with @fractary/forge SDK
- Zod-based input validation
- StdioServerTransport for MCP communication
- Comprehensive error handling and formatting
- Support for local, global, and all location queries
- Tag filtering for agents and tools
- Human-readable cache size formatting
- Dot notation config key access

### Architecture
- Read-focused operations only (no mutations)
- Stateless server design
- 3-tier resolution: local → global → stockyard
- Follows SPEC-00026 naming conventions

### Documentation
- Comprehensive README with usage examples
- Tool reference documentation
- Claude Desktop configuration examples
- Contributing guidelines
