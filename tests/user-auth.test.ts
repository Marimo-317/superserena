// User Authentication Tests - SPARC Implementation
// Integration tests for user authentication functionality

import { UserService } from '../src/user';
import { CreateUserWithPasswordRequest, AuthenticateUserRequest, UpdatePasswordRequest } from '../src/types/auth';

describe('UserService Authentication', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('createUserWithPassword', () => {
    it('should create user with valid password', async () => {
      const request: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };

      const user = await userService.createUserWithPassword(request);

      expect(user.id).toBeTruthy();
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      // Password hash should not be exposed
      expect('passwordHash' in user).toBe(false);
    });

    it('should normalize email to lowercase', async () => {
      const request: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'JOHN@EXAMPLE.COM',
        password: 'MySecure@Pass1'
      };

      const user = await userService.createUserWithPassword(request);
      expect(user.email).toBe('john@example.com');
    });

    it('should trim whitespace from name and email', async () => {
      const request: CreateUserWithPasswordRequest = {
        name: '  John Doe  ',
        email: '  john@example.com  ',
        password: 'MySecure@Pass1'
      };

      const user = await userService.createUserWithPassword(request);
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
    });

    it('should reject duplicate email', async () => {
      const request1: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };

      const request2: CreateUserWithPasswordRequest = {
        name: 'Jane Doe',
        email: 'john@example.com',
        password: 'MySecure@Pass2'
      };

      await userService.createUserWithPassword(request1);
      
      await expect(userService.createUserWithPassword(request2))
        .rejects.toThrow('User with this email already exists');
    });

    it('should reject weak password', async () => {
      const request: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak'
      };

      await expect(userService.createUserWithPassword(request))
        .rejects.toThrow('Password validation failed');
    });

    it('should reject invalid email format', async () => {
      const request: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'MySecure@Pass1'
      };

      await expect(userService.createUserWithPassword(request))
        .rejects.toThrow('Invalid email format');
    });

    it('should reject empty name', async () => {
      const request: CreateUserWithPasswordRequest = {
        name: '',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };

      await expect(userService.createUserWithPassword(request))
        .rejects.toThrow('Name is required');
    });

    it('should log user creation in audit log', async () => {
      const request: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };

      const user = await userService.createUserWithPassword(request);
      const auditLog = userService.getSecurityAuditLog();

      const creationLog = auditLog.find(log => log.action === 'USER_CREATED' && log.userId === user.id);
      expect(creationLog).toBeTruthy();
      expect(creationLog?.email).toBe('john@example.com');
    });
  });

  describe('authenticateUser', () => {
    let testUser: any;

    beforeEach(async () => {
      const request: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };
      testUser = await userService.createUserWithPassword(request);
    });

    it('should authenticate with correct credentials', async () => {
      const authRequest: AuthenticateUserRequest = {
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };

      const result = await userService.authenticateUser(authRequest);

      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.user?.id).toBe(testUser.id);
      expect(result.user?.email).toBe('john@example.com');
      expect(result.error).toBeUndefined();
    });

    it('should reject incorrect password', async () => {
      const authRequest: AuthenticateUserRequest = {
        email: 'john@example.com',
        password: 'WrongPass123!'
      };

      const result = await userService.authenticateUser(authRequest);

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Invalid email or password');
    });

    it('should reject non-existent email', async () => {
      const authRequest: AuthenticateUserRequest = {
        email: 'nonexistent@example.com',
        password: 'MySecure@Pass1'
      };

      const result = await userService.authenticateUser(authRequest);

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Invalid email or password');
    });

    it('should handle case-insensitive email login', async () => {
      const authRequest: AuthenticateUserRequest = {
        email: 'JOHN@EXAMPLE.COM',
        password: 'MySecure@Pass1'
      };

      const result = await userService.authenticateUser(authRequest);

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('john@example.com');
    });

    it('should reject empty email', async () => {
      const authRequest: AuthenticateUserRequest = {
        email: '',
        password: 'MySecure@Pass1'
      };

      const result = await userService.authenticateUser(authRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('should reject empty password', async () => {
      const authRequest: AuthenticateUserRequest = {
        email: 'john@example.com',
        password: ''
      };

      const result = await userService.authenticateUser(authRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('should log successful authentication', async () => {
      const authRequest: AuthenticateUserRequest = {
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };

      await userService.authenticateUser(authRequest);
      const auditLog = userService.getSecurityAuditLog();

      const loginLog = auditLog.find(log => 
        log.action === 'LOGIN_SUCCESS' && 
        log.userId === testUser.id
      );
      expect(loginLog).toBeTruthy();
    });

    it('should log failed authentication attempts', async () => {
      const authRequest: AuthenticateUserRequest = {
        email: 'john@example.com',
        password: 'WrongPass123!'
      };

      await userService.authenticateUser(authRequest);
      const auditLog = userService.getSecurityAuditLog();

      const failedLog = auditLog.find(log => 
        log.action === 'LOGIN_FAILED' && 
        log.userId === testUser.id
      );
      expect(failedLog).toBeTruthy();
    });
  });

  describe('updatePassword', () => {
    let testUser: any;

    beforeEach(async () => {
      const request: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };
      testUser = await userService.createUserWithPassword(request);
    });

    it('should update password with valid credentials', async () => {
      const updateRequest: UpdatePasswordRequest = {
        currentPassword: 'MySecure@Pass1',
        newPassword: 'NewMySecure@Pass2'
      };

      const result = await userService.updatePassword(testUser.id, updateRequest);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify old password no longer works
      const oldAuthResult = await userService.authenticateUser({
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      });
      expect(oldAuthResult.success).toBe(false);

      // Verify new password works
      const newAuthResult = await userService.authenticateUser({
        email: 'john@example.com',
        password: 'NewMySecure@Pass2'
      });
      expect(newAuthResult.success).toBe(true);
    });

    it('should reject incorrect current password', async () => {
      const updateRequest: UpdatePasswordRequest = {
        currentPassword: 'WrongPass123!',
        newPassword: 'NewMySecure@Pass2'
      };

      const result = await userService.updatePassword(testUser.id, updateRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
    });

    it('should reject weak new password', async () => {
      const updateRequest: UpdatePasswordRequest = {
        currentPassword: 'MySecure@Pass1',
        newPassword: 'weak'
      };

      const result = await userService.updatePassword(testUser.id, updateRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password validation failed');
    });

    it('should reject non-existent user', async () => {
      const updateRequest: UpdatePasswordRequest = {
        currentPassword: 'MySecure@Pass1',
        newPassword: 'NewMySecure@Pass2'
      };

      const result = await userService.updatePassword('nonexistent-id', updateRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should log password change', async () => {
      const updateRequest: UpdatePasswordRequest = {
        currentPassword: 'MySecure@Pass1',
        newPassword: 'NewMySecure@Pass2'
      };

      await userService.updatePassword(testUser.id, updateRequest);
      const auditLog = userService.getSecurityAuditLog();

      const changeLog = auditLog.find(log => 
        log.action === 'PASSWORD_CHANGED' && 
        log.userId === testUser.id
      );
      expect(changeLog).toBeTruthy();
    });

    it('should update user updatedAt timestamp', async () => {
      const originalUpdatedAt = testUser.updatedAt;
      
      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updateRequest: UpdatePasswordRequest = {
        currentPassword: 'MySecure@Pass1',
        newPassword: 'NewMySecure@Pass2'
      };

      await userService.updatePassword(testUser.id, updateRequest);
      
      const updatedUser = await userService.getUserById(testUser.id);
      expect(updatedUser?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Security Audit Log', () => {
    it('should track all security events', async () => {
      // Create user
      const createRequest: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };
      const user = await userService.createUserWithPassword(createRequest);

      // Successful login
      await userService.authenticateUser({
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      });

      // Failed login
      await userService.authenticateUser({
        email: 'john@example.com',
        password: 'WrongPass!'
      });

      // Password change
      await userService.updatePassword(user.id, {
        currentPassword: 'MySecure@Pass1',
        newPassword: 'NewMySecure@Pass2'
      });

      const auditLog = userService.getSecurityAuditLog();

      expect(auditLog).toHaveLength(4);
      expect(auditLog.some(log => log.action === 'USER_CREATED')).toBe(true);
      expect(auditLog.some(log => log.action === 'LOGIN_SUCCESS')).toBe(true);
      expect(auditLog.some(log => log.action === 'LOGIN_FAILED')).toBe(true);
      expect(auditLog.some(log => log.action === 'PASSWORD_CHANGED')).toBe(true);
    });

    it('should include timestamps in audit log', async () => {
      const createRequest: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };
      await userService.createUserWithPassword(createRequest);

      const auditLog = userService.getSecurityAuditLog();
      const logEntry = auditLog[0];

      expect(logEntry.timestamp).toBeInstanceOf(Date);
      expect(logEntry.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Legacy Compatibility', () => {
    it('should maintain backward compatibility for createUser', async () => {
      const legacyRequest = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const user = await userService.createUser(legacyRequest);

      expect(user.id).toBeTruthy();
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.createdAt).toBeInstanceOf(Date);

      // Should be able to authenticate with auto-generated password
      const auditLog = userService.getSecurityAuditLog();
      expect(auditLog.some(log => log.action === 'USER_CREATED')).toBe(true);
    });

    it('should maintain backward compatibility for other user operations', async () => {
      const legacyRequest = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const user = await userService.createUser(legacyRequest);

      // Test getUserById
      const retrievedUser = await userService.getUserById(user.id);
      expect(retrievedUser).toEqual(user);

      // Test updateUser
      const updatedUser = await userService.updateUser(user.id, {
        name: 'John Updated'
      });
      expect(updatedUser?.name).toBe('John Updated');

      // Test getAllUsers
      const allUsers = await userService.getAllUsers();
      expect(allUsers).toHaveLength(1);
      expect(allUsers[0].id).toBe(user.id);

      // Test deleteUser
      const deleted = await userService.deleteUser(user.id);
      expect(deleted).toBe(true);

      const deletedUser = await userService.getUserById(user.id);
      expect(deletedUser).toBeNull();
    });
  });
});