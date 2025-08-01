// Email Validation Utility Demo
// Demonstrates RFC 5322 compliant email validation with security features

import { EmailValidator, EmailValidationOptions } from '../src/utils/email-validator';
import { validateEmailSecurely, createSecureEmail } from '../src/types/auth';

console.log('=== Email Validation Utility Demo ===\n');

// Create validator instance
const validator = new EmailValidator();

// Demo 1: Basic validation
console.log('1. Basic Email Validation:');
const basicEmails = [
  'user@example.com',
  'test.user@domain.co.uk', 
  'invalid-email',
  'user@domain.',
  'admin+tag@company.org'
];

basicEmails.forEach(email => {
  const result = validator.validate(email);
  console.log(`  ${email}: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
  if (!result.isValid) {
    console.log(`    Errors: ${result.errors.join(', ')}`);
  }
});

// Demo 2: Security validation
console.log('\n2. Security Threat Detection:');
const securityTests = [
  'user+<script>@domain.com',
  'user"@domain.com',
  'user@domain.com\n\r',
  'admin@admin.com'
];

securityTests.forEach(email => {
  const result = validateEmailSecurely(email);
  console.log(`  ${JSON.stringify(email)}: ${result.isValid ? '✅ Safe' : '⚠️  Threat Detected'}`);
  if (result.securityFlags.length > 0) {
    console.log(`    Security Flags: ${result.securityFlags.join(', ')}`);
  }
});

// Demo 3: Length validation
console.log('\n3. Length Validation:');
const longLocal = 'a'.repeat(65);
const longEmail = `${longLocal}@domain.com`;
const longResult = validator.validate(longEmail);
console.log(`  Long email (${longEmail.length} chars): ${longResult.isValid ? '✅ Valid' : '❌ Invalid'}`);
if (!longResult.isValid) {
  console.log(`    Errors: ${longResult.errors.join(', ')}`);
}

// Demo 4: Disposable email detection
console.log('\n4. Disposable Email Detection:');
const disposableEmails = [
  'user@gmail.com',
  'test@10minutemail.com',
  'fake@tempmail.org'
];

disposableEmails.forEach(email => {
  const result = validator.validate(email);
  const secureEmail = createSecureEmail(email);
  console.log(`  ${email}: ${result.isValid ? '✅ Valid' : '❌ Invalid'} | Secure: ${secureEmail ? '✅ Accepted' : '❌ Blocked'}`);
  if (result.securityFlags.includes('DISPOSABLE_EMAIL')) {
    console.log(`    ⚠️  Disposable email provider detected`);
  }
});

// Demo 5: Domain typo detection
console.log('\n5. Domain Typo Detection:');
const typoEmails = [
  'user@gmail.com',
  'user@gmai.com',
  'user@gmial.com'
];

typoEmails.forEach(email => {
  const result = validator.validate(email);
  console.log(`  ${email}: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
  if (result.warnings.length > 0) {
    console.log(`    💡 ${result.warnings.join(', ')}`);
  }
});

// Demo 6: International domain support
console.log('\n6. International Domain Support:');
const intlOptions: EmailValidationOptions = { allowInternational: true };
const intlEmails = [
  'user@example.com',
  'user@münchen.de',
  'test@日本.jp'
];

intlEmails.forEach(email => {
  const result = validator.validate(email, intlOptions);
  console.log(`  ${email}: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
  if (result.internationalDomain) {
    console.log(`    🌍 International domain detected`);
  }
});

// Demo 7: Configuration options
console.log('\n7. Configuration Options:');
const strictValidator = new EmailValidator({ strictMode: true });
const quotedEmail = '"user name"@domain.com';

console.log(`  Quoted strings in permissive mode:`);
const permissiveResult = validator.validate(quotedEmail);
console.log(`    ${quotedEmail}: ${permissiveResult.isValid ? '✅ Valid' : '❌ Invalid'}`);

console.log(`  Quoted strings in strict mode:`);
const strictResult = strictValidator.validate(quotedEmail);
console.log(`    ${quotedEmail}: ${strictResult.isValid ? '✅ Valid' : '❌ Invalid'}`);

// Demo 8: Performance test
console.log('\n8. Performance Test:');
const testEmails = Array.from({ length: 1000 }, (_, i) => `user${i}@domain${i % 10}.com`);
const startTime = Date.now();

testEmails.forEach(email => validator.validate(email));

const endTime = Date.now();
console.log(`  Validated 1000 emails in ${endTime - startTime}ms`);

console.log('\n=== Demo Complete ===');

// Export demo function for use in other modules
export function runEmailValidationDemo() {
  // Demo code already executed above
  console.log('Email validation demo completed successfully!');
}

export default { runEmailValidationDemo };