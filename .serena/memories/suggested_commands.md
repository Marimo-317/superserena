# Essential Commands for SuperSerena Development Environment

## Core Development Commands

### SPARC Workflow Commands
- `/sparc-flow [project-name] [requirements]` - Execute complete SPARC development lifecycle
- `/batch-dev [task-list]` - Run multiple specialized agents in parallel
- `Tell sparc-orchestrator to [task]` - SPARC-compliant development coordination

### Serena Semantic Analysis Commands
- `mcp__serena__get_symbols_overview` - Get high-level code structure overview
- `mcp__serena__find_symbol [name_path]` - Find and analyze specific code symbols
- `mcp__serena__search_for_pattern [pattern]` - Search codebase with semantic understanding
- `mcp__serena__replace_symbol_body` - Precise symbol-level code editing

### SuperClaude Framework Commands
- `/sc:analyze` - Comprehensive project analysis
- `/sc:implement [feature]` - Feature implementation with persona auto-selection
- `/sc:improve [target]` - Code enhancement and optimization
- `/agents` - List and manage available agents

### Agent Delegation Commands
- `Tell [agent-name] to [task]` - Delegate to specific specialist agent
- `Use [agent-name] for [specific-task]` - Targeted agent usage

## Agent Specialists Available
- **sparc-orchestrator**: Master workflow coordinator
- **sparc-architect**: Systems architecture and design
- **sparc-coder**: Implementation with TDD practices
- **sparc-tdd**: Comprehensive testing specialist
- **sparc-security-reviewer**: Security audit and compliance
- **sparc-devops**: CI/CD and infrastructure automation
- **sparc-performance**: Performance optimization expert

## Token Optimization
- Always prefer Serena semantic commands over file reading (80% token savings)
- Use agent delegation for parallel processing
- Leverage memory persistence for cross-session context

## Quality Assurance Workflow
1. SPARC methodology compliance for all features
2. Automated testing with TDD approach
3. Security review for all implementations
4. Performance optimization validation
5. DevOps integration and deployment readiness