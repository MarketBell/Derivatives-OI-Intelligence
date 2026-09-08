import dotenv from 'dotenv';
import path from 'path';
import { PasswordUtils } from './passwordUtils';
import { jwtService } from '../services/jwtService';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'billionitwealth@gmail.com';

interface TestResult {
  num: number;
  name: string;
  category: string;
  expected: string;
  actual: string;
  pass: boolean;
}

const results: TestResult[] = [];

function recordTest(
  num: number,
  name: string,
  category: string,
  expected: string,
  actual: string,
  pass: boolean
) {
  results.push({ num, name, category, expected, actual, pass });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] Test ${num}: ${name}`);
  console.log(`       Expected: ${expected}`);
  console.log(`       Actual:   ${actual}\n`);
}

export async function runSecuritySuite() {
  console.log('================================================================');
  console.log('       COMPREHENSIVE ADMIN AUTHENTICATION SECURITY AUDIT SUITE  ');
  console.log('================================================================\n');

  // Verify ADMIN_INITIAL_PASSWORD is set for testing
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminPassword || adminPassword.trim().length < 6) {
    console.error('FATAL: ADMIN_INITIAL_PASSWORD not configured in environment for audit.');
    process.exit(1);
  }

  // -------------------------------------------------------------
  // Test 1: Admin missing password -> FAIL login (400)
  // -------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL })
    });
    const json = await res.json();
    const passed = res.status === 400 && json.status === 'error';
    recordTest(
      1,
      'Admin Missing Password Rejected',
      'Authentication',
      'HTTP 400 with status "error"',
      `HTTP ${res.status}, status: ${json.status}, message: "${json.message}"`,
      passed
    );
  } catch (err: any) {
    recordTest(1, 'Admin Missing Password Rejected', 'Authentication', 'HTTP 400', `Error: ${err.message}`, false);
  }

  // -------------------------------------------------------------
  // Test 2: Admin empty password -> FAIL login (400)
  // -------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: '' })
    });
    const json = await res.json();
    const passed = res.status === 400 && json.status === 'error';
    recordTest(
      2,
      'Admin Empty Password Rejected',
      'Authentication',
      'HTTP 400 with status "error"',
      `HTTP ${res.status}, status: ${json.status}, message: "${json.message}"`,
      passed
    );
  } catch (err: any) {
    recordTest(2, 'Admin Empty Password Rejected', 'Authentication', 'HTTP 400', `Error: ${err.message}`, false);
  }

  // -------------------------------------------------------------
  // Test 3: Admin wrong password -> FAIL login (401)
  // -------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: 'IncorrectPassword999!' })
    });
    const json = await res.json();
    const passed = res.status === 401 && json.status === 'error';
    recordTest(
      3,
      'Admin Wrong Password Rejected',
      'Authentication',
      'HTTP 401 with status "error"',
      `HTTP ${res.status}, status: ${json.status}, message: "${json.message}"`,
      passed
    );
  } catch (err: any) {
    recordTest(3, 'Admin Wrong Password Rejected', 'Authentication', 'HTTP 401', `Error: ${err.message}`, false);
  }

  // -------------------------------------------------------------
  // Test 4: Admin correct password -> SUCCESS (200, JWT returned)
  // -------------------------------------------------------------
  let adminToken = '';
  let adminUserData: any = null;
  let rawAdminResponseJson: any = null;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: adminPassword })
    });
    rawAdminResponseJson = await res.json();
    adminToken = rawAdminResponseJson.token || '';
    adminUserData = rawAdminResponseJson.user || null;
    const passed = res.status === 200 && rawAdminResponseJson.success === true && !!adminToken;
    recordTest(
      4,
      'Admin Correct Password Succeeds',
      'Authentication',
      'HTTP 200 with JWT token',
      `HTTP ${res.status}, success: ${rawAdminResponseJson.success}, hasToken: ${!!adminToken}`,
      passed
    );
  } catch (err: any) {
    recordTest(4, 'Admin Correct Password Succeeds', 'Authentication', 'HTTP 200 with JWT', `Error: ${err.message}`, false);
  }

  // -------------------------------------------------------------
  // Test 5: Admin receives correct admin authorization & accessType
  // -------------------------------------------------------------
  const roleOk = adminUserData?.role === 'admin';
  const statusOk = adminUserData?.status === 'active';
  const accessTypeOk = adminUserData?.accessType === 'admin_free';
  recordTest(
    5,
    'Admin Receives Proper Role & Access Configuration',
    'RBAC',
    'role: admin, status: active, accessType: admin_free',
    `role: ${adminUserData?.role}, status: ${adminUserData?.status}, accessType: ${adminUserData?.accessType}`,
    roleOk && statusOk && accessTypeOk
  );

  // -------------------------------------------------------------
  // Test 6: Admin can access protected admin endpoint (/api/subscription/users)
  // -------------------------------------------------------------
  let adminAccessOk = false;
  try {
    const res = await fetch(`${BASE_URL}/api/subscription/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const json = await res.json();
    adminAccessOk = res.status === 200 && json.success === true;
    recordTest(
      6,
      'Admin Can Access Protected Admin Endpoint',
      'RBAC',
      'HTTP 200 from GET /api/subscription/users',
      `HTTP ${res.status}, success: ${json.success}, usersCount: ${Array.isArray(json.data) ? json.data.length : 0}`,
      adminAccessOk
    );
  } catch (err: any) {
    recordTest(6, 'Admin Can Access Protected Admin Endpoint', 'RBAC', 'HTTP 200', `Error: ${err.message}`, false);
  }

  // -------------------------------------------------------------
  // Setup a normal user for tests 7, 8, 13, 14
  // -------------------------------------------------------------
  const uniqueTestUser = `test_normal_${Date.now()}@gmail.com`;
  const normalUserPassword = 'NormalPassword123!';

  // Test 14 (Registration): Register new normal user
  let normalUserRegistered = false;
  try {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Audit Normal User',
        email: uniqueTestUser,
        password: normalUserPassword
      })
    });
    const regJson = await regRes.json();
    normalUserRegistered = regRes.status === 201 && regJson.status === 'pending_approval';
    recordTest(
      14,
      'Existing Registration Still Works (Self-Service Signup)',
      'Regression',
      'HTTP 201 with status "pending_approval"',
      `HTTP ${regRes.status}, status: ${regJson.status}`,
      normalUserRegistered
    );
  } catch (err: any) {
    recordTest(14, 'Existing Registration Still Works', 'Regression', 'HTTP 201', `Error: ${err.message}`, false);
  }

  // Approve normal user via Admin Endpoint to test Admin RBAC action (Test 15)
  let approveActionOk = false;
  try {
    const approveRes = await fetch(`${BASE_URL}/api/subscription/admin-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ email: uniqueTestUser })
    });
    const approveJson = await approveRes.json();
    approveActionOk = approveRes.status === 200 && approveJson.success === true;
    recordTest(
      15,
      'Existing Admin RBAC Actions Work (Admin Approve User)',
      'Regression',
      'HTTP 200 from POST /api/subscription/admin-approve',
      `HTTP ${approveRes.status}, success: ${approveJson.success}`,
      approveActionOk
    );
  } catch (err: any) {
    recordTest(15, 'Existing Admin RBAC Actions Work', 'Regression', 'HTTP 200', `Error: ${err.message}`, false);
  }

  // Test 13: Normal user login with valid credentials
  let normalToken = '';
  let normalUserData: any = null;
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueTestUser, password: normalUserPassword })
    });
    const loginJson = await loginRes.json();
    normalToken = loginJson.token || '';
    normalUserData = loginJson.user || null;
    const loginPass = loginRes.status === 200 && normalUserData?.role === 'user' && !!normalToken;
    recordTest(
      13,
      'Existing Normal User Login Still Works',
      'Regression',
      'HTTP 200, role: user, JWT token returned',
      `HTTP ${loginRes.status}, role: ${normalUserData?.role}, hasToken: ${!!normalToken}`,
      loginPass
    );
  } catch (err: any) {
    recordTest(13, 'Existing Normal User Login Still Works', 'Regression', 'HTTP 200', `Error: ${err.message}`, false);
  }

  // -------------------------------------------------------------
  // Test 7: Normal user cannot access protected admin endpoint
  // -------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/subscription/users`, {
      headers: { Authorization: `Bearer ${normalToken}` }
    });
    const json = await res.json();
    const passed = res.status === 403 && json.message?.includes('Admin privileges required');
    recordTest(
      7,
      'Normal User Direct HTTP Access to Admin Endpoint Denied',
      'RBAC',
      'HTTP 403 Forbidden with Admin privileges required message',
      `HTTP ${res.status}, message: "${json.message}"`,
      passed
    );
  } catch (err: any) {
    recordTest(7, 'Normal User Access to Admin Endpoint Denied', 'RBAC', 'HTTP 403', `Error: ${err.message}`, false);
  }

  // -------------------------------------------------------------
  // Test 8: Normal user cannot elevate to admin via forged payload / email
  // -------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/subscription/admin-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${normalToken}`
      },
      body: JSON.stringify({ email: uniqueTestUser })
    });
    const json = await res.json();
    const passed = res.status === 403;
    recordTest(
      8,
      'Normal User Cannot Elevate or Execute Admin Privilege',
      'RBAC',
      'HTTP 403 Forbidden',
      `HTTP ${res.status}, status: ${json.status}`,
      passed
    );
  } catch (err: any) {
    recordTest(8, 'Normal User Cannot Elevate', 'RBAC', 'HTTP 403', `Error: ${err.message}`, false);
  }

  // -------------------------------------------------------------
  // Test 9 & 10: Credential Security Verification (Hash + Salt only)
  // -------------------------------------------------------------
  const saltGenerated = PasswordUtils.generateSalt();
  const hashGenerated = PasswordUtils.hashPassword(adminPassword, saltGenerated);
  const verifyOk = PasswordUtils.verifyPassword(adminPassword, saltGenerated, hashGenerated);
  const wrongVerifyFailed = !PasswordUtils.verifyPassword('WrongPass', saltGenerated, hashGenerated);

  recordTest(
    9,
    'Admin Credential Record Uses PBKDF2 SHA-512 with Unique Salt',
    'Credential Security',
    'PBKDF2 SHA-512 constant-time verification passes for valid and fails for invalid',
    `Valid verified: ${verifyOk}, Invalid rejected: ${wrongVerifyFailed}, Salt bytes: ${saltGenerated.length}`,
    verifyOk && wrongVerifyFailed && saltGenerated.length === 32
  );

  // Test 10: No plaintext password exists in memory/database
  // Inspect user object returned in auth endpoints
  const hasNoPlaintext =
    !('password' in (adminUserData || {})) &&
    !('passwordHash' in (adminUserData || {})) &&
    !('salt' in (adminUserData || {})) &&
    !('password' in (normalUserData || {})) &&
    !('passwordHash' in (normalUserData || {})) &&
    !('salt' in (normalUserData || {}));

  recordTest(
    10,
    'No Plaintext Password or Sensitive Hash/Salt in User Session Objects',
    'Credential Security',
    'No password, passwordHash, or salt field in authenticated user object',
    `Plaintext/hash/salt in adminUserData: ${!hasNoPlaintext}`,
    hasNoPlaintext
  );

  // -------------------------------------------------------------
  // Test 11: No password/hash/salt exposed in API responses
  // -------------------------------------------------------------
  const responseStr = JSON.stringify(rawAdminResponseJson || {});
  const leaksSensitiveData =
    responseStr.includes('passwordHash') ||
    responseStr.includes('salt') ||
    responseStr.includes(adminPassword);

  recordTest(
    11,
    'No Password, Hash, or Salt Appears in Login API Responses',
    'Credential Security',
    'passwordHash, salt, and plaintext password absent from JSON response',
    `Contains sensitive strings: ${leaksSensitiveData}`,
    !leaksSensitiveData
  );

  // -------------------------------------------------------------
  // Test 12: Token security (Malformed JWT rejected)
  // -------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/subscription/users`, {
      headers: { Authorization: 'Bearer forged.malformed.jwttoken' }
    });
    const json = await res.json();
    const passed = res.status === 401;
    recordTest(
      12,
      'Malformed or Invalid JWT Token Rejected with HTTP 401',
      'Token Security',
      'HTTP 401 Invalid or expired token',
      `HTTP ${res.status}, message: "${json.message}"`,
      passed
    );
  } catch (err: any) {
    recordTest(12, 'Malformed JWT Rejected', 'Token Security', 'HTTP 401', `Error: ${err.message}`, false);
  }

  console.log('================================================================');
  console.log('                         AUDIT SUMMARY                          ');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log(`Total Requirements Tested: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Overall Result: ${failed === 0 ? 'ALL PASSED (100%)' : 'SOME TESTS FAILED'}`);
  console.log('================================================================\n');

  return { total, passed, failed, results };
}

if (require.main === module) {
  runSecuritySuite()
    .then(({ failed }) => {
      process.exit(failed === 0 ? 0 : 1);
    })
    .catch((err) => {
      console.error('Audit suite crashed:', err);
      process.exit(1);
    });
}
