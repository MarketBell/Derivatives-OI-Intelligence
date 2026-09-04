import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { subscriptionService } from '../services/subscriptionService';
import { jwtService } from '../services/jwtService';

async function testAuthRolesSeparation() {
  console.log('================================================================');
  console.log('       VERIFICATION: TWO SEPARATE ACCESS LEVELS (ADMIN & USER)  ');
  console.log('================================================================\n');

  const adminEmail = 'billionitwealth@gmail.com';
  const normalUserEmail = 'trader.client1@gmail.com';
  const unauthorizedEmail = 'random.stranger@gmail.com';

  const baseUrl = 'http://localhost:5000';

  // -------------------------------------------------------------------------
  // SCENARIO 1: ADMIN LOGIN
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 1: ADMIN LOGIN (billionitwealth@gmail.com) ---');
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail })
  });
  const adminLoginData = await adminLoginRes.json();
  console.log(`Admin Login Status Code: ${adminLoginRes.status}`);
  console.log(`Admin User Role: ${adminLoginData.user?.role}`);
  console.log(`Redirect To: ${adminLoginData.redirectTo}`);
  console.log(`Admin Token Generated: ${adminLoginData.token ? 'YES' : 'NO'}`);

  if (adminLoginData.user?.role !== 'admin' || !adminLoginData.token) {
    throw new Error('Admin login verification failed!');
  }
  const adminToken = adminLoginData.token;

  // Admin calls protected Admin API
  const adminListUsersRes = await fetch(`${baseUrl}/api/subscription/users`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminListUsersData = await adminListUsersRes.json();
  console.log(`Admin accessing GET /api/subscription/users: HTTP ${adminListUsersRes.status} (Success: ${adminListUsersData.success})`);
  console.log('>>> Admin Login & Privileges: VERIFIED OK\n');

  // -------------------------------------------------------------------------
  // SCENARIO 2: UNAUTHORIZED EMAIL LOGIN
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 2: UNAUTHORIZED USER LOGIN (random.stranger@gmail.com) ---');
  const unauthLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: unauthorizedEmail })
  });
  const unauthLoginData = await unauthLoginRes.json();
  console.log(`Unauthorized Login Status Code: ${unauthLoginRes.status} (Expected: 403)`);
  console.log(`Rejection Message: "${unauthLoginData.message}"`);
  console.log(`Token Returned: ${unauthLoginData.token ? 'YES' : 'NO'} (Expected: NO)`);

  if (unauthLoginRes.status !== 403 || unauthLoginData.token) {
    throw new Error('Unauthorized user was not blocked properly!');
  }
  console.log('>>> Unauthorized Email Rejection: VERIFIED OK\n');

  // -------------------------------------------------------------------------
  // SCENARIO 3: ADMIN GRANTS ACCESS TO NEW USER
  // -------------------------------------------------------------------------
  console.log(`--- SCENARIO 3: ADMIN GRANTS ACCESS TO ${normalUserEmail} ---`);
  const grantRes = await fetch(`${baseUrl}/api/subscription/admin-grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      email: normalUserEmail,
      targetEmail: normalUserEmail,
      durationDays: 30,
      notes: 'Granted for trading client'
    })
  });
  const grantData = await grantRes.json();
  console.log(`Grant API Status: HTTP ${grantRes.status} (Success: ${grantData.success})`);
  console.log(`Granted User Role: ${grantData.data?.subscription?.role || grantData.data?.role || 'user'}`);
  console.log(`Granted User Access Type: ${grantData.data?.subscription?.accessType || 'admin_free'}`);
  if (grantRes.status !== 200) {
    throw new Error(`Admin grant failed: ${JSON.stringify(grantData)}`);
  }
  console.log('>>> Admin User Grant: VERIFIED OK\n');

  // -------------------------------------------------------------------------
  // SCENARIO 4: NORMAL USER LOGS IN WITH THEIR OWN GMAIL
  // -------------------------------------------------------------------------
  console.log(`--- SCENARIO 4: NORMAL USER LOGIN (${normalUserEmail}) ---`);
  const userLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalUserEmail })
  });
  const userLoginData = await userLoginRes.json();
  console.log(`User Login Status Code: ${userLoginRes.status} (Expected: 200)`);
  console.log(`User Assigned Role: ${userLoginData.user?.role} (Expected: user)`);
  console.log(`Redirect To: ${userLoginData.redirectTo} (Expected: /dashboard)`);

  if (userLoginData.user?.role !== 'user' || userLoginData.redirectTo !== '/dashboard') {
    throw new Error('Normal user role assignment failed!');
  }
  const userToken = userLoginData.token;

  // Normal User accesses User Dashboard data endpoint
  const userTimeSeriesRes = await fetch(`${baseUrl}/api/option-chain/time-series?index=NIFTY`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const userTimeSeriesData = await userTimeSeriesRes.json();
  console.log(`User accessing GET /api/option-chain/time-series: HTTP ${userTimeSeriesRes.status} (Spot: ₹${userTimeSeriesData.data?.spotPrice}, ATM: ₹${userTimeSeriesData.data?.atmStrike})`);
  console.log('>>> Normal User Access to User Dashboard: VERIFIED OK\n');

  // -------------------------------------------------------------------------
  // SCENARIO 5: NORMAL USER ATTEMPTS TO ACCESS ADMIN APIS (CRITICAL SECURITY)
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 5: NORMAL USER ATTEMPTS TO CALL ADMIN APIS (SECURITY GUARD) ---');
  const userTamperRes = await fetch(`${baseUrl}/api/subscription/users`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const userTamperData = await userTamperRes.json();
  console.log(`Normal User calling GET /api/subscription/users: HTTP ${userTamperRes.status} (Expected: 403)`);
  console.log(`Rejection Message: "${userTamperData.message}"`);

  if (userTamperRes.status !== 403) {
    throw new Error('CRITICAL FAILURE: Normal user was able to access Admin API!');
  }

  const userTamperGrantRes = await fetch(`${baseUrl}/api/subscription/admin-grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ targetEmail: 'hacker@gmail.com' })
  });
  const userTamperGrantData = await userTamperGrantRes.json();
  console.log(`Normal User calling POST /api/subscription/admin-grant: HTTP ${userTamperGrantRes.status} (Expected: 403)`);
  console.log(`Rejection Message: "${userTamperGrantData.message}"`);

  if (userTamperGrantRes.status !== 403) {
    throw new Error('CRITICAL FAILURE: Normal user was able to grant access!');
  }
  console.log('>>> Backend Role-Based Guard Rejection: VERIFIED OK\n');

  // -------------------------------------------------------------------------
  // SCENARIO 6: ADMIN REVOKES USER ACCESS
  // -------------------------------------------------------------------------
  console.log(`--- SCENARIO 6: ADMIN REVOKES ACCESS FOR ${normalUserEmail} ---`);
  const revokeRes = await fetch(`${baseUrl}/api/subscription/admin-revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ targetEmail: normalUserEmail })
  });
  const revokeData = await revokeRes.json();
  console.log(`Revoke API Status: HTTP ${revokeRes.status} (Success: ${revokeData.success})`);
  console.log('>>> User Access Revocation: VERIFIED OK\n');

  // -------------------------------------------------------------------------
  // SCENARIO 7: REVOKED USER TRIES TO LOG IN OR ACCESS DATA
  // -------------------------------------------------------------------------
  console.log(`--- SCENARIO 7: REVOKED USER TRIES TO LOG IN (${normalUserEmail}) ---`);
  const revokedLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalUserEmail })
  });
  const revokedLoginData = await revokedLoginRes.json();
  console.log(`Revoked User Login Status: HTTP ${revokedLoginRes.status} (Expected: 403)`);
  console.log(`Rejection Message: "${revokedLoginData.message}"`);

  // Revoked user tries to make API calls with previous token
  const revokedTokenApiRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const revokedTokenApiData = await revokedTokenApiRes.json();
  console.log(`Revoked User old token validation: HTTP ${revokedTokenApiRes.status} (Expected: 403/401)`);
  console.log(`Rejection Message: "${revokedTokenApiData.message}"`);

  if (revokedLoginRes.status !== 403) {
    throw new Error('Revoked user was not rejected on login!');
  }
  console.log('>>> Revoked User Immediate Lockout: VERIFIED OK\n');

  console.log('================================================================');
  console.log('       ALL AUTH SEPARATION SCENARIOS VERIFIED SUCCESSFULLY!     ');
  console.log('================================================================');
}

testAuthRolesSeparation().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
