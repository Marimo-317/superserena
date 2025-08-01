# Development Workflow and Task Completion Guidelines

## SPARC Development Methodology
All feature development follows the SPARC approach:
1. **Specification**: Clear, testable requirements definition
2. **Pseudocode**: Modular blueprint creation with TDD anchors  
3. **Architecture**: Scalable, secure system design
4. **Refinement**: Iterative improvement cycles
5. **Completion**: Comprehensive testing and deployment readiness

## Task Completion Checklist
When completing any development task:

### Phase 1: Implementation
- [ ] Use Serena semantic analysis instead of file reading
- [ ] Follow TDD practices (tests first, then implementation)
- [ ] Apply clean code principles (SOLID, DRY, KISS)
- [ ] Use appropriate agent specialization

### Phase 2: Quality Assurance  
- [ ] Run security review via sparc-security-reviewer
- [ ] Performance optimization via sparc-performance
- [ ] Comprehensive test coverage (>90% unit, >70% integration)
- [ ] Code quality validation

### Phase 3: Integration
- [ ] DevOps integration via sparc-devops
- [ ] CI/CD pipeline validation
- [ ] Documentation updates
- [ ] Memory persistence for future reference

## Agent Coordination Pattern
1. **Orchestrator** assigns work based on complexity
2. **Specialists** execute domain-specific tasks in parallel
3. **Quality gates** validate each phase completion
4. **Integration** ensures seamless deployment readiness

## Windows Environment Considerations
- Use PowerShell for system commands
- Leverage uv for Python package management
- Account for Windows path separators in file operations
- Test cross-platform compatibility where applicable