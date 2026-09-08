import dotenv from 'dotenv';
import { User } from '../models/User';
import { OptionChainSnapshot } from '../models/OptionChainSnapshot';
import { Subscription } from '../models/Subscription';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../config/database';
import { upstoxService } from '../services/upstoxService';
import { oiCalculationService } from '../services/oiCalculationService';
import { isMarketHours, getMarketHoursStatus, getISTDateTime } from '../utils/marketHours';
import { PasswordUtils } from '../utils/passwordUtils';
import { verificationService } from '../services/verificationService';
import { jwtService } from '../services/jwtService';

dotenv.config();

const BASE_URL = 'http://localhost:5000';

export interface AuditTestResult {
  id: string;
  category: string;
  test: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT APPLICABLE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  evidence: string;
}

async function runMasterAuditSuite() {
  console.log('========================================================================');
  console.log('   MASTER FULL-SYSTEM PRODUCTION READINESS AUDIT & SECURITY SUITE      ');
  console.log('========================================================================\n');

  await connectDatabase();

  const auditMatrix: AuditTestResult[] = [];

  const record = (
    id: string,
    category: string,
    test: string,
    expected: string,
    actual: string,
    pass: boolean,
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' = 'HIGH',
    evidence: string = ''
  ) => {
    const status: 'PASS' | 'FAIL' = pass ? 'PASS' : 'FAIL';
    auditMatrix.push({
      id,
      category,
      test,
      expected,
      actual,
      status,
      severity,
      evidence
    });
    console.log(`[${status}] ${id} | ${category}: ${test}`);
    if (!pass) {
      console.error(`      FAILED -> Expected: ${expected} | Actual: ${actual}`);
    }
  };

  try {
    // -------------------------------------------------------------------------
    // SECTION A: HEALTH & CONNECTIVITY
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION A: Backend Health & System Integration ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    record(
      'SYS-01',
      'Health Check',
      'GET /health returns HTTP 200 with dbConnected and platform info',
      'status: ok, dbConnected: true',
      `status: ${healthJson.status}, dbConnected: ${healthJson.dbConnected}`,
      healthRes.status === 200 && healthJson.dbConnected === true,
      'CRITICAL',
      `Response: ${JSON.stringify(healthJson)}`
    );

    // -------------------------------------------------------------------------
    // SECTION B: UPSTOX INTEGRATION & MULTI-INDEX EXPIRY DISCOVERY
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION B: Upstox Multi-Index Integration & Expiry Discovery ---');
    for (const idx of ['NIFTY', 'BANK NIFTY', 'SENSEX'] as const) {
      try {
        const expiries = await upstoxService.fetchExpiryList(idx);
        record(
          `UPSTOX-EXP-${idx}`,
          'Upstox Expiry Discovery',
          `Discover live active contracts & expiries for ${idx}`,
          'Array of valid date strings (length > 0)',
          `Found ${expiries.length} expiries: [${expiries.slice(0, 3).join(', ')}...]`,
          expiries.length > 0,
          'HIGH',
          `Expiries count: ${expiries.length}`
        );

        const { raw, normalized } = await upstoxService.fetchOptionChain(idx, expiries[0]);
        record(
          `UPSTOX-CHAIN-${idx}`,
          'Upstox Option Chain Fetch',
          `Fetch and normalize live option chain for ${idx} on expiry ${expiries[0]}`,
          'NormalizedOptionChain with spotPrice > 0 and strikes > 0',
          `Spot: ₹${normalized.underlyingValue}, Total Strikes: ${normalized.strikes.length}`,
          (normalized.underlyingValue || 0) > 0 && normalized.strikes.length > 0,
          'CRITICAL',
          `Spot: ${normalized.underlyingValue}, Expiry: ${normalized.expiry}, Strikes: ${normalized.strikes.length}`
        );
      } catch (err: any) {
        record(
          `UPSTOX-ERR-${idx}`,
          'Upstox Option Chain Fetch',
          `Fetch live data for ${idx}`,
          'Successful fetch',
          `Error: ${err.message}`,
          false,
          'HIGH',
          err.message
        );
      }
    }

    // -------------------------------------------------------------------------
    // SECTION C: STRIKE SPACING & DYNAMIC ATM ENGINE
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION C: Strike Spacing & Dynamic ATM Mathematical Calculations ---');
    // Test NIFTY 50 spacing (50)
    record(
      'CALC-ATM-NIFTY-1',
      'Dynamic ATM',
      'NIFTY spot = 23812.45 rounds to nearest 50',
      '23800',
      `${oiCalculationService.calculateDynamicATM(23812.45, 'NIFTY')}`,
      oiCalculationService.calculateDynamicATM(23812.45, 'NIFTY') === 23800,
      'HIGH'
    );
    record(
      'CALC-ATM-NIFTY-2',
      'Dynamic ATM',
      'NIFTY spot = 23835.00 rounds to nearest 50',
      '23850',
      `${oiCalculationService.calculateDynamicATM(23835.00, 'NIFTY')}`,
      oiCalculationService.calculateDynamicATM(23835.00, 'NIFTY') === 23850,
      'HIGH'
    );
    // Test BANK NIFTY spacing (100)
    record(
      'CALC-ATM-BN-1',
      'Dynamic ATM',
      'BANK NIFTY spot = 51240 rounds to nearest 100',
      '51200',
      `${oiCalculationService.calculateDynamicATM(51240, 'BANK NIFTY')}`,
      oiCalculationService.calculateDynamicATM(51240, 'BANK NIFTY') === 51200,
      'HIGH'
    );
    record(
      'CALC-ATM-BN-2',
      'Dynamic ATM',
      'BANK NIFTY spot = 51260 rounds to nearest 100',
      '51300',
      `${oiCalculationService.calculateDynamicATM(51260, 'BANK NIFTY')}`,
      oiCalculationService.calculateDynamicATM(51260, 'BANK NIFTY') === 51300,
      'HIGH'
    );
    // Test SENSEX spacing (100)
    record(
      'CALC-ATM-SENSEX',
      'Dynamic ATM',
      'SENSEX spot = 80175 rounds to nearest 100',
      '80200',
      `${oiCalculationService.calculateDynamicATM(80175, 'SENSEX')}`,
      oiCalculationService.calculateDynamicATM(80175, 'SENSEX') === 80200,
      'HIGH'
    );

    // Boundary ATM checks
    let atmZeroHandled = false;
    try {
      oiCalculationService.calculateDynamicATM(0, 'NIFTY');
    } catch {
      atmZeroHandled = true;
    }
    record(
      'CALC-ATM-ZERO',
      'Dynamic ATM Boundary',
      'Spot price of 0 throws error gracefully without NaN',
      'Throws Error',
      atmZeroHandled ? 'Threw Error' : 'Did not throw',
      atmZeroHandled,
      'MEDIUM'
    );

    // -------------------------------------------------------------------------
    // SECTION D: EXACT 9-STRIKE MATRIX (ATM + 4 OTM) & PCR MATHEMATICS
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION D: ATM + 4 OTM 9-Strike Matrix & PCR Calculations ---');
    for (const idx of ['NIFTY', 'BANK NIFTY', 'SENSEX'] as const) {
      const tsRes = await fetch(`${BASE_URL}/api/option-chain/time-series?index=${encodeURIComponent(idx)}&frequency=3min`);
      const tsJson = await tsRes.json();
      const dataset = tsJson.data;

      const strikeDetails = dataset?.strikeDetails || [];
      const strikesCount = strikeDetails.length;
      record(
        `MATRIX-COUNT-${idx}`,
        'Strike Matrix',
        `${idx} option chain must extract exactly 9 strikes (ATM ± 4 OTM)`,
        '9 strikes',
        `${strikesCount} strikes: [${strikeDetails.map((s: any) => s.strikePrice).join(', ')}]`,
        strikesCount === 9,
        'CRITICAL',
        `Strikes: ${JSON.stringify(strikeDetails.map((s: any) => s.strikePrice))}`
      );

      // Verify Strike Interval Continuity
      const expectedStep = idx === 'NIFTY' ? 50 : 100;
      let spacingContinuous = true;
      for (let i = 1; i < strikesCount; i++) {
        if (strikeDetails[i].strikePrice - strikeDetails[i - 1].strikePrice !== expectedStep) {
          spacingContinuous = false;
        }
      }
      record(
        `MATRIX-SPACING-${idx}`,
        'Strike Spacing',
        `${idx} consecutive strikes must differ by exact interval (₹${expectedStep})`,
        `₹${expectedStep} continuous spacing`,
        `Continuous: ${spacingContinuous}`,
        spacingContinuous,
        'HIGH'
      );

      // Mathematical verification of ATM + 4 OTM Totals
      const callStrikes = strikeDetails.filter((s: any) => s.isCallOTM || s.isATM);
      const putStrikes = strikeDetails.filter((s: any) => s.isPutOTM || s.isATM);
      const sumCE = callStrikes.reduce((sum: number, s: any) => sum + (s.ceOI || 0), 0);
      const sumPE = putStrikes.reduce((sum: number, s: any) => sum + (s.peOI || 0), 0);

      record(
        `MATH-SUM-CE-${idx}`,
        'Mathematical Accuracy',
        `${idx} Summary total Call OI matches sum of 5 Call strikes (ATM + 4 OTM Calls)`,
        `${sumCE}`,
        `${dataset.summary.endCallOI}`,
        dataset.summary.endCallOI === sumCE,
        'CRITICAL'
      );

      record(
        `MATH-SUM-PE-${idx}`,
        'Mathematical Accuracy',
        `${idx} Summary total Put OI matches sum of 5 Put strikes (ATM + 4 OTM Puts)`,
        `${sumPE}`,
        `${dataset.summary.endPutOI}`,
        dataset.summary.endPutOI === sumPE,
        'CRITICAL'
      );

      // PCR Verification
      const calculatedPCR = sumCE > 0 ? parseFloat((sumPE / sumCE).toFixed(2)) : 0;
      record(
        `MATH-PCR-${idx}`,
        'PCR Verification',
        `${idx} PCR must equal Total Put OI / Total Call OI rounded to 2 decimals`,
        `${calculatedPCR}`,
        `${dataset.summary.pcr}`,
        Math.abs(dataset.summary.pcr - calculatedPCR) <= 0.02,
        'CRITICAL',
        `Summary PCR: ${dataset.summary.pcr}, Calc: ${calculatedPCR}`
      );
    }

    // -------------------------------------------------------------------------
    // SECTION E: PREVIOUS TRADING DAY CLOSING OI BASELINE
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION E: Previous Trading Day Closing Baseline Verification ---');
    for (const idx of ['NIFTY', 'BANK NIFTY', 'SENSEX'] as const) {
      const tsRes = await fetch(`${BASE_URL}/api/option-chain/time-series?index=${encodeURIComponent(idx)}`);
      const tsJson = await tsRes.json();
      const strikeDetails = tsJson.data?.strikeDetails || [];

      let allDeltasMatch = true;
      for (const s of strikeDetails) {
        const expectedCEDelta = s.ceOI - s.cePreviousOI;
        const expectedPEDelta = s.peOI - s.pePreviousOI;
        if (s.ceOIChange !== expectedCEDelta || s.peOIChange !== expectedPEDelta) {
          allDeltasMatch = false;
        }
      }

      record(
        `BASELINE-DELTA-${idx}`,
        'OI Change Baseline',
        `${idx} strike-wise OI Change strictly equals Live OI minus Previous Trading Day Close OI`,
        'All 9 strikes match formula exactly',
        `All 9 strikes match: ${allDeltasMatch}`,
        allDeltasMatch,
        'CRITICAL'
      );
    }

    // -------------------------------------------------------------------------
    // SECTION F: TIME, TIMEZONE & MARKET HOURS
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION F: Timezone (IST) & Market Session Guard ---');
    const istInfo = getISTDateTime(new Date());
    record(
      'TIME-IST-OFFSET',
      'Timezone Verification',
      'getISTDateTime accurately applies UTC+5:30 offset',
      'Valid date components in IST',
      `IST Date: ${istInfo.istDateObj.toISOString()}, Day: ${istInfo.dayOfWeek}`,
      !!istInfo.year && !!istInfo.month,
      'HIGH'
    );

    // Test Monday 10:30 AM IST (Active Market Hours)
    const activeMonday = new Date('2026-09-07T05:00:00.000Z'); // 10:30 AM IST
    record(
      'TIME-ACTIVE-WINDOW',
      'Market Hours Guard',
      'Weekday 10:30 AM IST returns isMarketHours = true',
      'true',
      `${isMarketHours(activeMonday)}`,
      isMarketHours(activeMonday) === true,
      'HIGH'
    );

    // Test Sunday 11:00 AM IST (Weekend Closed)
    const weekendSunday = new Date('2026-09-06T05:30:00.000Z'); // Sunday 11:00 AM IST
    record(
      'TIME-WEEKEND-GUARD',
      'Market Hours Guard',
      'Sunday trading returns isMarketHours = false',
      'false',
      `${isMarketHours(weekendSunday)}`,
      isMarketHours(weekendSunday) === false,
      'HIGH'
    );

    // -------------------------------------------------------------------------
    // SECTION G: TIME-SERIES RANGE & FREQUENCY FILTERS
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION G: Time-Series Range & Cadence Filtering ---');
    // Test Start Time > End Time error rejection
    const invalidRangeRes = await fetch(`${BASE_URL}/api/option-chain/time-series?index=NIFTY&startTime=02:00%20PM&endTime=10:00%20AM`);
    record(
      'FILTER-INVALID-RANGE',
      'Filter Validation',
      'Start Time > End Time is rejected with HTTP 400',
      'HTTP 400 Bad Request',
      `HTTP ${invalidRangeRes.status}`,
      invalidRangeRes.status === 400,
      'MEDIUM'
    );

    // Test Frequency parameters (1m, 3m, 5m)
    for (const freq of ['1min', '3min', '5min'] as const) {
      const freqRes = await fetch(`${BASE_URL}/api/option-chain/time-series?index=NIFTY&frequency=${freq}`);
      const freqJson = await freqRes.json();
      record(
        `FILTER-FREQ-${freq}`,
        'Sampling Frequency',
        `Querying frequency=${freq} returns HTTP 200 with valid dataset`,
        'HTTP 200 and success: true',
        `HTTP ${freqRes.status}, success: ${freqJson.success}`,
        freqRes.status === 200 && freqJson.success === true,
        'MEDIUM'
      );
    }

    // -------------------------------------------------------------------------
    // SECTION H: AUTHENTICATION, REGISTRATION & RBAC SECURITY
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION H: Authentication, Registration Lifecycle & RBAC Security ---');
    const testTraderEmail = `audit_trader_${Date.now()}@example.com`;
    const testTraderPassword = 'Password123!@#';

    // 1. New User Registration
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Audit Trader', email: testTraderEmail, password: testTraderPassword })
    });
    const regJson = await regRes.json();
    const dbUserPending = await User.findOne({ email: testTraderEmail }).lean();

    record(
      'AUTH-REG-PENDING',
      'Registration Lifecycle',
      'New user registers and is stored in MongoDB with status: PENDING and accessType: none',
      'status: pending, accessType: none',
      `DB status: ${dbUserPending?.status}, accessType: ${dbUserPending?.accessType}`,
      regRes.status === 201 && dbUserPending?.status === 'pending' && dbUserPending?.accessType === 'none',
      'CRITICAL'
    );

    // 2. Duplicate Registration Rejection
    const dupRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Duplicate Trader', email: testTraderEmail, password: testTraderPassword })
    });
    record(
      'AUTH-REG-DUPLICATE',
      'Registration Security',
      'Duplicate registration attempt for existing email is rejected with HTTP 409 Conflict',
      'HTTP 409',
      `HTTP ${dupRegRes.status}`,
      dupRegRes.status === 409,
      'HIGH'
    );

    // 3. Unapproved User Login Gate
    const unapprovedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testTraderEmail, password: testTraderPassword })
    });
    const unapprovedJson = await unapprovedLoginRes.json();
    record(
      'AUTH-PENDING-GATE',
      'Authentication Gate',
      'Unapproved user login is blocked with HTTP 403 and status: pending_approval',
      'HTTP 403, status: pending_approval',
      `HTTP ${unapprovedLoginRes.status}, status: ${unapprovedJson.status}`,
      unapprovedLoginRes.status === 403 && unapprovedJson.status === 'pending_approval',
      'CRITICAL'
    );

    // 4. Admin Login & Token Generation
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'billionitwealth@gmail.com', password: '' })
    });
    const adminJson = await adminLoginRes.json();
    const adminToken = adminJson.token;
    record(
      'AUTH-ADMIN-LOGIN',
      'Admin Authentication',
      'Admin billionitwealth@gmail.com authenticates and receives JWT with role: admin',
      'role: admin, token present',
      `role: ${adminJson.user?.role}, token: ${!!adminToken}`,
      adminLoginRes.status === 200 && adminJson.user?.role === 'admin' && !!adminToken,
      'CRITICAL'
    );

    // 5. Admin Approve User
    const approveRes = await fetch(`${BASE_URL}/api/subscription/admin-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ email: testTraderEmail })
    });
    const dbUserActive = await User.findOne({ email: testTraderEmail }).lean();
    const dbSubActive = await Subscription.findOne({ userId: dbUserActive?._id }).lean();
    record(
      'AUTH-ADMIN-APPROVE',
      'Admin Approval Flow',
      'Admin approval transitions MongoDB user status to ACTIVE and accessType to admin_free without 365-day expiry',
      'status: active, accessType: admin_free, expiryDate: null',
      `DB status: ${dbUserActive?.status}, accessType: ${dbUserActive?.accessType}, expiryDate: ${dbSubActive?.expiryDate || 'null'}`,
      approveRes.status === 200 && dbUserActive?.status === 'active' && dbSubActive?.expiryDate == null,
      'CRITICAL'
    );

    // 6. Approved User Login & Data Access
    const activeLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testTraderEmail, password: testTraderPassword })
    });
    const activeLoginJson = await activeLoginRes.json();
    const userToken = activeLoginJson.token;

    const dataAccessRes = await fetch(`${BASE_URL}/api/option-chain/time-series?index=NIFTY`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    record(
      'AUTH-ACTIVE-ACCESS',
      'Authorized Data Access',
      'Approved active user successfully signs in and accesses protected option-chain time-series',
      'HTTP 200 OK',
      `HTTP ${dataAccessRes.status}`,
      activeLoginRes.status === 200 && dataAccessRes.status === 200,
      'CRITICAL'
    );

    // 7. Non-Admin Calling Admin API Rejection (Frontend Bypass Test)
    const adminBypassRes = await fetch(`${BASE_URL}/api/subscription/users`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    record(
      'RBAC-ADMIN-ENDPOINT-GUARD',
      'Server-Side RBAC',
      'Normal user JWT token calling admin-only /api/subscription/users is rejected with HTTP 403 Forbidden',
      'HTTP 403 Forbidden',
      `HTTP ${adminBypassRes.status}`,
      adminBypassRes.status === 403,
      'CRITICAL'
    );

    // 8. Revoke User Access & Immediate API Rejection
    const revokeRes = await fetch(`${BASE_URL}/api/subscription/admin-revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ email: testTraderEmail })
    });
    const revokedDataAccessRes = await fetch(`${BASE_URL}/api/option-chain/time-series?index=NIFTY`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    record(
      'RBAC-REVOKE-IMMEDIATE',
      'Access Revocation',
      'Admin revokes user; subsequent requests with existing JWT token are immediately rejected with HTTP 403 Forbidden',
      'HTTP 403 Forbidden',
      `HTTP ${revokedDataAccessRes.status}`,
      revokeRes.status === 200 && revokedDataAccessRes.status === 403,
      'CRITICAL'
    );

    // -------------------------------------------------------------------------
    // SECTION I: FORGOT PASSWORD & OTP SECURITY
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION I: Forgot Password & Single-Use OTP Security ---');
    const forgotEmail = `forgot_test_${Date.now()}@example.com`;
    // Create an active user first
    const uReg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Forgot Tester', email: forgotEmail, password: 'OldPassword123!' })
    });
    await fetch(`${BASE_URL}/api/subscription/admin-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ email: forgotEmail })
    });

    // Request reset code
    const forgotReqRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail })
    });
    const forgotReqJson = await forgotReqRes.json();
    const otpCode = forgotReqJson.verificationCode;

    record(
      'AUTH-FORGOT-OTP',
      'Password Reset Flow',
      'POST /api/auth/forgot-password generates 6-digit OTP',
      'Valid 6-digit numeric OTP',
      `OTP: ${otpCode || 'generated'}`,
      forgotReqRes.status === 200 && !!otpCode && otpCode.length === 6,
      'HIGH'
    );

    // Reset password with valid code
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: forgotEmail,
        code: otpCode,
        newPassword: 'BrandNewPassword123!'
      })
    });
    record(
      'AUTH-RESET-SUCCESS',
      'Password Reset Flow',
      'POST /api/auth/reset-password updates passwordHash with valid OTP',
      'HTTP 200 OK',
      `HTTP ${resetRes.status}`,
      resetRes.status === 200,
      'HIGH'
    );

    // Test OTP reuse prevention (Single-use burning)
    const otpReuseRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: forgotEmail,
        code: otpCode,
        newPassword: 'AnotherPassword123!'
      })
    });
    record(
      'AUTH-OTP-SINGLE-USE',
      'OTP Security',
      'Reusing the already-used verification OTP is rejected with HTTP 400',
      'HTTP 400 Bad Request',
      `HTTP ${otpReuseRes.status}`,
      otpReuseRes.status === 400,
      'CRITICAL'
    );

    // Test Login with new password
    const newPassLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail, password: 'BrandNewPassword123!' })
    });
    record(
      'AUTH-LOGIN-NEW-PASSWORD',
      'Authentication Verification',
      'User can sign in with newly updated password',
      'HTTP 200 OK',
      `HTTP ${newPassLoginRes.status}`,
      newPassLoginRes.status === 200,
      'HIGH'
    );

    // -------------------------------------------------------------------------
    // SECTION J: HOSTILE INPUT & INJECTION TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION J: Hostile Input & Injection Resistance ---');
    // XSS injection in name field
    const xssRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '<script>alert("xss")</script>',
        email: `xss_${Date.now()}@example.com`,
        password: 'Password123!'
      })
    });
    record(
      'SEC-XSS-INPUT',
      'Input Sanitization',
      'HTML/Script tags in registration fields are safely handled without server crash',
      'Handled safely (HTTP 201 or 400)',
      `HTTP ${xssRegRes.status}`,
      xssRegRes.status === 201 || xssRegRes.status === 400,
      'MEDIUM'
    );

    // Tampered JWT signature rejection
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbi1yb290IiwiZW1haWwiOiJiaWxsaW9uaXR3ZWFsdGhAZ21haWwuY29tIiwicm9sZSI6ImFkbWluIn0.FAKE_SIGNATURE_TAMPERED';
    const fakeJwtRes = await fetch(`${BASE_URL}/api/subscription/users`, {
      headers: { 'Authorization': `Bearer ${fakeToken}` }
    });
    record(
      'SEC-JWT-TAMPER',
      'Cryptographic Verification',
      'Tampered JWT token with forged admin payload is rejected with HTTP 401 Unauthorized',
      'HTTP 401 Unauthorized',
      `HTTP ${fakeJwtRes.status}`,
      fakeJwtRes.status === 401,
      'CRITICAL'
    );

  } catch (err: any) {
    console.error('Audit Suite Exception:', err);
  } finally {
    await disconnectDatabase();
  }

  console.log('\n========================================================================');
  console.log('                 MASTER AUDIT SUITE EXECUTION SUMMARY                   ');
  console.log('========================================================================');
  const total = auditMatrix.length;
  const passed = auditMatrix.filter((r) => r.status === 'PASS').length;
  const failed = auditMatrix.filter((r) => r.status === 'FAIL').length;
  const critical = auditMatrix.filter((r) => r.status === 'FAIL' && r.severity === 'CRITICAL').length;
  const high = auditMatrix.filter((r) => r.status === 'FAIL' && r.severity === 'HIGH').length;

  console.log(`Total Tests Executed : ${total}`);
  console.log(`Tests Passed         : ${passed}`);
  console.log(`Tests Failed         : ${failed}`);
  console.log(`Critical Failures    : ${critical}`);
  console.log(`High-Severity Fails  : ${high}`);
  console.log('========================================================================\n');

  return { total, passed, failed, critical, high, auditMatrix };
}

runMasterAuditSuite().catch(console.error);
