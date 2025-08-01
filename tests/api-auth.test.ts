// API Authentication Tests - SPARC Implementation
// End-to-end API tests for authentication functionality

import { UserAPI } from '../src/api';
import { CreateUserWithPasswordRequest, AuthenticateUserRequest, UpdatePasswordRequest } from '../src/types/auth';

describe('UserAPI Authentication', () => {
  let userAPI: UserAPI;

  beforeEach(() => {
    userAPI = new UserAPI();
  });

  describe('registerUser', () => {
    it('should register user with valid data', async () => {
      const request: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };

      const response = await userAPI.registerUser(request);

      expect(response.success).toBe(true);
      expect(response.data).toBeTruthy();
      expect(response.data?.name).toBe('John Doe');
      expect(response.data?.email).toBe('john@example.com');
      expect(response.message).toBe('User registered successfully');
      expect(response.error).toBeUndefined();
    });

    it('should reject registration with missing name', async () => {
      const request = {
        name: '',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      } as CreateUserWithPasswordRequest;

      const response = await userAPI.registerUser(request);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Name, email, and password are required');
      expect(response.data).toBeNull();
    });

    it('should reject registration with missing email', async () => {
      const request = {
        name: 'John Doe',
        email: '',
        password: 'MySecure@Pass1'
      } as CreateUserWithPasswordRequest;

      const response = await userAPI.registerUser(request);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Name, email, and password are required');
      expect(response.data).toBeNull();
    });

    it('should reject registration with missing password', async () => {
      const request = {
        name: 'John Doe',
        email: 'john@example.com',
        password: ''
      } as CreateUserWithPasswordRequest;

      const response = await userAPI.registerUser(request);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Name, email, and password are required');
      expect(response.data).toBeNull();
    });

    it('should reject registration with weak password', async () => {
      const request: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak'
      };

      const response = await userAPI.registerUser(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Password validation failed');
      expect(response.data).toBeNull();
    });

    it('should reject duplicate email registration', async () => {
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

      await userAPI.registerUser(request1);
      const response = await userAPI.registerUser(request2);

      expect(response.success).toBe(false);
      expect(response.error).toBe('User with this email already exists');
      expect(response.data).toBeNull();
    });
  });

  describe('loginUser', () => {
    let testUser: any;

    beforeEach(async () => {
      const request: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };
      const response = await userAPI.registerUser(request);
      testUser = response.data;
    });

    it('should login with correct credentials', async () => {
      const loginRequest: AuthenticateUserRequest = {
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };

      const response = await userAPI.loginUser(loginRequest);

      expect(response.success).toBe(true);
      expect(response.data).toBeTruthy();
      expect(response.data?.id).toBe(testUser.id);
      expect(response.data?.email).toBe('john@example.com');
      expect(response.message).toBe('Login successful');
      expect(response.error).toBeUndefined();
    });

    it('should reject login with incorrect password', async () => {
      const loginRequest: AuthenticateUserRequest = {
        email: 'john@example.com',
        password: 'WrongPass123!'
      };

      const response = await userAPI.loginUser(loginRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid email or password');
      expect(response.data).toBeNull();
    });

    it('should reject login with non-existent email', async () => {
      const loginRequest: AuthenticateUserRequest = {
        email: 'nonexistent@example.com',
        password: 'MySecure@Pass1'
      };

      const response = await userAPI.loginUser(loginRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid email or password');
      expect(response.data).toBeNull();
    });

    it('should reject login with missing email', async () => {
      const loginRequest = {
        email: '',
        password: 'MySecure@Pass1'
      } as AuthenticateUserRequest;

      const response = await userAPI.loginUser(loginRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Email and password are required');
      expect(response.data).toBeNull();
    });

    it('should reject login with missing password', async () => {
      const loginRequest = {
        email: 'john@example.com',
        password: ''
      } as AuthenticateUserRequest;

      const response = await userAPI.loginUser(loginRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Email and password are required');
      expect(response.data).toBeNull();
    });
  });

  describe('updateUserPassword', () => {
    let testUser: any;

    beforeEach(async () => {
      const request: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };
      const response = await userAPI.registerUser(request);
      testUser = response.data;
    });

    it('should update password with valid credentials', async () => {
      const updateRequest: UpdatePasswordRequest = {
        currentPassword: 'MySecure@Pass1',
        newPassword: 'NewMySecure@Pass2'
      };

      const response = await userAPI.updateUserPassword(testUser.id, updateRequest);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Password updated successfully');
      expect(response.data).toBeNull();
      expect(response.error).toBeUndefined();

      // Verify new password works
      const loginResponse = await userAPI.loginUser({
        email: 'john@example.com',
        password: 'NewMySecure@Pass2'
      });
      expect(loginResponse.success).toBe(true);
    });

    it('should reject password update with incorrect current password', async () => {
      const updateRequest: UpdatePasswordRequest = {
        currentPassword: 'WrongPass123!',
        newPassword: 'NewMySecure@Pass2'
      };

      const response = await userAPI.updateUserPassword(testUser.id, updateRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Current password is incorrect');
      expect(response.data).toBeNull();
    });

    it('should reject password update with weak new password', async () => {
      const updateRequest: UpdatePasswordRequest = {
        currentPassword: 'MySecure@Pass1',
        newPassword: 'weak'
      };

      const response = await userAPI.updateUserPassword(testUser.id, updateRequest);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Password validation failed');
      expect(response.data).toBeNull();
    });

    it('should reject password update for non-existent user', async () => {
      const updateRequest: UpdatePasswordRequest = {
        currentPassword: 'MySecure@Pass1',
        newPassword: 'NewMySecure@Pass2'
      };

      const response = await userAPI.updateUserPassword('nonexistent-id', updateRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('User not found');
      expect(response.data).toBeNull();
    });

    it('should reject password update with missing current password', async () => {
      const updateRequest = {
        currentPassword: '',
        newPassword: 'NewMySecure@Pass2'
      } as UpdatePasswordRequest;

      const response = await userAPI.updateUserPassword(testUser.id, updateRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Current password and new password are required');
      expect(response.data).toBeNull();
    });

    it('should reject password update with missing new password', async () => {
      const updateRequest = {
        currentPassword: 'MySecure@Pass1',
        newPassword: ''
      } as UpdatePasswordRequest;

      const response = await userAPI.updateUserPassword(testUser.id, updateRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Current password and new password are required');
      expect(response.data).toBeNull();
    });
  });

  describe('getSecurityAuditLog', () => {
    beforeEach(async () => {
      // Create some test activity
      const request: CreateUserWithPasswordRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      };
      await userAPI.registerUser(request);

      await userAPI.loginUser({
        email: 'john@example.com',
        password: 'MySecure@Pass1'
      });

      await userAPI.loginUser({
        email: 'john@example.com',
        password: 'WrongPass!'
      });
    });

    it('should return security audit log', async () => {
      const response = await userAPI.getSecurityAuditLog();

      expect(response.success).toBe(true);
      expect(response.data).toBeTruthy();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.count).toBeGreaterThan(0);

      const auditLog = response.data;
      expect(auditLog?.some((log: any) => log.action === 'USER_CREATED')).toBe(true);
      expect(auditLog?.some((log: any) => log.action === 'LOGIN_SUCCESS')).toBe(true);
      expect(auditLog?.some((log: any) => log.action === 'LOGIN_FAILED')).toBe(true);
    });

    it('should include required fields in audit log entries', async () => {
      const response = await userAPI.getSecurityAuditLog();
      const auditLog = response.data;

      expect(auditLog?.length).toBeGreaterThan(0);
      
      const logEntry = auditLog?.[0];
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('action');
      expect(logEntry?.timestamp).toBeInstanceOf(Date);
      expect(typeof logEntry?.action).toBe('string');
    });
  });

  describe('Legacy API Compatibility', () => {
    it('should maintain backward compatibility for user management', async () => {
      // Test legacy createUser endpoint
      const legacyCreateResponse = await userAPI.createUser({
        name: 'Jane Doe',
        email: 'jane@example.com'
      });

      expect(legacyCreateResponse.success).toBe(true);
      expect(legacyCreateResponse.data).toBeTruthy();
      expect(legacyCreateResponse.message).toContain('password auto-generated');

      const userId = legacyCreateResponse.data?.id;

      // Test getUserById
      const getUserResponse = await userAPI.getUserById(userId!);
      expect(getUserResponse.success).toBe(true);
      expect(getUserResponse.data?.name).toBe('Jane Doe');

      // Test updateUser
      const updateResponse = await userAPI.updateUser(userId!, {
        name: 'Jane Updated'
      });
      expect(updateResponse.success).toBe(true);
      expect(updateResponse.data?.name).toBe('Jane Updated');

      // Test getAllUsers  
      const getAllResponse = await userAPI.getAllUsers();
      expect(getAllResponse.success).toBe(true);
      expect(getAllResponse.data?.length).toBeGreaterThan(0);

      // Test deleteUser
      const deleteResponse = await userAPI.deleteUser(userId!);
      expect(deleteResponse.success).toBe(true);
      expect(deleteResponse.message).toBe('User deleted successfully');
    });

    it('should handle errors gracefully in legacy endpoints', async () => {
      // Test getUserById with non-existent ID
      const getUserResponse = await userAPI.getUserById('nonexistent-id');
      expect(getUserResponse.success).toBe(false);
      expect(getUserResponse.error).toBe('User not found');

      // Test updateUser with non-existent ID
      const updateResponse = await userAPI.updateUser('nonexistent-id', {
        name: 'Test'
      });
      expect(updateResponse.success).toBe(false);
      expect(updateResponse.error).toBe('User not found');

      // Test deleteUser with non-existent ID
      const deleteResponse = await userAPI.deleteUser('nonexistent-id');
      expect(deleteResponse.success).toBe(false);
      expect(deleteResponse.error).toBe('User not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Test with invalid data that might cause service errors
      const invalidRequest = {
        name: null,
        email: 'invalid',
        password: 'MySecure@Pass1'
      } as any;

      const response = await userAPI.registerUser(invalidRequest);

      expect(response.success).toBe(false);
      expect(typeof response.error).toBe('string');
      expect(response.data).toBeNull();
    });

    it('should provide consistent error response format', async () => {
      const response = await userAPI.loginUser({
        email: 'nonexistent@example.com',
        password: 'MySecure@Pass1'
      });

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('data');
      expect(response.success).toBe(false);
      expect(typeof response.error).toBe('string');
      expect(response.data).toBeNull();
    });
  });
});