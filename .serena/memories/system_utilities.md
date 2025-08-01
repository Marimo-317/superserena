# Windows System Utilities and Commands

## Package Management
- `uv` - Primary Python package manager (v0.8.4)
- `uv venv` - Create virtual environments
- `uv pip install [package]` - Install Python packages

## File System Operations (Windows)
- `ls` - List directory contents (Git Bash)
- `dir` - List directory contents (PowerShell)
- `mkdir -p [path]` - Create directories recursively
- `cp -r [source] [dest]` - Copy files/directories
- `pwd` - Show current directory path

## Git Operations
- Standard git commands work in Git Bash environment
- Repository is already initialized and managed

## Development Environment
- **Working Directory**: `/c/Users/shiro/superserena`
- **Python**: 3.11.9 available globally
- **Shell**: Git Bash with PowerShell compatibility
- **Claude Config**: `~/.claude/` for global settings

## Process Management
- Background services may need manual termination
- Serena dashboard available at: `http://localhost:24282/dashboard/index.html`
- Check running processes with Task Manager if needed

## Path Considerations
- Use forward slashes in Git Bash: `/c/Users/...`
- Use backslashes in PowerShell: `C:\Users\...`
- Serena handles both path formats automatically

## Environment Variables
- `USERPROFILE` - User home directory
- Custom variables can be set for Claude Code integration
- Memory persistence enabled by default