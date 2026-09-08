import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { connectDatabase, disconnectDatabase } from '../config/database';

dotenv.config();

const BASE_URL = 'http://localhost:5000';

async function runAuthVerification() {
  console.log('================================================================');
  console.log('   FULL END-TO-END AUTH APPROVAL & RBAC SECURITY VERIFICATION   ');
  console.log('================================================================\n');

  await connectDatabase();

  const results: Record<string, { pass: boolean; details: string }> = {};

  const testEmail = `qa_test_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';

  try {
    // -------------------------------------------------------------
    // TEST 1: Register test user and confirm PENDING status in MongoDB
    // -------------------------------------------------------------
    console.log('[STEP 1] Registering test user via POST /api/auth/register...');
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'QA Test User', email: testEmail, password: testPassword })
    });
    const regJson = await regRes.json();
    
    const dbUserPending = await User.findOne({ email: testEmail }).lean();
    const isPendingInDb = dbUserPending && dbUserPending.status === 'pending' && dbUserPending.accessType === 'none';

    results['1. User Exists in MongoDB as PENDING'] = {
      pass: regRes.status === 201 && isPendingInDb === true,
      details: `Registered email: ${testEmail}, DB status: ${dbUserPending?.status}, accessType: ${dbUserPending?.accessType}`
    };
    console.log(` -> Result: ${results['1. User Exists in MongoDB as PENDING'].pass ? 'PASS' : 'FAIL'}`);

    // Verify unapproved user cannot log in to dashboard yet
    const unapprovedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const unapprovedLoginJson = await unapprovedLoginRes.json();
    console.log(` -> Unapproved Login check: status=${unapprovedLoginJson.status} (pending_approval: ${unapprovedLoginJson.status === 'pending_approval'})`);

    // -------------------------------------------------------------
    // TEST 2: Admin Login
    // -------------------------------------------------------------
    console.log('\n[STEP 2] Logging in as configured admin billionitwealth@gmail.com...');
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'billionitwealth@gmail.com', password: '' })
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.token;

    results['2. Admin Account Login'] = {
      pass: adminLoginRes.ok && adminLoginJson.user?.role === 'admin' && !!adminToken,
      details: `Admin role: ${adminLoginJson.user?.role}, token received: ${!!adminToken}`
    };
    console.log(` -> Result: ${results['2. Admin Account Login'].pass ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // TEST 3 & 4: Admin list users & verify pending test user appears
    // -------------------------------------------------------------
    console.log('\n[STEP 3 & 4] Checking Admin users list for pending test user...');
    const listRes = await fetch(`${BASE_URL}/api/subscription/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const listJson = await listRes.json();
    const foundPendingInList = listJson.data?.find((u: any) => u.email === testEmail);

    results['3 & 4. Pending User Appears in Admin Portal List'] = {
      pass: listRes.ok && !!foundPendingInList && foundPendingInList.status === 'pending',
      details: `Found in Admin user list: ${!!foundPendingInList}, status: ${foundPendingInList?.status}`
    };
    console.log(` -> Result: ${results['3 & 4. Pending User Appears in Admin Portal List'].pass ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // TEST 5 & 6: Approve user and confirm MongoDB status ACTIVE
    // -------------------------------------------------------------
    console.log('\n[STEP 5 & 6] Admin Approving user access...');
    const approveRes = await fetch(`${BASE_URL}/api/subscription/admin-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ email: testEmail })
    });
    const approveJson = await approveRes.json();

    const dbUserActive = await User.findOne({ email: testEmail }).lean();
    const dbSubActive = await Subscription.findOne({ userId: dbUserActive?._id }).lean();

    results['5 & 6. Admin Approval & MongoDB Status Change to ACTIVE'] = {
      pass: approveRes.ok && dbUserActive?.status === 'active' && dbUserActive?.accessType === 'admin_free',
      details: `DB Status: ${dbUserActive?.status}, AccessType: ${dbUserActive?.accessType}, Sub Type: ${dbSubActive?.type}`
    };
    console.log(` -> Result: ${results['5 & 6. Admin Approval & MongoDB Status Change to ACTIVE'].pass ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // TEST 7 & 8: Approved User Login & Dashboard Access
    // -------------------------------------------------------------
    console.log('\n[STEP 7 & 8] Approved user login & Dashboard data access...');
    const userLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const userLoginJson = await userLoginRes.json();
    const userToken = userLoginJson.token;

    const dashRes = await fetch(`${BASE_URL}/api/option-chain/time-series?index=NIFTY`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const dashJson = await dashRes.json();

    results['7 & 8. Approved User Login & Dashboard Access'] = {
      pass: userLoginRes.ok && !!userToken && dashRes.ok && dashJson.success === true,
      details: `User login ok: ${userLoginRes.ok}, Dashboard access ok: ${dashRes.ok}, Spot: ₹${dashJson.data?.spotPrice}`
    };
    console.log(` -> Result: ${results['7 & 8. Approved User Login & Dashboard Access'].pass ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // TEST 9 & 10 & 11: Normal User Role & Admin API Rejection
    // -------------------------------------------------------------
    console.log('\n[STEP 11] Normal user attempting to call Admin-Only endpoint (Bypassing frontend)...');
    const adminBypassRes = await fetch(`${BASE_URL}/api/subscription/users`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const adminBypassJson = await adminBypassRes.json();

    results['11. Admin Endpoints Reject Normal User (403 Forbidden)'] = {
      pass: adminBypassRes.status === 403,
      details: `HTTP Status: ${adminBypassRes.status}, Message: ${adminBypassJson.message}`
    };
    console.log(` -> Result: ${results['11. Admin Endpoints Reject Normal User (403 Forbidden)'].pass ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // TEST 12 & 13: Revoke user and verify access rejection
    // -------------------------------------------------------------
    console.log('\n[STEP 12 & 13] Admin Revoking User Access and testing rejection...');
    const revokeRes = await fetch(`${BASE_URL}/api/subscription/admin-revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ email: testEmail })
    });

    const dbUserRevoked = await User.findOne({ email: testEmail }).lean();

    const revokedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const revokedLoginJson = await revokedLoginRes.json();

    const revokedDashRes = await fetch(`${BASE_URL}/api/option-chain/time-series?index=NIFTY`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    results['12 & 13. Revoke User Access & Immediate API Rejection'] = {
      pass: revokeRes.ok && dbUserRevoked?.status === 'revoked' && revokedDashRes.status === 403,
      details: `Revoke ok: ${revokeRes.ok}, DB status: ${dbUserRevoked?.status}, Protected API with old token HTTP: ${revokedDashRes.status}`
    };
    console.log(` -> Result: ${results['12 & 13. Revoke User Access & Immediate API Rejection'].pass ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // TEST 14: Existing accounts integrity check
    // -------------------------------------------------------------
    console.log('\n[STEP 14] Verifying root admin and existing accounts integrity...');
    const adminDbUser = await User.findOne({ email: 'billionitwealth@gmail.com' }).lean();
    const totalUsersCount = await User.countDocuments();

    results['14. Existing Accounts Integrity & No Lockout'] = {
      pass: adminDbUser?.role === 'admin' && adminDbUser?.status === 'active',
      details: `Admin account active: ${adminDbUser?.status === 'active'}, Total registered users in DB: ${totalUsersCount}`
    };
    console.log(` -> Result: ${results['14. Existing Accounts Integrity & No Lockout'].pass ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // TEST 15: No Unintended 365-Day Expiration on Approved Access
    // -------------------------------------------------------------
    console.log('\n[STEP 15] Checking subscription record of approved user for expiryDate...');
    const approvedSubDoc = await Subscription.findOne({ userId: dbUserActive?._id, type: 'admin_free' }).lean();
    const hasNoArbitraryExpiry = approvedSubDoc ? approvedSubDoc.expiryDate == null : true;

    results['15. No Unintended 365-day Expiration Introduced'] = {
      pass: hasNoArbitraryExpiry === true,
      details: `Approved Sub ExpiryDate in MongoDB: ${approvedSubDoc?.expiryDate || 'NONE (Indefinite continuous access)'}`
    };
    console.log(` -> Result: ${results['15. No Unintended 365-day Expiration Introduced'].pass ? 'PASS' : 'FAIL'}`);

  } catch (err: any) {
    console.error('Test Execution Exception:', err);
  } finally {
    await disconnectDatabase();
  }

  console.log('\n================================================================');
  console.log('                     VERIFICATION SUMMARY                      ');
  console.log('================================================================');
  for (const [testName, result] of Object.entries(results)) {
    console.log(`[${result.pass ? 'PASS' : 'FAIL'}] ${testName}`);
    console.log(`       Details: ${result.details}`);
  }
  console.log('================================================================\n');
}

runAuthVerification().catch(console.error);
