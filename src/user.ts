// Enhanced User Service with Password Hashing - SPARC Implementation
// Secure user management with bcrypt password hashing

import { PasswordService } from './password';
import { 
  AuthenticatedUser, 
  CreateUserWithPasswordRequest, 
  AuthenticateUserRequest, 
  UpdatePasswordRequest,
  AuthenticationResult,
  PasswordUpdateResult,
  SecurityAuditLog,
  isValidEmail 
} from './types/auth';

// Internal User interface (includes password hash)
interface InternalUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

// Legacy interfaces maintained for backward compatibility
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export class UserService {
  private users: Map<string, InternalUser> = new Map();
  private passwordService: PasswordService;
  private auditLog: SecurityAuditLog[] = [];

  constructor() {
    this.passwordService = new PasswordService();
  }

  /**
   * Create a new user with password hashing
   * @param request - User creation request with password
   * @returns Promise<AuthenticatedUser> - Created user (without password hash)
   */
  async createUserWithPassword(request: CreateUserWithPasswordRequest): Promise<AuthenticatedUser> {
    // Validate input
    if (!request.name?.trim()) {
      throw new Error('Name is required');
    }

    if (!request.email?.trim()) {
      throw new Error('Email is required');
    }

    if (!isValidEmail(request.email.trim())) {
      throw new Error('Invalid email format');
    }

    // Check if user already exists
    const existingUser = Array.from(this.users.values()).find(user => user.email === request.email!.toLowerCase().trim());
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(request.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(request.password);

    // Create user
    const user: InternalUser = {
      id: this.generateId(),
      name: request.name.trim(),
      email: request.email!.toLowerCase().trim(),
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(user.id, user);

    // Audit log
    this.auditLog.push({
      timestamp: new Date(),
      userId: user.id,
      email: user.email,
      action: 'USER_CREATED'
    });

    // Return user without password hash
    return this.toAuthenticatedUser(user);
  }

  /**
   * Authenticate user with email and password
   * @param request - Authentication request
   * @returns Promise<AuthenticationResult> - Authentication result
   */
  async authenticateUser(request: AuthenticateUserRequest): Promise<AuthenticationResult> {
    try {
      if (!request.email?.trim() || !request.password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Find user by email
      const user = Array.from(this.users.values()).find(u => u.email === request.email!.toLowerCase().trim());
      if (!user) {
        // Audit failed login
        this.auditLog.push({
          timestamp: new Date(),
          email: request.email,
          action: 'LOGIN_FAILED'
        });
        
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Verify password
      const isValidPassword = await this.passwordService.verifyPassword(request.password, user.passwordHash);
      if (!isValidPassword) {
        // Audit failed login
        this.auditLog.push({
          timestamp: new Date(),
          userId: user.id,
          email: user.email,
          action: 'LOGIN_FAILED'
        });

        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Audit successful login
      this.auditLog.push({
        timestamp: new Date(),
        userId: user.id,
        email: user.email,
        action: 'LOGIN_SUCCESS'
      });

      return {
        success: true,
        user: this.toAuthenticatedUser(user)
      };
    } catch (error) {
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Update user password
   * @param userId - User ID
   * @param request - Password update request
   * @returns Promise<PasswordUpdateResult> - Update result
   */
  async updatePassword(userId: string, request: UpdatePasswordRequest): Promise<PasswordUpdateResult> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await this.passwordService.verifyPassword(request.currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Validate new password strength
      const passwordValidation = this.passwordService.validatePasswordStrength(request.newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.errors.join(', ')}`
        };
      }

      // Hash new password
      const newPasswordHash = await this.passwordService.hashPassword(request.newPassword);

      // Update user
      const updatedUser: InternalUser = {
        ...user,
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      };

      this.users.set(userId, updatedUser);

      // Audit log
      this.auditLog.push({
        timestamp: new Date(),
        userId: user.id,
        email: user.email,
        action: 'PASSWORD_CHANGED'
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update password'
      };
    }
  }

  // Legacy methods maintained for backward compatibility
  async createUser(request: CreateUserRequest): Promise<User> {
    // For backward compatibility, generate a secure password
    const securePassword = this.passwordService.generateSecurePassword();
    
    const userWithPassword: CreateUserWithPasswordRequest = {
      ...request,
      password: securePassword
    };

    const authenticatedUser = await this.createUserWithPassword(userWithPassword);
    return this.toLegacyUser(authenticatedUser);
  }

  async getUserById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? this.toLegacyUser(this.toAuthenticatedUser(user)) : null;
  }

  async updateUser(id: string, request: UpdateUserRequest): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    // Validate email if provided
    if (request.email && !isValidEmail(request.email.trim())) {
      throw new Error('Invalid email format');
    }

    // Check email uniqueness if changing email
    if (request.email && request.email!.toLowerCase().trim() !== user.email) {
      const existingUser = Array.from(this.users.values()).find(u => u.email === request.email!.toLowerCase().trim());
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
    }

    const updatedUser: InternalUser = {
      ...user,
      name: request.name?.trim() ?? user.name,
      email: request.email?.toLowerCase().trim() ?? user.email,
      updatedAt: new Date()
    };

    this.users.set(id, updatedUser);
    return this.toLegacyUser(this.toAuthenticatedUser(updatedUser));
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).map(user => this.toLegacyUser(this.toAuthenticatedUser(user)));
  }

  /**
   * Get security audit log (admin function)
   * @returns SecurityAuditLog[] - Array of audit log entries
   */
  getSecurityAuditLog(): SecurityAuditLog[] {
    return [...this.auditLog];
  }

  /**
   * Convert internal User to public AuthenticatedUser (removes password hash)
   * @param user - Internal user object
   * @returns AuthenticatedUser - Public user object
   */
  private toAuthenticatedUser(user: InternalUser): AuthenticatedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Convert AuthenticatedUser to legacy User interface for backward compatibility
   * @param user - AuthenticatedUser object
   * @returns User - Legacy user interface
   */
  private toLegacyUser(user: AuthenticatedUser): User {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}