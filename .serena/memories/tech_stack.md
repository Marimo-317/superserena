# Tech Stack and Architecture

## Development Environment
- **OS**: Windows 11 (MINGW64_NT-10.0-26100)
- **Python**: 3.11.9
- **Package Manager**: uv (v0.8.4)
- **Git**: Repository managed

## Core Frameworks
- **Claude Code**: Base AI development environment with Sonnet 4
- **SuperClaude**: AI persona and command framework
- **Serena MCP**: Model Context Protocol server for semantic analysis
- **SPARC Methodology**: Structured development approach

## Key Technologies
- **MCP (Model Context Protocol)**: For AI agent communication
- **Semantic Analysis**: Code understanding without file reading
- **Token Optimization**: Advanced compression and efficiency techniques
- **Multi-Agent Orchestration**: Parallel AI agent coordination

## Agent Architecture
- **Orchestrator Agents**: Master workflow coordination
- **Specialist Agents**: Domain-specific expertise (architecture, security, performance)
- **Development Agents**: Implementation, testing, DevOps
- **Integration Commands**: Workflow automation and batch processing

## File Structure
```
.claude/
├── agents/          # Custom agent definitions
├── commands/        # Custom command definitions
└── *.md            # Framework configuration files

.serena/
├── memories/        # Project knowledge base
└── project.yml      # Serena configuration
```