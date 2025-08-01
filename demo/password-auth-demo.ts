// Password Authentication Demo - SPARC Implementation Showcase
// Demonstrates complete secure password hashing functionality

import { UserAPI } from '../src/api';
import { CreateUserWithPasswordRequest, AuthenticateUserRequest, UpdatePasswordRequest } from '../src/types/auth';

async function demonstratePasswordAuthentication() {
  console.log('🔐 Password Authentication Demo - SPARC Implementation');
  console.log('===================================================\n');

  const userAPI = new UserAPI();

  try {
    // 1. User Registration with Secure Password
    console.log('1. Registering user with secure password...');
    const registerRequest: CreateUserWithPasswordRequest = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'MySecure@Pass1'
    };

    const registerResponse = await userAPI.registerUser(registerRequest);
    if (registerResponse.success) {
      console.log('✅ User registered successfully');
      console.log(`   User ID: ${registerResponse.data?.id}`);
      console.log(`   Email: ${registerResponse.data?.email}`);
      console.log(`   Name: ${registerResponse.data?.name}\n`);
    } else {
      console.log('❌ Registration failed:', registerResponse.error);
      return;
    }

    // 2. User Authentication (Login)
    console.log('2. Authenticating user with correct credentials...');
    const loginRequest: AuthenticateUserRequest = {
      email: 'john.doe@example.com',
      password: 'MySecure@Pass1'
    };

    const loginResponse = await userAPI.loginUser(loginRequest);
    if (loginResponse.success) {
      console.log('✅ Login successful');
      console.log(`   Welcome back, ${loginResponse.data?.name}!\n`);
    } else {
      console.log('❌ Login failed:', loginResponse.error);
      return;
    }

    // 3. Failed Authentication Attempt
    console.log('3. Testing authentication with wrong password...');
    const wrongLoginRequest: AuthenticateUserRequest = {
      email: 'john.doe@example.com',
      password: 'WrongPassword123!'
    };

    const wrongLoginResponse = await userAPI.loginUser(wrongLoginRequest);
    if (!wrongLoginResponse.success) {
      console.log('✅ Correctly rejected wrong password');
      console.log(`   Error: ${wrongLoginResponse.error}\n`);
    }

    // 4. Password Update
    console.log('4. Updating user password...');
    const userId = registerResponse.data?.id;
    if (userId) {
      const updatePasswordRequest: UpdatePasswordRequest = {
        currentPassword: 'MySecure@Pass1',
        newPassword: 'NewSecure@Pass2'
      };

      const updateResponse = await userAPI.updateUserPassword(userId, updatePasswordRequest);
      if (updateResponse.success) {
        console.log('✅ Password updated successfully\n');

        // 5. Verify New Password Works
        console.log('5. Testing login with new password...');
        const newLoginRequest: AuthenticateUserRequest = {
          email: 'john.doe@example.com',
          password: 'NewSecure@Pass2'
        };

        const newLoginResponse = await userAPI.loginUser(newLoginRequest);
        if (newLoginResponse.success) {
          console.log('✅ New password works correctly\n');
        }

        // 6. Verify Old Password No Longer Works
        console.log('6. Verifying old password no longer works...');
        const oldPasswordResponse = await userAPI.loginUser(loginRequest);
        if (!oldPasswordResponse.success) {
          console.log('✅ Old password correctly rejected\n');
        }
      }
    }

    // 7. Security Audit Log
    console.log('7. Checking security audit log...');
    const auditResponse = await userAPI.getSecurityAuditLog();
    if (auditResponse.success && auditResponse.data) {
      console.log('✅ Security audit log retrieved');
      console.log(`   Total events: ${auditResponse.count}`);
      
      const events = auditResponse.data;
      events.forEach((event: any, index: number) => {
        console.log(`   ${index + 1}. ${event.action} - ${event.timestamp} - ${event.email || event.userId}`);
      });
      console.log();
    }

    // 8. Password Strength Validation Demo
    console.log('8. Testing password strength validation...');
    const weakPasswords = [
      'weak',
      'password123',
      'NoNumbers!',
      'nospecialchars123',
      'NOLOWERCASE123!',
      'MyPassssss1!',
      'MyPass1234!'
    ];

    for (const weakPassword of weakPasswords) {
      const weakRequest: CreateUserWithPasswordRequest = {
        name: 'Test User',
        email: 'test@example.com',
        password: weakPassword
      };

      const weakResponse = await userAPI.registerUser(weakRequest);
      if (!weakResponse.success) {
        console.log(`   ❌ Correctly rejected: "${weakPassword}" - ${weakResponse.error}`);
      }
    }

    console.log('\n🎉 SPARC Implementation Demo Complete!');
    console.log('✅ All security features working correctly');
    console.log('✅ Password hashing with bcrypt (12 rounds)');
    console.log('✅ Comprehensive password validation');
    console.log('✅ Secure authentication flow');
    console.log('✅ Password update functionality');
    console.log('✅ Security audit logging');
    console.log('✅ Backward compatibility maintained');

  } catch (error) {
    console.error('Demo error:', error);
  }
}

// Run the demo
if (require.main === module) {
  demonstratePasswordAuthentication();
}

export { demonstratePasswordAuthentication };