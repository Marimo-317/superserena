---
description: Configure Windows optimization settings for SuperSerena environment
---

## Setup Optimization Command

Configure memory persistence, auto-save, and Windows-specific optimizations for the SuperSerena development environment.

### Optimization Settings:

#### Memory Persistence Configuration:
- **Serena Memory**: Automatic persistence across sessions
- **Agent Context**: Cross-session context preservation  
- **Project State**: Persistent project knowledge base
- **Performance Cache**: Optimization result caching

#### Auto-Save Features:
- **Agent Results**: Automatic saving of agent outputs
- **Workflow States**: SPARC phase checkpoint saving
- **Quality Metrics**: Performance and security metrics persistence
- **Integration Logs**: Complete development workflow logging

#### Windows-Specific Optimizations:
- **Path Handling**: Automatic Windows/Unix path conversion
- **PowerShell Integration**: Seamless PowerShell command execution
- **Git Bash Compatibility**: Full Git Bash environment support
- **Process Management**: Efficient resource management for parallel agents

### Environment Variables:
```powershell
# Memory persistence
$env:CLAUDE_AUTO_SAVE = "true"
$env:CLAUDE_MEMORY_PERSIST = "true"
$env:SERENA_MEMORY_OPTIMIZE = "true"

# Performance optimization
$env:SPARC_PARALLEL_MODE = "true"
$env:TOKEN_OPTIMIZATION = "aggressive"
$env:AGENT_CONCURRENCY = "auto"

# Windows compatibility
$env:PATH_SEPARATOR = "auto-detect"
$env:SHELL_COMPATIBILITY = "both"
```

### Quality Assurance Settings:
- **Validation Gates**: Enabled for all SPARC phases
- **Security Scanning**: Automatic vulnerability detection
- **Performance Monitoring**: Real-time performance tracking
- **Test Coverage**: Minimum 90% coverage enforcement

### Dashboard Access:
- **Serena Dashboard**: http://localhost:24282/dashboard/index.html
- **Performance Metrics**: Real-time token usage monitoring
- **Agent Status**: Live agent execution status
- **Memory Browser**: Interactive memory file browser

### Troubleshooting Configuration:
- **Debug Mode**: Enhanced error reporting and logging
- **Rollback Capability**: Automatic configuration rollback
- **Health Checks**: Periodic system health validation
- **Error Recovery**: Graceful degradation on component failures

This configuration maximizes the SuperSerena environment performance while ensuring reliability and Windows compatibility.