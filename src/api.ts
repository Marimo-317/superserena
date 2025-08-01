// Enhanced API Layer with Authentication - SPARC Implementation
// RESTful API with secure password authentication

import { UserService, CreateUserRequest, UpdateUserRequest } from './user';
import { 
  CreateUserWithPasswordRequest, 
  AuthenticateUserRequest, 
  UpdatePasswordRequest 
} from './types/auth';

export class UserAPI {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // Authentication Endpoints

  /**
   * POST /api/auth/register - Register new user with password
   */
  async registerUser(request: CreateUserWithPasswordRequest) {
    try {
      if (!request.name || !request.email || !request.password) {
        return {
          success: false,
          error: 'Name, email, and password are required',
          data: null
        };
      }

      const user = await this.userService.createUserWithPassword(request);
      return {
        success: true,
        data: user,
        message: 'User registered successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register user',
        data: null
      };
    }
  }

  /**
   * POST /api/auth/login - Authenticate user
   */
  async loginUser(request: AuthenticateUserRequest) {
    try {
      if (!request.email || !request.password) {
        return {
          success: false,
          error: 'Email and password are required',
          data: null
        };
      }

      const result = await this.userService.authenticateUser(request);
      if (result.success) {
        return {
          success: true,
          data: result.user,
          message: 'Login successful'
        };
      } else {
        return {
          success: false,
          error: result.error || 'Authentication failed',
          data: null
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Authentication failed',
        data: null
      };
    }
  }

  /**
   * PUT /api/auth/password/:id - Update user password
   */
  async updateUserPassword(userId: string, request: UpdatePasswordRequest) {
    try {
      if (!request.currentPassword || !request.newPassword) {
        return {
          success: false,
          error: 'Current password and new password are required',
          data: null
        };
      }

      const result = await this.userService.updatePassword(userId, request);
      if (result.success) {
        return {
          success: true,
          data: null,
          message: 'Password updated successfully'
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to update password',
          data: null
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update password',
        data: null
      };
    }
  }

  /**
   * GET /api/auth/audit-log - Get security audit log (admin endpoint)
   */
  async getSecurityAuditLog() {
    try {
      const auditLog = this.userService.getSecurityAuditLog();
      return {
        success: true,
        data: auditLog,
        count: auditLog.length
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch audit log',
        data: null
      };
    }
  }

  // Legacy User Management Endpoints (maintained for backward compatibility)

  /**
   * GET /api/users
   */
  async getAllUsers() {
    try {
      const users = await this.userService.getAllUsers();
      return {
        success: true,
        data: users,
        count: users.length
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch users',
        data: null
      };
    }
  }

  /**
   * GET /api/users/:id
   */
  async getUserById(id: string) {
    try {
      const user = await this.userService.getUserById(id);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          data: null
        };
      }
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch user',
        data: null
      };
    }
  }

  /**
   * POST /api/users (Legacy - creates user with auto-generated password)
   */
  async createUser(request: CreateUserRequest) {
    try {
      if (!request.name || !request.email) {
        return {
          success: false,
          error: 'Name and email are required',
          data: null
        };
      }

      const user = await this.userService.createUser(request);
      return {
        success: true,
        data: user,
        message: 'User created successfully (password auto-generated)'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
        data: null
      };
    }
  }

  /**
   * PUT /api/users/:id
   */
  async updateUser(id: string, request: UpdateUserRequest) {
    try {
      const user = await this.userService.updateUser(id, request);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          data: null
        };
      }
      return {
        success: true,
        data: user,
        message: 'User updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
        data: null
      };
    }
  }

  /**
   * DELETE /api/users/:id
   */
  async deleteUser(id: string) {
    try {
      const deleted = await this.userService.deleteUser(id);
      if (!deleted) {
        return {
          success: false,
          error: 'User not found',
          data: null
        };
      }
      return {
        success: true,
        data: null,
        message: 'User deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete user',
        data: null
      };
    }
  }
}