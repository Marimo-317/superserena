---
description: Execute complete SPARC workflow with parallel agent coordination
---

## SPARC Flow Command

Orchestrates the complete SPARC development lifecycle with all specialized agents.

### Usage:
`/sparc-flow [project-name] [requirements]`

### Example:
`/sparc-flow "user-auth-system" "Implement OAuth2 authentication with JWT tokens and role-based access control"`

### Workflow Phases:

#### 1. **Specification** (sparc-orchestrator)
- Requirements gathering and analysis
- User story creation with acceptance criteria
- Technical specification documentation
- Stakeholder validation and sign-off

#### 2. **Pseudocode** (sparc-architect + sparc-orchestrator)
- High-level system design
- Module and component planning
- Interface and API definitions
- Data flow and interaction patterns

#### 3. **Architecture** (sparc-architect + sparc-security-reviewer)
- Detailed system architecture design
- Security architecture and threat modeling
- Scalability and performance planning
- Technology stack selection and validation

#### 4. **Refinement** (parallel execution of specialists)
- **sparc-coder**: Core implementation with TDD
- **sparc-tdd**: Comprehensive test suite creation
- **sparc-performance**: Performance optimization and benchmarking
- **sparc-security-reviewer**: Security audit and vulnerability assessment

#### 5. **Completion** (sparc-devops + quality validation)
- CI/CD pipeline setup and configuration
- Deployment configuration and automation
- Monitoring and observability setup
- Final quality gates and production readiness

### Integration Features:
- **Memory Persistence**: All phases automatically save to Serena memory
- **Token Optimization**: 80% savings through Serena semantic analysis
- **Quality Gates**: Validation checkpoints between each phase
- **Rollback Capability**: Automatic rollback on phase failures
- **Progress Tracking**: Real-time workflow status updates

### Command Execution Pattern:
```
Tell sparc-orchestrator to execute SPARC flow for [project-name]:
1. Coordinate specification phase with requirements: [requirements]
2. Delegate architecture design to sparc-architect
3. Execute parallel refinement with all specialists
4. Finalize with sparc-devops for deployment readiness
5. Create comprehensive project memory for future reference
```

### Success Criteria:
- ✅ All SPARC phases completed successfully
- ✅ Quality gates passed at each phase
- ✅ Comprehensive test coverage (>90%)
- ✅ Security audit passed
- ✅ Performance benchmarks met
- ✅ Deployment ready with CI/CD configured